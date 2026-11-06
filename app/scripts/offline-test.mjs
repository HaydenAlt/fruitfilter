import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const URL = 'http://localhost:4173/'
const IMAGE = process.argv[2]
const OUT = process.argv[3] ?? 'C:\\Users\\hayde\\AppData\\Local\\Temp\\kilo\\ff-offline.png'

const proc = spawn(
  EDGE,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--remote-debugging-port=9224',
    '--user-data-dir=C:\\Users\\hayde\\AppData\\Local\\Temp\\kilo\\edge-ff-offline',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getPage() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const targets = await (await fetch('http://localhost:9224/json/list')).json()
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
  send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then(
    (result) => result.result.value,
  )

await send('Page.enable')
await send('DOM.enable')
await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
})
await send('Page.navigate', { url: URL })
await sleep(2500)

const sw = await evaluate(
  "navigator.serviceWorker.ready.then(async (reg) => ({scope: reg.scope, active: Boolean(reg.active), caches: await caches.keys()}))",
)
console.log('service worker:', JSON.stringify(sw))

const root = await send('DOM.getDocument', { depth: -1 })
const input = await send('DOM.querySelector', {
  nodeId: root.root.nodeId,
  selector: 'input[type="file"]',
})
await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [IMAGE] })
await sleep(3000)

console.log('online result:', await evaluate("document.querySelector('#result-title')?.textContent"))

await send('Network.emulateNetworkConditions', {
  offline: true,
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
})
await send('Page.reload')
await sleep(2500)

const offlineState = await evaluate(
  "JSON.stringify({banner: document.body.innerText.includes('Offline'), title: document.querySelector('#result-title')?.textContent, hasResult: Boolean(document.querySelector('.result')), hasScan: Boolean(document.querySelector('.scan'))})",
)
console.log('offline state:', offlineState)

const shot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log('wrote', OUT)

socket.close()
proc.kill()
process.exit(0)
