import http from 'node:http'

const PORT = Number(process.env.MOCK_PORT || 8788)

const banana = {
  fruit: 'banana',
  display_name: 'Banana',
  confidence: 0.93,
  ripeness: 'overripe',
  ripeness_evidence: ['deep yellow with brown spots', 'slightly wrinkled skin'],
  advice: 'Best today. Peel and freeze what you will not eat.',
  alternatives: ['plantain'],
  is_food: true,
  multiple: false,
}

const notFruit = {
  fruit: '',
  display_name: '',
  confidence: 0.05,
  ripeness: 'unknown',
  ripeness_evidence: [],
  advice: '',
  alternatives: [],
  is_food: false,
  multiple: false,
}

const recipes = {
  recipes: [
    {
      title: 'Banana oat yoghurt bowl',
      summary: 'A five-minute breakfast with slow carbs and protein.',
      minutes: 6,
      servings: 2,
      kcal: 240,
      protein_g: 14,
      sugar_g: 9,
      tags: ['high-protein', 'breakfast'],
      ingredients: [
        { name: 'Greek yoghurt', allergens: ['milk'] },
        { name: 'Rolled oats', allergens: ['wheat'] },
        { name: 'Banana', allergens: [] },
        { name: 'Honey', allergens: [] },
      ],
      steps: [
        'Slice the banana.',
        'Spoon the yoghurt into two bowls.',
        'Add oats and banana, then drizzle with honey.',
      ],
    },
    {
      title: 'Peanut butter banana toast',
      summary: 'Crunchy, filling, and ready before the kettle boils.',
      minutes: 4,
      servings: 1,
      kcal: 310,
      protein_g: 12,
      sugar_g: 8,
      tags: ['high-protein'],
      ingredients: [
        { name: 'Wholegrain bread', allergens: ['wheat'] },
        { name: 'Peanut butter', allergens: ['peanut'] },
        { name: 'Banana', allergens: [] },
      ],
      steps: ['Toast the bread.', 'Spread peanut butter.', 'Top with sliced banana.'],
    },
    {
      title: 'Banana chia pudding',
      summary: 'Make it tonight, eat it tomorrow.',
      minutes: 5,
      servings: 2,
      kcal: 190,
      protein_g: 8,
      sugar_g: 7,
      tags: ['low-sugar', 'make-ahead'],
      ingredients: [
        { name: 'Chia seeds', allergens: [] },
        { name: 'Milk', allergens: ['milk'] },
        { name: 'Banana', allergens: [] },
      ],
      steps: ['Mix chia seeds with milk.', 'Chill for at least 4 hours.', 'Top with banana.'],
    },
  ],
}

const chatReply = {
  reply:
    'Keep it at room temperature until it is as ripe as you like, then move it to the fridge to slow it down. Peel and freeze slices if you will not finish it in two days. [example.com](https://example.com/banana-storage)',
  annotations: [
    {
      type: 'url_citation',
      url_citation: {
        url: 'https://example.com/banana-storage',
        title: 'Example: storing bananas',
      },
    },
  ],
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    return {}
  }
}

const mock = http.createServer(async (req, res) => {
  const body = await readJson(req)
  const system = body.messages?.[0]?.content ?? ''
  let choice = { message: { content: JSON.stringify(banana) } }

  if (typeof system === 'string' && system.includes('practical recipe assistant')) {
    choice = { message: { content: JSON.stringify(recipes) } }
  } else if (typeof system === 'string' && system.includes("fruit-scanning app")) {
    choice = {
      message: {
        content: chatReply.reply,
        annotations: chatReply.annotations,
      },
    }
  } else if (process.env.MOCK_NOT_FRUIT === '1') {
    choice = { message: { content: JSON.stringify(notFruit) } }
  }

  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      choices: [choice],
      usage: { prompt_tokens: 800, completion_tokens: 120 },
    }),
  )
})

mock.listen(PORT, () => {
  console.log(`[mock-openrouter] listening on http://localhost:${PORT}`)
})
