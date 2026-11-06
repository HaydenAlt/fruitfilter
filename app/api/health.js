export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Use GET' })
    return
  }
  res.status(200).json({
    ok: true,
    service: 'fruitfilter-identify',
    hasKey: Boolean(process.env.OPENROUTER_API_KEY),
    model: 'google/gemini-3.8-flash',
    fallback: 'anthropic/claude-haiku-5.5',
  })
}
