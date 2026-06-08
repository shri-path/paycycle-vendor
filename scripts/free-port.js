#!/usr/bin/env node
/**
 * free-port.js — release the Metro dev-server port before `expo start`.
 *
 * WHY THIS EXISTS:
 * If port 8081 is already held by a stale/foreign Metro instance, `expo start`
 * tries to fall back to 8082 — but when run non-interactively it cannot confirm
 * the prompt and silently SKIPS starting the dev server ("Skipping dev server").
 * Expo Go on the device then connects to whatever foreign bundler squats on 8081,
 * yielding "Unmatched Route" + "Unable to resolve module ./index" on launch.
 *
 * Wired in as `prestart` / `preandroid` / `preios` / `preweb` so it runs
 * automatically before every dev launch. Cross-platform (Windows / macOS / Linux).
 *
 * Override the port with EXPO_PORT, RCT_METRO_PORT, or `--port <n>` passed to npm.
 */
const { execSync } = require('node:child_process')

function resolvePort() {
  const argv = process.argv.slice(2)
  const flagIdx = argv.findIndex((a) => a === '--port' || a === '-p')
  if (flagIdx !== -1 && argv[flagIdx + 1]) return argv[flagIdx + 1]
  const inline = argv.find((a) => a.startsWith('--port='))
  if (inline) return inline.split('=')[1]
  return process.env.EXPO_PORT || process.env.RCT_METRO_PORT || '8081'
}

function pidsOnPort(port) {
  const pids = new Set()
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' })
      for (const line of out.split(/\r?\n/)) {
        // e.g.  TCP    0.0.0.0:8081    0.0.0.0:0    LISTENING    12345
        const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i)
        if (m && m[1] === String(port)) pids.add(m[2])
      }
    } else {
      const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' })
      out.split(/\s+/).filter(Boolean).forEach((p) => pids.add(p))
    }
  } catch {
    // netstat/lsof found nothing (or not installed) — treat as free.
  }
  return [...pids]
}

function kill(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' })
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
    }
    return true
  } catch {
    return false
  }
}

function main() {
  const port = resolvePort()
  const pids = pidsOnPort(port)
  if (pids.length === 0) {
    console.log(`[free-port] port ${port} is free.`)
    return
  }
  console.log(`[free-port] port ${port} held by PID(s) ${pids.join(', ')} — terminating...`)
  for (const pid of pids) {
    console.log(`[free-port] ${kill(pid) ? 'killed' : 'could not kill'} PID ${pid}`)
  }
}

main()
