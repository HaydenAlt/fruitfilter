import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const URL = 'http://localhost:4173/'
const IMAGE = process.argv[2]
const OUT_DIR = 'C:\\Users\\hayde\\AppData\\Local\\Temp\\kilo'
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const PORT = 9226

const proc = spawn(
  EDGE,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=C:\\Users\\hayde\\AppData\\Local\\Temp\\kilo\\edge-ff-scenes',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getPage() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const targets = await (await fetch(`http://localhost:${PORT}/json/list`)).json()
      const page = targets.find((target) => target.type === 'page')
      if (page) return page
    } catch {
      // still starting
    }
    await sleep(250)
  }
  throw new Error('No debugging target')
}

const page = await getPage()
const socket = new WebSocket(page.webSocketDebuggerUrl)
let nextId = 1
const pending = new Map()

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  }
})

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve)
  socket.addEventListener('error', reject)
})

function send(method, params = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

const evaluate = (expression) =>
  send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }).then(
    (result) => result.result.value,
  )

async function waitFor(expression, timeout = 12000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(expression)) return true
    await sleep(300)
  }
  return false
}

async function upload(imagePath) {
  const root = await send('DOM.getDocument', { depth: -1 })
  const input = await send('DOM.querySelector', {
    nodeId: root.root.nodeId,
    selector: 'input[type="file"]',
  })
  if (!input.nodeId) throw new Error('File input not found')
  await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [imagePath] })
}

async function shot(name, fullPage = false) {
  console.log(
    'metrics',
    name,
    await evaluate(
      `JSON.stringify({ w: innerWidth, sw: document.documentElement.scrollWidth, app: document.querySelector('.app')?.getBoundingClientRect().width })`,
    ),
  )

  if (fullPage) {
    const metrics = await send('Page.getLayoutMetrics')
    const height = Math.ceil(metrics.cssContentSize.height)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await sleep(300)
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    writeFileSync(`${OUT_DIR}\\${name}.png`, Buffer.from(image.data, 'base64'))
  } else {
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await sleep(300)
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    writeFileSync(`${OUT_DIR}\\${name}.png`, Buffer.from(image.data, 'base64'))
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await sleep(200)
  console.log('shot', name)
}

async function audit(name) {
  await evaluate(AXE)
  const value = await evaluate(`axe
    .run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
    .then((result) => JSON.stringify(result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }))))`)
  console.log('AXE', name, value)
}

await send('Page.enable')
await send('DOM.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
})

await send('Page.navigate', { url: URL })
await sleep(1800)

await evaluate(`localStorage.setItem('ff.profile.v1', JSON.stringify(['latex', 'milk']));
  localStorage.setItem('ff.lang.v1', JSON.stringify('en'));
  localStorage.setItem('ff.theme.v1', JSON.stringify('light'));`)
await send('Page.reload')
await sleep(1500)

await audit('home-en-light')
await shot('scene-home-en-light')

await upload(IMAGE)
await waitFor("Boolean(document.querySelector('#result-title'))")
await sleep(600)
await audit('result-en-light')
await shot('scene-result-en-light', true)

await evaluate("document.querySelector('[data-testid=\"result-recipes\"]')?.click()")
await waitFor("Boolean(document.querySelector('.card.recipe h2'))", 15000)
await sleep(500)
await audit('recipes-en-light')
await shot('scene-recipes-en-light', true)

await evaluate("document.querySelector('[data-testid=\"back\"]')?.click()")
await sleep(600)

await evaluate("document.querySelector('[data-testid=\"result-chat\"]')?.click()")
await sleep(600)
await evaluate("document.querySelector('.quick-row .chip')?.click()")
await waitFor("document.querySelectorAll('.bubble-assistant').length > 0", 15000)
await sleep(400)
await audit('chat-en-light')
await shot('scene-chat-en-light', true)

await evaluate(`localStorage.setItem('ff.lang.v1', JSON.stringify('zh-HK'));
  localStorage.setItem('ff.theme.v1', JSON.stringify('dark'));`)
await send('Page.reload')
await sleep(1500)

await audit('home-zh-dark')
await shot('scene-home-zh-dark')

await upload(IMAGE)
await waitFor("Boolean(document.querySelector('#result-title'))")
await sleep(800)
await audit('result-zh-dark')
await shot('scene-result-zh-dark', true)

socket.close()
proc.kill()
process.exit(0)
