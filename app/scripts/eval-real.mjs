const API = 'https://fruitfilter.vercel.app/api/identify'

const cases = [
  { query: 'banana fruit photograph', expect: 'banana' },
  { query: 'apple fruit photograph', expect: 'apple' },
  { query: 'orange fruit photograph', expect: 'orange' },
  { query: 'strawberry fruit photograph', expect: 'strawberry' },
  { query: 'ballpoint pen photograph', expect: 'not fruit' },
]

async function commonsImage(query) {
  const endpoint =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
    `&gsrsearch=${encodeURIComponent(query)}` +
    '&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url|mime&iiurlwidth=700&format=json'
  const response = await fetch(endpoint, {
    headers: { 'User-Agent': 'FruitFilterDemo/1.0 (educational project)' },
  })
  const data = await response.json()
  const pages = Object.values(data?.query?.pages ?? {})
  const info = pages[0]?.imageinfo?.[0]
  if (!info || !String(info.mime).startsWith('image/')) return null
  return { title: pages[0].title, url: info.thumburl || info.url, mime: info.mime }
}

const rows = []

for (const testCase of cases) {
  try {
    const image = await commonsImage(testCase.query)
    if (!image) {
      rows.push({ ...testCase, error: 'no image found' })
      continue
    }

    const binary = Buffer.from(await (await fetch(image.url)).arrayBuffer())
    const dataUrl = `data:${image.mime};base64,${binary.toString('base64')}`

    const startedAt = Date.now()
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    })
    const result = await response.json()
    const latencyMs = Date.now() - startedAt

    rows.push({
      query: testCase.query,
      expect: testCase.expect,
      source: image.title,
      status: response.status,
      fruit: result.fruit,
      ripeness: result.ripeness,
      confidence: result.confidence,
      model: result.model,
      latencyMs,
      error: result.error?.code,
    })
  } catch (error) {
    rows.push({ ...testCase, error: error.message })
  }

  console.log(JSON.stringify(rows[rows.length - 1]))
}

const ok = rows.filter((row) => !row.error)
const correct = ok.filter((row) => {
  if (row.expect === 'not fruit') return row.fruit === ''
  return String(row.fruit ?? '').includes(row.expect)
})

const latencies = ok.map((row) => row.latencyMs).sort((a, b) => a - b)
const median = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0

console.log(
  JSON.stringify({
    total: rows.length,
    answered: ok.length,
    correct: correct.length,
    medianLatencyMs: median,
  }),
)
