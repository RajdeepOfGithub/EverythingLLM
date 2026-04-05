import { useRef, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Node {
  x: number
  y: number
  layer: number
  index: number
  phase: number       // random phase for idle breathing (0..2π)
  pulseTimer: number  // ms remaining in pulse animation (0 = idle)
}

interface Signal {
  path: number[][]   // [layerIndex, nodeIndex] for each hop
  hopIndex: number   // which hop we're currently on
  t: number          // 0..1 progress within current hop
  speed: number      // progress per ms (1 / travelMs)
}

// ── Constants ──────────────────────────────────────────────────────────────────

const LAYER_SIZES = [6, 8, 10, 10, 8, 4]
const BASE_RADIUS = 4
const JITTER_RANGE = 20
const BREATHE_PERIOD = 3000         // ms for idle breathe cycle
const BREATHE_MIN = 3
const BREATHE_MAX = 4.5
const SIGNAL_TRAVEL_MS = 400        // ms per hop
const SIGNAL_SPAWN_INTERVAL = 800   // ms between spawns
const MAX_SIGNALS = 6
const PULSE_DURATION = 300          // ms for node arrival pulse

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildNodes(width: number, height: number): Node[][] {
  const layers: Node[][] = []
  const numLayers = LAYER_SIZES.length

  // Horizontal spread: leave ~12% margin on each side
  const xMargin = width * 0.12
  const usableW = width - xMargin * 2

  for (let li = 0; li < numLayers; li++) {
    const count = LAYER_SIZES[li]
    const x = xMargin + (li / (numLayers - 1)) * usableW

    // Vertical spread: use 60% of canvas height, centered
    const totalH = height * 0.60
    const yStart = (height - totalH) / 2

    const nodes: Node[] = []
    for (let ni = 0; ni < count; ni++) {
      const baseY = count === 1
        ? height / 2
        : yStart + (ni / (count - 1)) * totalH

      // Stable jitter: seeded from layer + index
      const seed = (li * 31 + ni * 17) % 100
      const jitter = ((seed / 100) * 2 - 1) * JITTER_RANGE

      nodes.push({
        x,
        y: baseY + jitter,
        layer: li,
        index: ni,
        phase: (seed / 100) * Math.PI * 2,
        pulseTimer: 0,
      })
    }
    layers.push(nodes)
  }

  return layers
}

function spawnSignal(layers: Node[][]): Signal {
  const path: number[][] = []
  for (let li = 0; li < layers.length; li++) {
    const ni = Math.floor(Math.random() * layers[li].length)
    path.push([li, ni])
  }
  return {
    path,
    hopIndex: 0,
    t: 0,
    speed: 1 / SIGNAL_TRAVEL_MS,
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NeuralNetBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrameId = 0
    let layers: Node[][] = []
    let signals: Signal[] = []
    let lastTime = 0
    let sinceLastSpawn = 0

    // ── Canvas resize ──────────────────────────────────────────────────────────

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`
      ctx!.scale(dpr, dpr)
      layers = buildNodes(w, h)
    }

    // ── Static draw (reduced-motion mode) ─────────────────────────────────────

    function drawStatic() {
      const w = canvas!.width / (window.devicePixelRatio || 1)
      const h = canvas!.height / (window.devicePixelRatio || 1)
      ctx!.clearRect(0, 0, w, h)

      // Draw dim edges
      for (let li = 0; li < layers.length - 1; li++) {
        for (const a of layers[li]) {
          for (const b of layers[li + 1]) {
            ctx!.beginPath()
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.strokeStyle = 'rgba(255, 255, 255, 0.07)'
            ctx!.lineWidth = 0.5
            ctx!.stroke()
          }
        }
      }

      // Draw nodes
      for (const layer of layers) {
        for (const node of layer) {
          ctx!.beginPath()
          ctx!.arc(node.x, node.y, BASE_RADIUS, 0, Math.PI * 2)
          ctx!.fillStyle = 'rgba(0, 0, 0, 0.85)'
          ctx!.fill()
          ctx!.strokeStyle = 'rgba(255, 255, 255, 0.55)'
          ctx!.lineWidth = 1
          ctx!.stroke()
        }
      }
    }

    // ── Animated draw ──────────────────────────────────────────────────────────

    function draw(now: number) {
      if (lastTime === 0) lastTime = now
      const delta = Math.min(now - lastTime, 50) // cap at 50ms to avoid large jumps
      lastTime = now
      sinceLastSpawn += delta

      const w = canvas!.width / (window.devicePixelRatio || 1)
      const h = canvas!.height / (window.devicePixelRatio || 1)

      ctx!.clearRect(0, 0, w, h)

      // Spawn new signal?
      if (sinceLastSpawn >= SIGNAL_SPAWN_INTERVAL && signals.length < MAX_SIGNALS) {
        signals.push(spawnSignal(layers))
        sinceLastSpawn = 0
      }

      // Advance signals
      const activeEdges = new Set<string>()
      for (let si = signals.length - 1; si >= 0; si--) {
        const sig = signals[si]
        sig.t += sig.speed * delta

        if (sig.t >= 1) {
          // Arrived at destination node of this hop
          const destHop = sig.path[sig.hopIndex + 1]
          if (destHop) {
            const destNode = layers[destHop[0]][destHop[1]]
            destNode.pulseTimer = PULSE_DURATION
          }
          sig.hopIndex++
          sig.t = 0

          if (sig.hopIndex >= sig.path.length - 1) {
            // Signal completed all hops — remove
            signals.splice(si, 1)
            continue
          }
        }

        // Mark current hop's edge as active
        const fromHop = sig.path[sig.hopIndex]
        const toHop = sig.path[sig.hopIndex + 1]
        if (fromHop && toHop) {
          activeEdges.add(`${fromHop[0]}-${fromHop[1]}-${toHop[0]}-${toHop[1]}`)
        }
      }

      // Update node pulse timers
      for (const layer of layers) {
        for (const node of layer) {
          if (node.pulseTimer > 0) {
            node.pulseTimer = Math.max(0, node.pulseTimer - delta)
          }
        }
      }

      // ── Draw dim edges ───────────────────────────────────────────────────────
      ctx!.lineWidth = 0.5
      ctx!.strokeStyle = 'rgba(255, 255, 255, 0.07)'
      for (let li = 0; li < layers.length - 1; li++) {
        for (const a of layers[li]) {
          for (const b of layers[li + 1]) {
            const key = `${a.layer}-${a.index}-${b.layer}-${b.index}`
            if (!activeEdges.has(key)) {
              ctx!.beginPath()
              ctx!.moveTo(a.x, a.y)
              ctx!.lineTo(b.x, b.y)
              ctx!.stroke()
            }
          }
        }
      }

      // ── Draw active edges ────────────────────────────────────────────────────
      ctx!.lineWidth = 1
      ctx!.strokeStyle = 'rgba(255, 255, 255, 0.28)'
      for (const key of activeEdges) {
        const parts = key.split('-').map(Number)
        const [la, na, lb, nb] = parts
        const a = layers[la]?.[na]
        const b = layers[lb]?.[nb]
        if (a && b) {
          ctx!.beginPath()
          ctx!.moveTo(a.x, a.y)
          ctx!.lineTo(b.x, b.y)
          ctx!.stroke()
        }
      }

      // ── Draw signal pulses ───────────────────────────────────────────────────
      for (const sig of signals) {
        const fromHop = sig.path[sig.hopIndex]
        const toHop = sig.path[sig.hopIndex + 1]
        if (!fromHop || !toHop) continue

        const fromNode = layers[fromHop[0]]?.[fromHop[1]]
        const toNode = layers[toHop[0]]?.[toHop[1]]
        if (!fromNode || !toNode) continue

        const easedT = easeInOut(sig.t)
        const px = fromNode.x + (toNode.x - fromNode.x) * easedT
        const py = fromNode.y + (toNode.y - fromNode.y) * easedT

        ctx!.beginPath()
        ctx!.arc(px, py, 3, 0, Math.PI * 2)
        ctx!.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx!.fill()

        // Glow around pulse
        const grd = ctx!.createRadialGradient(px, py, 0, px, py, 8)
        grd.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
        grd.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx!.beginPath()
        ctx!.arc(px, py, 8, 0, Math.PI * 2)
        ctx!.fillStyle = grd
        ctx!.fill()
      }

      // ── Draw nodes ───────────────────────────────────────────────────────────
      const t = now / 1000
      for (const layer of layers) {
        for (const node of layer) {
          // Idle breathe
          const breathe = (Math.sin((t * (2 * Math.PI / (BREATHE_PERIOD / 1000))) + node.phase) + 1) / 2
          const idleR = BREATHE_MIN + breathe * (BREATHE_MAX - BREATHE_MIN)

          // Pulse on signal arrival
          let r = idleR
          let fillAlpha = 0.25
          let strokeAlpha = 0.5

          if (node.pulseTimer > 0) {
            const pf = node.pulseTimer / PULSE_DURATION        // 1 → 0
            const pulseScale = 1 + (1.4 - 1) * pf             // 1.4 → 1
            r = idleR * pulseScale
            fillAlpha = 0.25 + (0.8 - 0.25) * pf
            strokeAlpha = 0.5 + (1.0 - 0.5) * pf
          }

          ctx!.beginPath()
          ctx!.arc(node.x, node.y, r, 0, Math.PI * 2)
          ctx!.fillStyle = `rgba(0, 0, 0, ${(0.85 - (fillAlpha - 0.25) * 0.4).toFixed(3)})`
          ctx!.fill()
          ctx!.strokeStyle = `rgba(255, 255, 255, ${strokeAlpha.toFixed(3)})`
          ctx!.lineWidth = 1
          ctx!.stroke()

          // Extra glow ring on pulse
          if (node.pulseTimer > 0) {
            const pf = node.pulseTimer / PULSE_DURATION
            const glowR = r * 2.5
            const grd = ctx!.createRadialGradient(node.x, node.y, r, node.x, node.y, glowR)
            grd.addColorStop(0, `rgba(255, 255, 255, ${(0.18 * pf).toFixed(3)})`)
            grd.addColorStop(1, 'rgba(255, 255, 255, 0)')
            ctx!.beginPath()
            ctx!.arc(node.x, node.y, glowR, 0, Math.PI * 2)
            ctx!.fillStyle = grd
            ctx!.fill()
          }
        }
      }

      animFrameId = requestAnimationFrame(draw)
    }

    // ── ResizeObserver ─────────────────────────────────────────────────────────

    const ro = new ResizeObserver(() => {
      resize()
      if (prefersReduced) drawStatic()
    })
    ro.observe(document.documentElement)

    resize()

    if (prefersReduced) {
      drawStatic()
    } else {
      animFrameId = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(animFrameId)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="neural-net-bg" aria-hidden="true" />
}
