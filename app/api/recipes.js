const ENDPOINT =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'deepseek/deepseek-v4.1-flash'
const FALLBACK_MODEL = 'google/gemini-3.5-flash-lite'
const TIMEOUT_MS = 22_000
const FALLBACK_TIMEOUT_MS = 16_000

const ALLERGEN_IDS = new Set([
  'milk',
  'egg',
  'fish',
  'shellfish',
  'tree-nuts',
  'peanut',
  'wheat',
  'soy',
  'sesame',
  'latex',
  'birch',
  'ragweed',
])

const LANG_NAME = {
  en: 'English',
  'zh-HK': 'Traditional Chinese (Hong Kong)',
}

const GOAL_TEXT = {
  any: 'balanced everyday snacks or desserts',
  'high-protein': 'high-protein snacks, at least 10 g of protein per serving',
  'low-sugar': 'low-sugar snacks, at most 8 g of sugar per serving',
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : ''
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function reasoningFor(model) {
  return model.startsWith('google/gemini') ? { effort: 'minimal' } : { enabled: false }
}

function systemPrompt({ fruit, ripeness, lang, goal, allergies }) {
  const language = LANG_NAME[lang] || LANG_NAME.en
  const allergenList = allergies.length > 0 ? allergies.join(', ') : 'none'
  return `You are a practical recipe assistant inside FruitFilter, a fruit-scanning app.

Create exactly 3 simple recipes (snacks or desserts) that use this fruit: ${fruit || 'fruit'} (estimated ripeness: ${ripeness || 'unknown'}).
Goal: ${GOAL_TEXT[goal] || GOAL_TEXT.any}.
The user's allergies: ${allergenList}. Do not include ingredients containing those allergens. If latex is selected, also avoid kiwi, avocado, chestnut, papaya, mango, and pineapple.

Rules:
- Use metric units and common ingredients.
- At most 8 ingredients, at most 6 short steps, at most 20 minutes.
- Estimate per serving: kcal, protein_g, sugar_g as plain numbers.
- For every ingredient, list allergens from this exact set: milk, egg, fish, shellfish, tree-nuts, peanut, wheat, soy, sesame, latex, birch, ragweed. Use [] when none.
- Do not claim medical, weight-loss, or disease benefits.
- Write all human-readable text in ${language}. Keep JSON keys in English.

Return ONLY this JSON shape:
{"recipes":[{"title":"","summary":"","minutes":0,"servings":0,"kcal":0,"protein_g":0,"sugar_g":0,"tags":[],"ingredients":[{"name":"","allergens":[]}],"steps":[]}]}`
}

function normalizeRecipe(raw) {
  const ingredients = Array.isArray(raw?.ingredients)
    ? raw.ingredients
        .map((item) => ({
          name: clean(item?.name, 80),
          allergens: Array.isArray(item?.allergens)
            ? item.allergens.filter((id) => typeof id === 'string' && ALLERGEN_IDS.has(id)).slice(0, 4)
            : [],
        }))
        .filter((item) => item.name.length > 0)
        .slice(0, 8)
    : []

  const steps = Array.isArray(raw?.steps)
    ? raw.steps.map((step) => clean(step, 220)).filter(Boolean).slice(0, 6)
    : []

  const title = clean(raw?.title, 80)
  if (!title) return null

  return {
    title,
    summary: clean(raw?.summary, 160),
    minutes: clampNumber(raw?.minutes, 1, 60, 10),
    servings: clampNumber(raw?.servings, 1, 6, 1),
    kcal: clampNumber(raw?.kcal, 0, 1200, 0),
    protein_g: clampNumber(raw?.protein_g, 0, 80, 0),
    sugar_g: clampNumber(raw?.sugar_g, 0, 80, 0),
    tags: Array.isArray(raw?.tags)
      ? raw.tags.filter((tag) => typeof tag === 'string').map((tag) => clean(tag, 24)).filter(Boolean).slice(0, 4)
      : [],
    ingredients,
    steps,
  }
}

function normalizeBundle(raw) {
  const recipes = Array.isArray(raw?.recipes)
    ? raw.recipes.map(normalizeRecipe).filter(Boolean).slice(0, 3)
    : []
  return { recipes }
}

function extractJson(content) {
  const trimmed = String(content).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object in model output')
  return JSON.parse(trimmed.slice(start, end + 1))
}

async function requestModel({ model, prompt, apiKey, timeoutMs }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fruitfilter.vercel.app',
        'X-Title': 'FruitFilter',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Generate the three recipes now.' },
        ],
        temperature: 0.5,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        reasoning: reasoningFor(model),
      }),
    })

    const text = await response.text()
    if (!response.ok) throw new Error(`Upstream ${response.status}: ${text.slice(0, 200)}`)

    const payload = JSON.parse(text)
    const choice = payload?.choices?.[0]
    const content = choice?.message?.content
    const joined = Array.isArray(content)
      ? content.map((part) => part?.text ?? '').join('')
      : String(content ?? '')

    if (choice?.finish_reason === 'length') throw new Error('Model hit the token limit')
    if (!joined.trim()) throw new Error('Empty model response')

    return { content: joined, model, latencyMs: Date.now() - startedAt }
  } finally {
    clearTimeout(timer)
  }
}

