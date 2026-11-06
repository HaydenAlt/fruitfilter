import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const URL = process.argv[2] ?? 'http://localhost:4173/'
const OUT = process.argv[3] ?? 'C:\\Users\\hayde\\AppData\\Local\\Temp\\kilo\\ff-shot.png'
const WIDTH = Number(process.argv[4] ?? 390)
const HEIGHT = Number(process.argv[5] ?? 844)

const proc = spawn(
  EDGE,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\hayde\\AppData\\Local\\Temp\\kilo\\edge-ff-profile',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getPage() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const targets = await (await fetch('http://localhost:9222/json/list')).json()
      const page = targets.find((target) => target.type === 'page')
      if (page) return page
    } catch {
      // Browser is still starting.
    }
    await sleep(250)
  }
  throw new Error('Could not reach the browser debugging endpoint')
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
await send('Emulation.setDeviceMetricsOverride', {
  width: WIDTH,
  height: HEIGHT,
  deviceScaleFactor: 1,
  mobile: true,
})
await send('Page.navigate', { url: URL })
await sleep(2500)

const metrics = await send('Runtime.evaluate', {
  expression:
    "JSON.stringify({innerWidth, dpr: devicePixelRatio, appWidth: document.querySelector('.app')?.getBoundingClientRect().width, scrollWidth: document.documentElement.scrollWidth})",
  returnByValue: true,
})
console.log(metrics.result.value)

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log('wrote', OUT)

socket.close()
proc.kill()
process.exit(0)
