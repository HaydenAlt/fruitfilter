import http from 'node:http'
import identify from './api/identify.js'
import health from './api/health.js'
import chat from './api/chat.js'
import recipes from './api/recipes.js'

const routes = {
  '/api/identify': identify,
  '/api/health': health,
  '/api/chat': chat,
  '/api/recipes': recipes,
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const handler = routes[url.pathname]

  if (!handler) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: { code: 'not_found', message: 'Not found', retryable: false } }))
    return
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  try {
    req.body = raw ? JSON.parse(raw) : {}
  } catch {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: { code: 'bad_request', message: 'Body must be JSON', retryable: false } }))
    return
  }

  const shim = {
    status(code) {
      res.statusCode = code
      return shim
    },
    json(payload) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(payload))
      return shim
    },
    setHeader(key, value) {
      res.setHeader(key, value)
    },
    end(payload) {
      res.end(payload)
    },
  }

  try {
    await handler(req, shim)
  } catch (error) {
    console.error('[local-api]', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: { code: 'internal', message: 'Unexpected server error', retryable: true } }))
  }
})

server.listen(8787, () => {
  console.log('[local-api] listening on http://localhost:8787')
})