async function attempt(model, prompt, apiKey, timeoutMs) {
  const first = await requestModel({ model, prompt, apiKey, timeoutMs })
  try {
    return { bundle: normalizeBundle(extractJson(first.content)), meta: first }
  } catch (parseError) {
    const repairPrompt = `${prompt}

Your previous reply could not be parsed (${parseError.message}). Return ONLY the JSON object, matching the shape exactly.`
    const second = await requestModel({ model, prompt: repairPrompt, apiKey, timeoutMs })
    return { bundle: normalizeBundle(extractJson(second.content)), meta: second }
  }
}

function sendError(res, status, code, message, retryable) {
  res.status(status).json({ error: { code, message, retryable } })
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    sendError(res, 405, 'bad_request', 'Use POST', false)
    return
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    sendError(res, 500, 'config', 'Recipe service is not configured', false)
    return
  }

  const body = req.body ?? {}
  const fruit = clean(body.fruit, 48)
  if (!fruit) {
    sendError(res, 400, 'bad_request', 'A fruit is required', false)
    return
  }

  const ripeness = clean(body.ripeness, 20)
  const lang = body.lang === 'zh-HK' ? 'zh-HK' : 'en'
  const goal = ['any', 'high-protein', 'low-sugar'].includes(body.goal) ? body.goal : 'any'
  const allergies = Array.isArray(body.allergies)
    ? body.allergies.filter((item) => typeof item === 'string').slice(0, 12)
    : []

  const prompt = systemPrompt({ fruit, ripeness, lang, goal, allergies })
  let lastError = null

  for (const [model, timeoutMs] of [
    [MODEL, TIMEOUT_MS],
    [FALLBACK_MODEL, FALLBACK_TIMEOUT_MS],
  ]) {
    try {
      const { bundle, meta } = await attempt(model, prompt, apiKey, timeoutMs)
      if (bundle.recipes.length === 0) throw new Error('No usable recipes in the reply')

      console.log(
        JSON.stringify({
          event: 'recipes',
          model: meta.model,
          goal,
          lang,
          recipes: bundle.recipes.length,
          latencyMs: meta.latencyMs,
        }),
      )
      res.status(200).json({ recipes: bundle.recipes, model: meta.model })
      return
    } catch (error) {
      lastError = error
      console.error('[recipes] model failed', model, error?.message)
    }
  }

  const timedOut = lastError?.name === 'AbortError'
  sendError(
    res,
    timedOut ? 504 : 502,
    timedOut ? 'timeout' : 'upstream',
    'Recipes could not be generated. Try again.',
    true,
  )
}
