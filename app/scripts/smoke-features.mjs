import { readFileSync } from 'node:fs'

const BASE = 'https://fruitfilter.vercel.app'

async function post(path, body) {
  const startedAt = Date.now()
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  return { status: response.status, data, ms: Date.now() - startedAt }
}

const recipes = await post('/api/recipes', {
  fruit: 'banana',
  ripeness: 'overripe',
  lang: 'en',
  goal: 'high-protein',
  allergies: ['milk'],
})
console.log('RECIPES', recipes.status, recipes.ms + 'ms', JSON.stringify({
  count: recipes.data.recipes?.length,
  titles: recipes.data.recipes?.map((recipe) => recipe.title),
  first: recipes.data.recipes?.[0] && {
    kcal: recipes.data.recipes[0].kcal,
    protein: recipes.data.recipes[0].protein_g,
    sugar: recipes.data.recipes[0].sugar_g,
    ingredients: recipes.data.recipes[0].ingredients?.map((item) => `${item.name} [${item.allergens.join(',')}]`),
  },
  model: recipes.data.model,
  error: recipes.data.error,
}))

const chat = await post('/api/chat', {
  fruit: 'banana',
  ripeness: 'overripe',
  advice: 'Best today. Peel and freeze what you will not eat.',
  lang: 'en',
  web: false,
  allergies: ['milk'],
  messages: [{ role: 'user', content: 'How should I store it for two more days?' }],
})
console.log('CHAT', chat.status, chat.ms + 'ms', JSON.stringify({
  reply: chat.data.reply?.slice(0, 220),
  sources: chat.data.sources?.length,
  model: chat.data.model,
  error: chat.data.error,
}))

const chatWeb = await post('/api/chat', {
  fruit: 'banana',
  ripeness: 'overripe',
  advice: 'Best today. Peel and freeze what you will not eat.',
  lang: 'en',
  web: true,
  allergies: ['milk'],
  messages: [{ role: 'user', content: 'What is the current advice on storing ripe bananas?' }],
})
console.log('CHAT-WEB', chatWeb.status, chatWeb.ms + 'ms', JSON.stringify({
  reply: chatWeb.data.reply?.slice(0, 260),
  sources: chatWeb.data.sources,
  model: chatWeb.data.model,
  error: chatWeb.data.error,
}))

const image = `data:image/jpeg;base64,${readFileSync(
  'C:\\Users\\hayde\\AppData\\Local\\Temp\\kilo\\test-banana.jpg',
).toString('base64')}`
const zh = await post('/api/identify', { image, lang: 'zh-HK', eatWhen: 'later' })
console.log('IDENTIFY-ZH', zh.status, zh.ms + 'ms', JSON.stringify({
  fruit: zh.data.fruit,
  display_name: zh.data.display_name,
  ripeness: zh.data.ripeness,
  advice: zh.data.advice,
  evidence: zh.data.ripeness_evidence,
  model: zh.data.model,
  error: zh.data.error,
}))
