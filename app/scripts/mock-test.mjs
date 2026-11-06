import http from 'node:http'

const PORT = 8788

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

const mock = http.createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  const model = body.model || ''

  res.setHeader('Content-Type', 'application/json')

  if (model.includes('gemini')) {
    // Simulate a model that ignores the JSON instruction, to exercise the fallback path.
    res.end(JSON.stringify({ choices: [{ message: { content: 'Sorry, I cannot do that.' } }] }))
    return
  }

  res.end(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(banana) } }],
      usage: { prompt_tokens: 800, completion_tokens: 90 },
    }),
  )
})

await new Promise((resolve) => mock.listen(PORT, resolve))

process.env.OPENROUTER_API_KEY = 'test-key'
process.env.OPENROUTER_BASE_URL = `http://localhost:${PORT}/chat`

const { default: handler } = await import('../api/identify.js')

function call(image) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 0,
      setHeader() {},
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        resolve({ status: this.statusCode, payload })
      },
      end() {
        resolve({ status: this.statusCode, payload: null })
      },
    }
    handler({ method: 'POST', body: { image } }, res)
  })
}

const goodImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='

const passed = await call(goodImage)
console.log('fallback result:', JSON.stringify(passed))

if (passed.status !== 200 || passed.payload.fruit !== 'banana') {
  console.error('FAIL: expected a 200 banana response through the fallback model')
  process.exitCode = 1
} else {
  console.log('PASS: primary model failed, fallback model produced valid JSON')
}

mock.close()
