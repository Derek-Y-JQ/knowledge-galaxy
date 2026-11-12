    // =====================================================================
    // 50-star — 星图: galaxy sidebar + single-galaxy Canvas 2D engine
    //
    // Lighting rule: only the galaxy core and the background star dust emit
    // light (additive blending). Planets and moons are opaque bodies: they are
    // drawn with normal blending, never with a glow, and get a lit side facing
    // the core plus a curved shadow (terminator) on the far side.
    // =====================================================================

    const STAR_TILT = 0.5
    const MAX_MOONS = 10
    const PLANET_STYLES = ['banded', 'rocky', 'ice', 'dune']
    const PLANET_PALETTES = {
      ringed: [['#d9b98a', '#a8845a', '#efe0c2'], ['#9fb7d9', '#6a86ad', '#d5e2f2'], ['#cfa9b8', '#9a7384', '#ecd3dc']],
      banded: [['#e3bd74', '#a9793d', '#f4e1b5'], ['#79bfd6', '#3b7896', '#bfe6f0'], ['#a497c2', '#665a88', '#d3cbe6']],
      rocky: [['#8f8c88', '#5c5956', '#b3b0ab'], ['#9a8474', '#63513f', '#bca893'], ['#7c8996', '#4d5763', '#a5b0bb']],
      ice: [['#1f4f90', '#123463', '#eaf6ff'], ['#1c6e8e', '#0f4660', '#e6fbff'], ['#2a4d80', '#182f55', '#dcebff']],
      dune: [['#c68b4c', '#8d582a', '#e2b683'], ['#c56a4b', '#86402c', '#e59c80'], ['#4e9c7b', '#2d6852', '#8fcdb0']],
    }

    function mulberry32(seed) {
      let a = seed >>> 0
      return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }

    /** Ringed for busy (>= 10 cards) or starred subcategories, else a hash of the id. */
    function planetStyleOf(subcategory, count) {
      if (subcategory.style && PLANET_PALETTES[subcategory.style]) return subcategory.style
      if (subcategory.starred || count >= 10) return 'ringed'
      return PLANET_STYLES[hashString(subcategory.id) % PLANET_STYLES.length]
    }

    /** Logarithmic steps: empty subcategories are asteroids, busy ones are giants. */
    function planetRadiusOf(count) {
      if (count <= 0) return 4.5
      if (count <= 2) return 8.5
      if (count <= 5) return 11.5
      if (count <= 9) return 14.5
      if (count <= 19) return 17.5
      return 20.5
    }

    /** Paint one planet's surface (unlit) into its own canvas; lighting is applied per frame. */
    function paintPlanetTexture(style, seed, radius) {
      const size = Math.max(16, Math.ceil(radius * 2))
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const g = canvas.getContext('2d')
      const R = size / 2
      const rand = mulberry32(seed)
      const palettes = PLANET_PALETTES[style] || PLANET_PALETTES.rocky
      const [base, dark, light] = palettes[seed % palettes.length]
      g.translate(R, R)
      g.beginPath()
      g.arc(0, 0, R, 0, Math.PI * 2)
      g.clip()
      g.fillStyle = base
      g.fillRect(-R, -R, size, size)
      if (style === 'banded') {
        const bands = 3 + Math.floor(rand() * 3)
        for (let i = 0; i < bands; i += 1) {
          const y0 = -R + ((i + 0.5) * 2 * R) / bands
          const thickness = ((2 * R) / bands) * (0.4 + rand() * 0.3)
          const freq = 1.5 + rand() * 2
          const phase = rand() * 6.28
          const amp = R * 0.07
          g.beginPath()
          for (let x = -R; x <= R; x += 2) g.lineTo(x, y0 + Math.sin((x / R) * Math.PI * freq + phase) * amp)
          for (let x = R; x >= -R; x -= 2) g.lineTo(x, y0 + thickness + Math.sin((x / R) * Math.PI * freq + phase + 0.6) * amp)
          g.closePath()
          g.fillStyle = i % 2 === 0 ? rgba(dark, 0.75) : rgba(light, 0.7)
          g.fill()
        }
      } else if (style === 'ringed') {
        for (let i = 0; i < 6; i += 1) {
          g.fillStyle = i % 2 === 0 ? rgba(dark, 0.32) : rgba(light, 0.3)
          const y = -R + (i * 2 * R) / 6 + rand() * R * 0.08
          g.fillRect(-R, y, size, (R / 6) * (0.8 + rand() * 0.8))
        }
      } else if (style === 'ice') {
        for (let i = 0; i < 4; i += 1) {
          g.save()
          g.translate((rand() - 0.5) * R * 1.1, (rand() - 0.5) * R * 0.8)
          g.rotate((rand() - 0.5) * 0.9)
          g.beginPath()
          g.ellipse(0, 0, R * (0.3 + rand() * 0.3), R * (0.08 + rand() * 0.1), 0, 0, Math.PI * 2)
          g.fillStyle = rgba(dark, 0.7)
          g.fill()
          g.restore()
        }
        g.fillStyle = rgba(light, 0.95)
        g.beginPath()
        g.ellipse(0, -R * 0.93, R * 0.62, R * 0.26, 0, 0, Math.PI * 2)
        g.fill()
        g.beginPath()
        g.ellipse(0, R * 0.95, R * 0.5, R * 0.2, 0, 0, Math.PI * 2)
        g.fill()
      } else if (style === 'dune') {
        for (let i = 0; i < 2; i += 1) {
          g.save()
          g.translate((rand() - 0.5) * R, (rand() - 0.5) * R)
          g.rotate(rand() * 3)
          g.fillStyle = rgba(light, 0.35)
          g.fillRect(-R * 0.35, -R * 0.22, R * (0.5 + rand() * 0.4), R * (0.3 + rand() * 0.3))
          g.restore()
        }
        g.save()
        g.rotate(-0.45 + (rand() - 0.5) * 0.3)
        g.strokeStyle = rgba(dark, 0.55)
        g.lineWidth = Math.max(1, R * 0.07)
        for (let y = -R * 1.2; y < R * 1.2; y += R * 0.26) {
          g.beginPath()
          g.moveTo(-R * 1.3, y)
          g.quadraticCurveTo(0, y + R * 0.16, R * 1.3, y)
          g.stroke()
        }
        g.restore()
      } else {
        // rocky: matte surface, speckles and sharp-edged craters
        for (let i = 0; i < 26; i += 1) {
          g.fillStyle = rgba(i % 2 ? dark : light, 0.18)
          g.fillRect((rand() - 0.5) * 2 * R, (rand() - 0.5) * 2 * R, R * 0.12, R * 0.12)
        }
        const craters = 2 + Math.floor(rand() * 3)
        for (let i = 0; i < craters; i += 1) {
          const angle = rand() * 6.28
          const distance = rand() * R * 0.6
          const cr = R * (0.14 + rand() * 0.14)
          const x = Math.cos(angle) * distance
          const y = Math.sin(angle) * distance
          g.beginPath()
          g.arc(x, y, cr, 0, Math.PI * 2)
          g.fillStyle = rgba(dark, 0.85)
          g.fill()
          g.lineWidth = Math.max(0.8, R * 0.05)
          g.beginPath()
          g.arc(x, y, cr, Math.PI * 0.9, Math.PI * 1.9)
          g.strokeStyle = 'rgba(8,10,16,0.6)'
          g.stroke()
          g.beginPath()
          g.arc(x, y, cr, Math.PI * 1.95, Math.PI * 2.85)
          g.strokeStyle = rgba(light, 0.75)
          g.stroke()
        }
      }
      return { canvas, ring: light, ringDark: dark }
    }

    /**
     * Single-galaxy renderer.
     * @param canvas - <canvas> element owned by GalaxyCanvas
     * @param handlers - { onHover(info|null), onOpenItem(id), onSelectPlanet(id), onJump(beacon) }
     */
    function createGalaxyEngine(canvas, handlers) {
      const ctx = canvas.getContext('2d')
      let width = 0
      let height = 0
      let dpr = 1
      let raf = 0
      let lastFrame = 0
      let clock = 0
      let scene = null
      let nextScene = null
      let phase = 'idle'
      let phaseT = 0
      let options = { showLinks: true, paused: false, status: 'all' }
      let camera = { zoom: 1, ox: 0, oy: 0 }
      let pointer = { x: -9999, y: -9999, down: false, moved: 0, lastX: 0, lastY: 0 }
      let hover = null
      let highlight = { id: '', until: 0 }
      let dust = []
      let arms = []
      let layoutInfo = { cx: 0, cy: 0, minR: 80, maxR: 300, scale: 1 }
      let fps = 60
      let destroyed = false

      function buildDust() {
        const rand = mulberry32(20261112)
        dust = []
        const total = Math.round(Math.min(420, (width * height) / 3600))
        for (let i = 0; i < total; i += 1) {
          const layer = i % 3
          dust.push({ x: rand() * width, y: rand() * height, size: 0.5 + rand() * (layer + 1) * 0.45, alpha: 0.25 + rand() * 0.55, layer, phase: rand() * 6.28, speed: 0.4 + rand() * 1.2 })
        }
      }

      function buildArms() {
        const rand = mulberry32(scene ? hashString(scene.id) : 7)
        arms = []
        const total = width * height > 900000 ? 1500 : 1100
        const armCount = 2 + (scene ? hashString(scene.id) % 2 : 0)
        for (let i = 0; i < total; i += 1) {
          const t = Math.pow(rand(), 0.75)
          const r = 14 + t * layoutInfo.maxR * 1.08
          const arm = i % armCount
          const scatter = (rand() + rand() + rand() - 1.5) * (0.34 + t * 0.5)
          arms.push({
            r,
            theta: (arm * Math.PI * 2) / armCount + t * 4.2 + scatter,
            size: 0.8 + rand() * 1.9 * (1.2 - t),
            alpha: (0.22 + rand() * 0.6) * (1.1 - t * 0.7),
            white: rand() < 0.3,
            phase: rand() * 6.28,
          })
        }
      }

      function layout() {
        const cx = width / 2
        const cy = height / 2 + 4
        const maxR = Math.max(120, Math.min(width * 0.45, (height * 0.44) / STAR_TILT))
        const minR = Math.max(64, maxR * 0.26)
        const count = scene ? scene.planets.length : 0
        const gap = count > 1 ? (maxR - minR) / (count - 1) : maxR
        const scale = Math.max(0.6, Math.min(1.7, gap / 46)) * Math.max(0.8, Math.min(1.15, maxR / 360))
        layoutInfo = { cx, cy, minR, maxR, scale }
        if (!scene) return
        scene.planets.forEach((planet, index) => {
          planet.orbit = count > 1 ? minR + gap * index : (minR + maxR) / 2
          planet.radius = planetRadiusOf(planet.count) * scale
          // Kepler's third law: angular speed falls off as r^-1.5, so inner planets visibly lap outer ones.
          planet.omega = 0.12 * Math.pow(minR / planet.orbit, 1.5)
          const texture = paintPlanetTexture(planet.count > 0 ? planet.style : 'rocky', planet.seed, planet.radius * Math.min(3, dpr * 1.6))
          planet.texture = texture.canvas
          planet.ringColor = texture.ring
          planet.ringDark = texture.ringDark
          planet.moons.forEach((moon, moonIndex) => {
            moon.orbit = planet.radius + (7 + (moonIndex % 2) * 5.5) * scale
            moon.radius = Math.max(2.1, 2.7 * scale)
            moon.omega = 0.42 / (1 + (moonIndex % 2) * 0.35)
          })
        })
        buildArms()
      }

      function resize() {
        const rect = canvas.getBoundingClientRect()
        const nextWidth = Math.max(1, Math.round(rect.width))
        const nextHeight = Math.max(1, Math.round(rect.height))
        const nextDpr = Math.min(2, window.devicePixelRatio || 1)
        if (nextWidth === width && nextHeight === height && nextDpr === dpr) return
        width = nextWidth
        height = nextHeight
        dpr = nextDpr
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
        buildDust()
        layout()
      }

      /** Keep orbital angles of bodies that survive a data refresh. */
      function adoptAngles(next, previous) {
        const planetsById = Object.create(null)
        if (previous) previous.planets.forEach((planet) => (planetsById[planet.id] = planet))
        next.planets.forEach((planet, index) => {
          const old = planetsById[planet.id]
          planet.angle = old ? old.angle : index * 2.399963 + (planet.seed % 628) / 100
          const moonsById = Object.create(null)
          if (old) old.moons.forEach((moon) => (moonsById[moon.id] = moon))
          planet.moons.forEach((moon, moonIndex) => {
            const oldMoon = moonsById[moon.id]
            moon.angle = oldMoon ? oldMoon.angle : (moonIndex / Math.max(1, planet.moons.length)) * Math.PI * 2 + (planet.seed % 97) / 15
          })
        })
      }

      function applyScene(next, previous) {
        adoptAngles(next, previous)
        scene = next
        if (next.highlightId && next.highlightNonce !== (previous && previous.highlightNonce)) {
          highlight = { id: next.highlightId, until: clock + 5 }
        }
        layout()
      }

      function setScene(next) {
        if (!next) {
          scene = null
          nextScene = null
          phase = 'idle'
          return
        }
        if (!scene) {
          applyScene(next, null)
          phase = 'expand'
          phaseT = 0
          return
        }
        if (scene.id === next.id && phase !== 'collapse') {
          applyScene(next, scene)
          return
        }
        // Jump to another galaxy: collapse the old one, then unfold the new one.
        nextScene = next
        if (phase !== 'collapse') {
          phase = 'collapse'
          phaseT = 0
        }
        hover = null
        handlers.onHover(null)
      }

      function bodyPosition(planet) {
        const x = layoutInfo.cx + Math.cos(planet.angle) * planet.orbit
        const y = layoutInfo.cy + Math.sin(planet.angle) * planet.orbit * STAR_TILT
        return { x, y }
      }

      function moonPosition(planet, position, moon) {
        return { x: position.x + Math.cos(moon.angle) * moon.orbit, y: position.y + Math.sin(moon.angle) * moon.orbit * 0.72 }
      }

      function toWorld(px, py) {
        return { x: (px - layoutInfo.cx - camera.ox) / camera.zoom + layoutInfo.cx, y: (py - layoutInfo.cy - camera.oy) / camera.zoom + layoutInfo.cy }
      }

      function toScreen(x, y) {
        return { x: (x - layoutInfo.cx) * camera.zoom + layoutInfo.cx + camera.ox, y: (y - layoutInfo.cy) * camera.zoom + layoutInfo.cy + camera.oy }
      }

      function beaconSlots(planet, position) {
        return planet.beacons.slice(0, 3).map((beacon, index) => ({
          beacon,
          x: position.x + planet.radius + 9 + index * 17,
          y: position.y - planet.radius - 9,
        }))
      }

      function hitTest() {
        if (!scene || phase === 'collapse' || pointer.x < 0) return null
        const world = toWorld(pointer.x, pointer.y)
        const slack = 5 / camera.zoom
        let best = null
        for (const planet of scene.planets) {
          const position = bodyPosition(planet)
          for (const slot of beaconSlots(planet, position)) {
            if (Math.hypot(world.x - slot.x, world.y - slot.y) <= 9) return { kind: 'beacon', planet, beacon: slot.beacon, x: slot.x, y: slot.y }
          }
          for (const moon of planet.moons) {
            const at = moonPosition(planet, position, moon)
            if (Math.hypot(world.x - at.x, world.y - at.y) <= moon.radius + slack) return { kind: 'moon', planet, moon, x: at.x, y: at.y }
          }
          if (Math.hypot(world.x - position.x, world.y - position.y) <= planet.radius + slack) best = { kind: 'planet', planet, x: position.x, y: position.y }
        }
        return best
      }

      function updateHover() {
        const hit = hitTest()
        const key = hit ? hit.kind + ':' + (hit.moon ? hit.moon.id : hit.beacon ? hit.planet.id + hit.beacon.categoryId : hit.planet.id) : ''
        const previousKey = hover ? hover.key : ''
        hover = hit ? Object.assign(hit, { key }) : null
        canvas.style.cursor = hit ? 'pointer' : pointer.down ? 'grabbing' : 'grab'
        if (hit) {
          const screen = toScreen(hit.x, hit.y)
          handlers.onHover({ kind: hit.kind, planetId: hit.planet.id, itemId: hit.moon ? hit.moon.id : '', beacon: hit.beacon || null, x: screen.x, y: screen.y, key })
        } else if (previousKey) {
          handlers.onHover(null)
        }
      }

      // ------------------------------------------------------------ drawing

      function drawBackground() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75)
        gradient.addColorStop(0, '#111735')
        gradient.addColorStop(0.55, '#090c1f')
        gradient.addColorStop(1, '#04050d')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
        ctx.globalCompositeOperation = 'lighter'
        for (const star of dust) {
          const drift = (star.layer + 1) * 0.012
          const x = (((star.x + camera.ox * drift * 4) % width) + width) % width
          const y = (((star.y + camera.oy * drift * 4) % height) + height) % height
          const twinkle = 0.65 + 0.35 * Math.sin(clock * star.speed + star.phase)
          ctx.fillStyle = 'rgba(214,226,255,' + (star.alpha * twinkle).toFixed(3) + ')'
          ctx.fillRect(x, y, star.size, star.size)
        }
        ctx.globalCompositeOperation = 'source-over'
      }

      function drawCore(spread) {
        const { cx, cy, minR, maxR } = layoutInfo
        const color = scene.color
        ctx.globalCompositeOperation = 'lighter'
        // far halo: light radiating across the whole system
        let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.05)
        gradient.addColorStop(0, rgba(color, 0.26))
        gradient.addColorStop(0.35, rgba(color, 0.08))
        gradient.addColorStop(1, rgba(color, 0))
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(1, STAR_TILT + 0.14)
        ctx.translate(-cx, -cy)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, maxR * 1.05, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        // spiral-arm star dust: pure light effect, so it stays put (only a faint twinkle)
        for (const particle of arms) {
          const angle = particle.theta
          const r = particle.r * spread
          const x = cx + Math.cos(angle) * r
          const y = cy + Math.sin(angle) * r * STAR_TILT
          const glow = (particle.alpha * (0.82 + 0.18 * Math.sin(clock * 0.9 + particle.phase))).toFixed(3)
          ctx.fillStyle = particle.white ? 'rgba(255,255,255,' + glow + ')' : rgba(color, glow)
          ctx.fillRect(x, y, particle.size, particle.size)
        }
        // the star itself — the only light source of the system
        const pulse = 1 + 0.04 * Math.sin(clock * 1.3)
        const coreR = minR * 0.62 * pulse
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR)
        gradient.addColorStop(0, 'rgba(255,255,255,0.98)')
        gradient.addColorStop(0.16, 'rgba(255,255,255,0.9)')
        gradient.addColorStop(0.36, rgba(color, 0.72))
        gradient.addColorStop(1, rgba(color, 0))
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = 'rgba(20,24,48,0.82)'
        ctx.font = '600 ' + Math.round(minR * 0.2) + 'px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(scene.glyph, cx, cy + 1)
      }

      /** Opaque body shading: lit towards the core, curved terminator on the far side. No glow. */
      function shade(x, y, radius, lightX, lightY) {
        const px = x + lightX * radius * 0.55
        const py = y + lightY * radius * 0.55
        const gradient = ctx.createRadialGradient(px, py, radius * 0.08, px, py, radius * 1.72)
        gradient.addColorStop(0, rgba(scene.color, 0.34))
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.08)')
        gradient.addColorStop(0.42, 'rgba(4,6,14,0.08)')
        gradient.addColorStop(0.6, 'rgba(4,6,14,0.62)')
        gradient.addColorStop(0.86, 'rgba(3,4,10,0.93)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, radius + 0.4, 0, Math.PI * 2)
        ctx.fill()
      }

      function drawRing(planet, position, front) {
        const rx = planet.radius * 2
        const ry = planet.radius * 0.6
        ctx.save()
        ctx.translate(position.x, position.y)
        ctx.rotate(-0.38)
        ctx.lineWidth = planet.radius * 0.3
        ctx.strokeStyle = rgba(planet.ringColor, front ? 0.78 : 0.42)
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2)
        ctx.stroke()
        ctx.lineWidth = Math.max(0.6, planet.radius * 0.06)
        ctx.strokeStyle = rgba(planet.ringDark, front ? 0.8 : 0.45)
        ctx.beginPath()
        ctx.ellipse(0, 0, rx * 0.86, ry * 0.86, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      function drawPlanet(planet, position) {
        const { cx, cy } = layoutInfo
        const dx = cx - position.x
        const dy = cy - position.y
        const distance = Math.hypot(dx, dy) || 1
        const lightX = dx / distance
        const lightY = dy / distance
        const ringed = planet.style === 'ringed' && planet.count > 0
        if (ringed) drawRing(planet, position, false)
        ctx.save()
        ctx.beginPath()
        ctx.arc(position.x, position.y, planet.radius, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(planet.texture, position.x - planet.radius, position.y - planet.radius, planet.radius * 2, planet.radius * 2)
        shade(position.x, position.y, planet.radius, lightX, lightY)
        ctx.restore()
        if (ringed) drawRing(planet, position, true)
        const hovered = hover && hover.planet === planet && hover.kind !== 'beacon'
        const flagged = highlight.id === planet.id && clock < highlight.until
        if (hovered || flagged) {
          ctx.lineWidth = 1.2
          ctx.strokeStyle = flagged ? 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(clock * 6)).toFixed(2) + ')' : 'rgba(255,255,255,0.7)'
          ctx.setLineDash(flagged ? [4, 4] : [])
          ctx.beginPath()
          ctx.arc(position.x, position.y, planet.radius + (flagged ? 7 : 3.5), 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
        }
        return { lightX, lightY }
      }

      function drawMoon(planet, moon, at, light) {
        const dim = options.status !== 'all' && moon.status !== options.status
        ctx.globalAlpha *= dim ? 0.22 : 1
        if (moon.paper) {
          ctx.lineWidth = 0.7
          ctx.strokeStyle = 'rgba(226,230,245,0.75)'
          ctx.beginPath()
          ctx.ellipse(at.x, at.y, moon.radius * 2, moon.radius * 0.75, -0.4, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = moon.paper ? '#ddd6c4' : '#b4bccb'
        ctx.beginPath()
        ctx.arc(at.x, at.y, moon.radius, 0, Math.PI * 2)
        ctx.fill()
        // far-side shadow: half disc turned away from the core
        const facing = Math.atan2(light.lightY, light.lightX)
        ctx.fillStyle = 'rgba(4,6,14,0.78)'
        ctx.beginPath()
        ctx.arc(at.x, at.y, moon.radius + 0.2, facing + Math.PI / 2, facing + Math.PI * 1.5)
        ctx.fill()
        if (hover && hover.moon === moon) {
          ctx.lineWidth = 1
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'
          ctx.beginPath()
          ctx.arc(at.x, at.y, moon.radius + 2.5, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.globalAlpha /= dim ? 0.22 : 1
      }

      function drawLinks(anchors) {
        if (!options.showLinks || !scene.links.length) return
        ctx.lineWidth = 1.1
        ctx.setLineDash([3, 6])
        ctx.lineDashOffset = -clock * 9
        for (const link of scene.links) {
          const a = anchors[link.a]
          const b = anchors[link.b]
          if (!a || !b) continue
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          // bend the trail away from the core, like a transfer orbit
          const ox = mx - layoutInfo.cx
          const oy = my - layoutInfo.cy
          const norm = Math.hypot(ox, oy) || 1
          const bend = Math.min(60, Math.hypot(a.x - b.x, a.y - b.y) * 0.28)
          ctx.strokeStyle = 'rgba(214,224,255,0.42)'
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.quadraticCurveTo(mx + (ox / norm) * bend, my + (oy / norm) * bend, b.x, b.y)
          ctx.stroke()
        }
        ctx.setLineDash([])
      }

      function drawScene(alpha, spread, spin) {
        const { cx, cy } = layoutInfo
        ctx.save()
        ctx.translate(cx + camera.ox, cy + camera.oy)
        ctx.scale(camera.zoom * spread, camera.zoom * spread)
        ctx.rotate(spin)
        ctx.translate(-cx, -cy)
        ctx.globalAlpha = alpha
        drawCore(1)
        // orbit guides
        ctx.lineWidth = 0.7 / camera.zoom
        for (const planet of scene.planets) {
          ctx.strokeStyle = 'rgba(170,186,230,0.11)'
          ctx.beginPath()
          ctx.ellipse(cx, cy, planet.orbit, planet.orbit * STAR_TILT, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
        const anchors = Object.create(null)
        const ordered = scene.planets
          .map((planet) => ({ planet, position: bodyPosition(planet) }))
          .sort((a, b) => a.position.y - b.position.y)
        for (const entry of ordered) {
          entry.moonsAt = entry.planet.moons.map((moon) => moonPosition(entry.planet, entry.position, moon))
          entry.planet.items.forEach((id) => (anchors[id] = entry.position))
          entry.planet.moons.forEach((moon, index) => (anchors[moon.id] = entry.moonsAt[index]))
        }
        drawLinks(anchors)
        for (const entry of ordered) {
          const { planet, position } = entry
          // moons behind the planet first, then the planet, then the ones in front
          const dx = cx - position.x
          const dy = cy - position.y
          const distance = Math.hypot(dx, dy) || 1
          const light = { lightX: dx / distance, lightY: dy / distance }
          planet.moons.forEach((moon, index) => {
            if (Math.sin(moon.angle) < 0) drawMoon(planet, moon, entry.moonsAt[index], light)
          })
          drawPlanet(planet, position)
          planet.moons.forEach((moon, index) => {
            if (Math.sin(moon.angle) >= 0) drawMoon(planet, moon, entry.moonsAt[index], light)
          })
          // label
          const hovered = hover && hover.planet === planet
          ctx.font = (hovered ? '600 ' : '') + Math.max(10, 11 / Math.sqrt(camera.zoom)) + 'px system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          const labelY = position.y + planet.radius + (planet.moons.length ? 14 * layoutInfo.scale : 5) + 2
          const text = planet.name + (planet.count ? ' · ' + planet.count : '')
          ctx.fillStyle = 'rgba(4,6,14,0.55)'
          ctx.fillText(text, position.x + 0.6, labelY + 0.8)
          ctx.fillStyle = planet.count ? (hovered ? '#ffffff' : 'rgba(226,232,255,0.88)') : 'rgba(170,180,210,0.6)'
          ctx.fillText(text, position.x, labelY)
          if (planet.hiddenMoons > 0) {
            ctx.fillStyle = 'rgba(190,200,230,0.7)'
            ctx.fillText('+' + planet.hiddenMoons + ' 颗卫星', position.x, labelY + 13)
          }
          // 跃迁信标 for links leaving this galaxy
          for (const slot of beaconSlots(planet, position)) {
            const active = hover && hover.kind === 'beacon' && hover.beacon === slot.beacon
            ctx.fillStyle = 'rgba(14,18,40,0.92)'
            ctx.beginPath()
            ctx.arc(slot.x, slot.y, 8, 0, Math.PI * 2)
            ctx.fill()
            ctx.lineWidth = active ? 1.8 : 1.1
            ctx.strokeStyle = slot.beacon.color
            ctx.stroke()
            ctx.save()
            ctx.translate(slot.x, slot.y)
            ctx.rotate(clock * 0.8)
            ctx.font = '10px system-ui, sans-serif'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#ffffff'
            ctx.fillText('🌀', 0, 0.5)
            ctx.restore()
          }
        }
        ctx.restore()
      }

      function frame(now) {
        if (destroyed) return
        raf = window.requestAnimationFrame(frame)
        if (document.hidden) {
          lastFrame = now
          return
        }
        const dt = Math.min(0.05, lastFrame ? (now - lastFrame) / 1000 : 0.016)
        lastFrame = now
        fps = fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05
        clock += dt
        resize()
        const still = options.paused || (hover && hover.kind !== 'planet')
        if (scene && !still) {
          for (const planet of scene.planets) {
            planet.angle += planet.omega * dt
            for (const moon of planet.moons) moon.angle += moon.omega * dt
          }
        } else if (scene && options.paused === false) {
          // hovering a moon freezes orbits so it can be clicked
        }
        let alpha = 1
        let spread = 1
        let spin = 0
        if (phase === 'collapse') {
          phaseT += dt / 0.42
          const e = Math.min(1, phaseT)
          alpha = 1 - e
          spread = 1 - 0.8 * e * e
          spin = e * e * 1.4
          if (e >= 1) {
            const previous = scene
            if (nextScene) applyScene(nextScene, previous && previous.id === nextScene.id ? previous : null)
            nextScene = null
            camera = { zoom: 1, ox: 0, oy: 0 }
            phase = 'expand'
            phaseT = 0
            alpha = 0
          }
        } else if (phase === 'expand') {
          phaseT += dt / 0.7
          const e = Math.min(1, phaseT)
          const ease = 1 - Math.pow(1 - e, 3)
          alpha = ease
          spread = 1.7 - 0.7 * ease
          spin = -(1 - ease) * 0.9
          if (e >= 1) phase = 'idle'
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawBackground()
        if (scene) drawScene(alpha, spread, spin)
        if (phase === 'idle' && !pointer.down) updateHover()
        window.__KG_STAR_DEBUG__ = {
          galaxy: scene ? scene.id : null,
          phase,
          fps: Math.round(fps),
          planets: scene ? scene.planets.length : 0,
          zoom: camera.zoom,
          hover: hover ? hover.key : '',
          positions: scene
            ? scene.planets.map((planet) => {
                const screen = toScreen(bodyPosition(planet).x, bodyPosition(planet).y)
                return { id: planet.id, x: screen.x, y: screen.y, r: planet.radius, moons: planet.moons.map((moon) => { const at = moonPosition(planet, bodyPosition(planet), moon); const s = toScreen(at.x, at.y); return { id: moon.id, x: s.x, y: s.y } }) }
              })
            : [],
        }
      }

      // ------------------------------------------------------------ input

      function local(event) {
        const rect = canvas.getBoundingClientRect()
        return { x: event.clientX - rect.left, y: event.clientY - rect.top }
      }

      function onMove(event) {
        const at = local(event)
        if (pointer.down) {
          const dx = at.x - pointer.lastX
          const dy = at.y - pointer.lastY
          pointer.moved += Math.abs(dx) + Math.abs(dy)
          if (pointer.moved > 4) {
            camera.ox += dx
            camera.oy += dy
            hover = null
            handlers.onHover(null)
          }
        }
        pointer.x = at.x
        pointer.y = at.y
        pointer.lastX = at.x
        pointer.lastY = at.y
      }

      function onDown(event) {
        const at = local(event)
        pointer = { x: at.x, y: at.y, down: true, moved: 0, lastX: at.x, lastY: at.y }
      }

      function onUp() {
        if (!pointer.down) return
        pointer.down = false
        if (pointer.moved > 4) return
        const hit = hitTest()
        if (!hit) {
          handlers.onSelectPlanet('')
          return
        }
        if (hit.kind === 'moon') handlers.onOpenItem(hit.moon.id)
        else if (hit.kind === 'beacon') handlers.onJump(hit.beacon)
        else handlers.onSelectPlanet(hit.planet.id)
      }

      function onLeave() {
        pointer.x = -9999
        pointer.y = -9999
        pointer.down = false
        if (hover) {
          hover = null
          handlers.onHover(null)
        }
      }

      function onWheel(event) {
        event.preventDefault()
        const at = local(event)
        const before = toWorld(at.x, at.y)
        camera.zoom = Math.max(0.6, Math.min(3, camera.zoom * Math.exp(-event.deltaY * 0.0015)))
        const after = toScreen(before.x, before.y)
        camera.ox += at.x - after.x
        camera.oy += at.y - after.y
      }

      function resetView() {
        camera = { zoom: 1, ox: 0, oy: 0 }
      }

      canvas.addEventListener('mousemove', onMove)
      canvas.addEventListener('mousedown', onDown)
      window.addEventListener('mouseup', onUp)
      canvas.addEventListener('mouseleave', onLeave)
      canvas.addEventListener('wheel', onWheel, { passive: false })
      canvas.addEventListener('dblclick', resetView)
      resize()
      raf = window.requestAnimationFrame(frame)

      return {
        setScene,
        setOptions(next) {
          options = Object.assign({}, options, next)
        },
        resetView,
        destroy() {
          destroyed = true
          window.cancelAnimationFrame(raf)
          canvas.removeEventListener('mousemove', onMove)
          canvas.removeEventListener('mousedown', onDown)
          window.removeEventListener('mouseup', onUp)
          canvas.removeEventListener('mouseleave', onLeave)
          canvas.removeEventListener('wheel', onWheel)
          canvas.removeEventListener('dblclick', resetView)
        },
      }
    }

    /** Plain-data description of one galaxy (= one category) for the engine. */
    function buildGalaxyScene(model, category, highlight) {
      const itemsBySub = Object.create(null)
      model.items.forEach((item) => {
        if (item.categoryId === category.id) (itemsBySub[item.subcategoryId] = itemsBySub[item.subcategoryId] || []).push(item)
      })
      const links = []
      const planets = displaySubs(model, category).map((subcategory) => {
        const items = itemsBySub[subcategory.id] || []
        const beacons = []
        items.forEach((item) => {
          ;(model.linksByItem[item.id] || []).forEach((link) => {
            link.itemIds.forEach((otherId) => {
              const other = model.itemsById[otherId]
              if (!other || other.categoryId === category.id) return
              let beacon = beacons.find((entry) => entry.categoryId === other.categoryId)
              if (!beacon) {
                const target = model.catById[other.categoryId]
                beacon = { categoryId: other.categoryId, subcategoryId: other.subcategoryId, mode: other.mode, name: target ? target.name : '', color: target ? target.color : UNKNOWN_COLOR, count: 0, fromPlanet: subcategory.id }
                beacons.push(beacon)
              }
              beacon.count += 1
            })
          })
        })
        return {
          id: subcategory.id,
          name: subcategory.name,
          count: items.length,
          style: planetStyleOf(subcategory, items.length),
          seed: hashString(subcategory.id),
          items: items.map((item) => item.id),
          moons: items.slice(0, MAX_MOONS).map((item) => ({ id: item.id, paper: item.kind === 'paper', status: item.status || 'todo' })),
          hiddenMoons: Math.max(0, items.length - MAX_MOONS),
          beacons,
        }
      })
      const seen = Object.create(null)
      model.links.forEach((link) => {
        const inside = link.itemIds.filter((id) => model.itemsById[id].categoryId === category.id)
        for (let i = 1; i < inside.length; i += 1) {
          const key = inside[i - 1] + '>' + inside[i]
          if (!seen[key]) {
            seen[key] = true
            links.push({ a: inside[i - 1], b: inside[i], label: link.label })
          }
        }
      })
      return {
        id: category.id,
        name: category.name,
        color: category.color || UNKNOWN_COLOR,
        glyph: category.glyph || '✦',
        planets,
        links,
        highlightId: highlight && highlight.categoryId === category.id ? highlight.subcategoryId : '',
        highlightNonce: highlight ? highlight.nonce : 0,
      }
    }

    function GalaxyCanvas(props) {
      const { scene, options, handlers } = props
      const canvasRef = useRef(null)
      const engineRef = useRef(null)
      const handlersRef = useRef(handlers)
      handlersRef.current = handlers
      useEffect(() => {
        const engine = createGalaxyEngine(canvasRef.current, {
          onHover: (info) => handlersRef.current.onHover(info),
          onOpenItem: (id) => handlersRef.current.onOpenItem(id),
          onSelectPlanet: (id) => handlersRef.current.onSelectPlanet(id),
          onJump: (beacon) => handlersRef.current.onJump(beacon),
        })
        engineRef.current = engine
        window.__KG_STAR_API__ = engine
        return () => {
          engine.destroy()
          engineRef.current = null
        }
      }, [])
      useEffect(() => {
        if (engineRef.current) engineRef.current.setScene(scene)
      }, [scene])
      useEffect(() => {
        if (engineRef.current) engineRef.current.setOptions(options)
      }, [options.showLinks, options.paused, options.status])
      return h('canvas', { ref: canvasRef, className: 'kg-star-canvas', role: 'img', 'aria-label': scene ? '星系「' + scene.name + '」星图' : '星图' })
    }

    /**
     * 星图 view: galaxy sidebar on the left, one focused galaxy on the canvas.
     * props: { model, mode, onModeChange, onOpenItem, onManage }
     */
    function StarView(props) {
      const { model, mode, onOpenItem } = props
      const [collapsed, setCollapsed] = usePref('starSidebar', 'open', ['open', 'closed'])
      const [galaxyId, setGalaxyId] = useState(() => lsGet('galaxy:' + mode, ''))
      const [showLinks, setShowLinks] = useState(true)
      const [paused, setPaused] = useState(false)
      const [status, setStatus] = useState('all')
      const [hover, setHover] = useState(null)
      const [planetId, setPlanetId] = useState('')
      const [highlight, setHighlight] = useState(null)
      const galaxies = displayCategories(model, mode)
      const current = galaxies.find((category) => category.id === galaxyId) || galaxies[0] || null
      useEffect(() => {
        const stored = lsGet('galaxy:' + mode, '')
        if (!galaxies.some((category) => category.id === galaxyId) && stored && stored !== galaxyId) setGalaxyId(stored)
      }, [mode])
      const scene = useMemo(() => (current ? buildGalaxyScene(model, current, highlight) : null), [model, current && current.id, highlight])
      const choose = (id) => {
        setGalaxyId(id)
        lsSet('galaxy:' + mode, id)
        setPlanetId('')
        setHover(null)
      }
      const jump = (beacon) => {
        if (mode !== 'all' && beacon.mode !== mode) props.onModeChange(beacon.mode)
        setHighlight({ categoryId: beacon.categoryId, subcategoryId: beacon.subcategoryId, nonce: Date.now() })
        setGalaxyId(beacon.categoryId)
        lsSet('galaxy:' + beacon.mode, beacon.categoryId)
        setPlanetId('')
        setHover(null)
        showToast('🌀 已跃迁至「' + beacon.name + '」星系')
      }
      const handlers = { onHover: setHover, onOpenItem, onSelectPlanet: setPlanetId, onJump: jump }
      const options = { showLinks, paused, status }

      if (!current) {
        return h(EmptyState, {
          icon: '🪐',
          title: (mode === 'all' ? '' : '「' + MODE_META[mode].label + '」模式') + '还没有星系',
          hint: '每个大类是一个星系，子类是行星，卡片是卫星。先新增一个大类，或导入预设包。',
          action: h('button', { type: 'button', className: 'kg-btn kg-btn-primary', onClick: props.onManage }, '🗂 管理类目'),
        })
      }

      const groups = mode === 'all' ? model.enabled.map((entry) => ({ mode: entry, list: galaxies.filter((category) => category.mode === entry) })).filter((group) => group.list.length) : [{ mode, list: galaxies }]
      const planetItems = planetId ? model.items.filter((item) => item.subcategoryId === planetId) : []
      const hoverItem = hover && hover.kind === 'moon' ? model.itemsById[hover.itemId] : null
      const hoverPlanet = hover && hover.kind === 'planet' && scene ? scene.planets.find((planet) => planet.id === hover.planetId) : null
      const galaxyItems = model.items.filter((item) => item.categoryId === current.id)
      const statusNames = STATUS_LABELS[current.mode]
      const narrow = collapsed === 'closed'

      return h(
        'div',
        { className: 'kg-star' },
        h(
          'aside',
          { className: cx('kg-star-side', narrow && 'is-narrow'), 'aria-label': '星系导航' },
          h(
            'div',
            { className: 'kg-star-side-head' },
            narrow ? null : h('span', null, '星系'),
            h('button', { type: 'button', className: 'kg-star-iconbtn', title: narrow ? '展开星系导航' : '折叠为图标栏', 'aria-label': narrow ? '展开星系导航' : '折叠星系导航', onClick: () => setCollapsed(narrow ? 'open' : 'closed') }, narrow ? '»' : '«'),
          ),
          h(
            'div',
            { className: 'kg-star-side-list' },
            groups.map((group) =>
              h(
                'div',
                { key: group.mode },
                mode === 'all' ? h('div', { className: 'kg-star-group', style: { color: MODE_META[group.mode].color } }, narrow ? MODE_META[group.mode].label.slice(0, 1) : MODE_META[group.mode].icon + ' ' + MODE_META[group.mode].label) : null,
                group.list.map((category) =>
                  h(
                    'button',
                    {
                      type: 'button',
                      key: category.id,
                      className: cx('kg-galaxy', current.id === category.id && 'is-active'),
                      style: { '--kg-accent': category.color },
                      title: category.name + ' · ' + displaySubs(model, category).length + ' 颗行星 · ' + (model.countByCat[category.id] || 0) + ' 张卡片',
                      onClick: () => choose(category.id),
                    },
                    h('span', { className: 'kg-galaxy-glyph' }, category.glyph),
                    narrow
                      ? null
                      : h(
                          'span',
                          { className: 'kg-galaxy-text' },
                          h('span', { className: 'kg-galaxy-name' }, h('i', { className: 'kg-galaxy-dot' }), category.name),
                          h('span', { className: 'kg-galaxy-meta' }, displaySubs(model, category).length + ' 行星 · ' + (model.countByCat[category.id] || 0) + ' 卡片'),
                        ),
                  ),
                ),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'kg-star-stage' },
          h(GalaxyCanvas, { scene, options, handlers }),
          h(
            'div',
            { className: 'kg-hud' },
            h('div', { className: 'kg-hud-title' }, h('span', { className: 'kg-hud-glyph', style: { color: current.color } }, current.glyph), current.name, h(ModeBadge, { mode: current.mode })),
            h(
              'div',
              { className: 'kg-hud-stats' },
              h('span', null, h('b', null, scene.planets.length), ' 行星'),
              h('span', null, h('b', null, galaxyItems.length), ' 卡片'),
              h('span', null, h('b', null, scene.links.length), ' 条星系内联系'),
            ),
            h(
              'div',
              { className: 'kg-hud-status' },
              STATUSES.map((value) => h('span', { key: value }, statusNames[value] + ' ' + galaxyItems.filter((item) => (item.status || 'todo') === value).length)),
            ),
            h('label', { className: 'kg-hud-row' }, h('span', null, '显示联系'), h(Toggle, { checked: showLinks, onChange: setShowLinks, label: '显示联系' })),
            h('label', { className: 'kg-hud-row' }, h('span', null, '暂停公转'), h(Toggle, { checked: paused, onChange: setPaused, label: '暂停公转' })),
            h(
              'label',
              { className: 'kg-hud-row' },
              h('span', null, '高亮状态'),
              h(Select, { bare: true, value: status, onChange: setStatus, options: [{ value: 'all', label: '全部' }].concat(STATUSES.map((value) => ({ value, label: statusNames[value] }))) }),
            ),
            h('div', { className: 'kg-hud-tip' }, '滚轮缩放 · 拖拽平移 · 双击复位 · 点卫星看卡片'),
          ),
          planetId && model.subById[planetId]
            ? h(
                'div',
                { className: 'kg-planet-panel' },
                h(
                  'div',
                  { className: 'kg-planet-head' },
                  h('span', null, '🪐 ' + model.subById[planetId].name),
                  h('span', { className: 'kg-planet-count' }, planetItems.length + ' 张卡片'),
                  h('button', { type: 'button', className: 'kg-star-iconbtn', 'aria-label': '关闭', onClick: () => setPlanetId('') }, '✕'),
                ),
                planetItems.length
                  ? h(
                      'div',
                      { className: 'kg-planet-list' },
                      planetItems.map((item) =>
                        h('button', { type: 'button', key: item.id, className: 'kg-planet-item', onClick: () => onOpenItem(item.id) }, h('span', null, (item.kind === 'paper' ? '📄 ' : '') + item.title), h('em', null, statusLabel(item))),
                      ),
                    )
                  : h('div', { className: 'kg-planet-empty' }, '这还是一颗小行星 —— 收录第一张卡片后它会长大'),
              )
            : null,
          hoverItem
            ? h(
                'div',
                { className: 'kg-star-tip', style: { left: Math.round(hover.x) + 'px', top: Math.round(hover.y) + 'px' } },
                h('div', { className: 'kg-star-tip-title' }, (hoverItem.kind === 'paper' ? '📄 ' : '') + hoverItem.title),
                h('div', { className: 'kg-star-tip-meta' }, subName(model, hoverItem.subcategoryId) + ' · ' + statusLabel(hoverItem) + (linkCount(model, hoverItem.id) ? ' · 🔗 ' + linkCount(model, hoverItem.id) : '')),
                hoverItem.summary || hoverItem.content ? h('div', { className: 'kg-star-tip-body' }, plainTextPreview(hoverItem.summary || hoverItem.content, 110)) : null,
                h('div', { className: 'kg-star-tip-foot' }, '点击打开卡片详情'),
              )
            : hoverPlanet
              ? h(
                  'div',
                  { className: 'kg-star-tip', style: { left: Math.round(hover.x) + 'px', top: Math.round(hover.y) + 'px' } },
                  h('div', { className: 'kg-star-tip-title' }, '🪐 ' + hoverPlanet.name),
                  h('div', { className: 'kg-star-tip-meta' }, (hoverPlanet.count ? hoverPlanet.count + ' 张卡片 · ' + PLANET_STYLE_LABELS[hoverPlanet.style] : '空子类 · 小行星')),
                )
              : hover && hover.kind === 'beacon'
                ? h(
                    'div',
                    { className: 'kg-star-tip', style: { left: Math.round(hover.x) + 'px', top: Math.round(hover.y) + 'px' } },
                    h('div', { className: 'kg-star-tip-title' }, '🌀 跃迁信标'),
                    h('div', { className: 'kg-star-tip-meta' }, '有 ' + hover.beacon.count + ' 条联系通往「' + MODE_META[hover.beacon.mode].label + ' · ' + hover.beacon.name + '」，点击跃迁'),
                  )
                : null,
        ),
      )
    }
