const BASE = 'https://fruitfilter.vercel.app'

const search =
  'https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
  `&gsrsearch=${encodeURIComponent('banana fruit photograph')}` +
  '&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url|mime&iiurlwidth=700&format=json'

const listing = await (
  await fetch(search, { headers: { 'User-Agent': 'FruitFilterDemo/1.0 (educational)' } })
).json()
const page = Object.values(listing?.query?.pages ?? {})[0]
const info = page?.imageinfo?.[0]
if (!info) throw new Error('No image')

const binary = Buffer.from(await (await fetch(info.thumburl || info.url)).arrayBuffer())
const image = `data:${info.mime};base64,${binary.toString('base64')}`

const startedAt = Date.now()
const response = await fetch(`${BASE}/api/identify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image, lang: 'zh-HK', eatWhen: 'later' }),
})
const data = await response.json()

console.log(
  JSON.stringify(
    {
      source: page.title,
      ms: Date.now() - startedAt,
      status: response.status,
      fruit: data.fruit,
      display_name: data.display_name,
      ripeness: data.ripeness,
      evidence: data.ripeness_evidence,
      advice: data.advice,
      confidence: data.confidence,
    },
    null,
    2,
  ),
)
