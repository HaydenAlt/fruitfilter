import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const URL = 'http://localhost:4173/'
const IMAGE = process.argv[2]
const OUT = process.argv[3] ?? 'C:\\Users\\hayde\\AppData\\Local\\Temp\\kilo\\ff-result.png'

const proc = spawn(
  EDGE,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--remote-debugging-port=9223',
    '--user-data-dir=C:\\Users\\hayde\\AppData\\Local\\Temp\\kilo\\edge-ff-result',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getPage() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const targets = await (await fetch('http://localhost:9223/json/list')).json()
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

await send('Page.enable')
await send('DOM.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
})
await send('Page.navigate', { url: URL })
await sleep(2200)

await send('Runtime.evaluate', {
  expression: "localStorage.setItem('ff.profile.v1', JSON.stringify(['latex','peanut']))",
})
await send('Page.reload')
await sleep(1800)

const root = await send('DOM.getDocument', { depth: -1 })
const input = await send('DOM.querySelector', {
  nodeId: root.root.nodeId,
  selector: 'input[type="file"]',
})
console.log('file input node:', input.nodeId)

await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [IMAGE] })
await sleep(3500)

const state = await send('Runtime.evaluate', {
  expression:
    "JSON.stringify({innerWidth, scrollWidth: document.documentElement.scrollWidth, app: document.querySelector('.app')?.getBoundingClientRect().toJSON(), card: document.querySelector('.card')?.getBoundingClientRect().toJSON(), title: document.querySelector('#result-title')?.textContent})",
  returnByValue: true,
})
console.log(state.result.value)

const metrics = await send('Page.getLayoutMetrics')
const height = Math.ceil(metrics.cssContentSize.height)
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: 390, height, scale: 1 },
})
writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log('wrote', OUT, 'height', height)

socket.close()
proc.kill()
process.exit(0)
