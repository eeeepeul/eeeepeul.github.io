/* A thin-line grid for the scanned houses, in the look of a technical drawing: a ground grid under
   them, and the three axes x, y and z crossing in the middle of the houses, with ticks and numbers.
   The houses are left as they are. It is drawn on two canvases (one behind the model, one in front
   of it) from the same camera as the model: its orbit, target and field of view are read from
   <model-viewer> every frame, so the lines turn with the houses when they are turned and grow when
   they are zoomed. The grid is a big square, strongest round the houses and growing fainter towards
   its outer edge, which is square too, until it is gone. All in the model's own units. */
(function () {
  var viewer = document.getElementById('m')
  if (!viewer) return

  // ---- how it looks (change these) ----
  var CELL = 1 // the distance between two thin lines
  var MAJOR_EVERY = 5 // every this many lines, a stronger one
  var MINOR = 0.26 // the strength of a thin line, at its strongest (0 to 1)
  var MAJOR = 0.5 // the strength of a stronger line
  var WIDTH_MINOR = 0.45 // line widths, in pixels
  var WIDTH_MAJOR = 0.75
  var REACH = 2.0 // how far the grid reaches from the middle on each side, in half-widths of the houses' ground (the longer side of it): it is gone by then
  var SOFT = 0.2 // how much of that reach, from the middle, is kept at full strength before it begins to fade

  // a back canvas under the model and a front one over it, both moved up with the model
  function layer(before) {
    var c = document.createElement('canvas')
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;transform:translateY(-7%)'
    viewer.parentNode.insertBefore(c, before ? viewer : viewer.nextSibling)
    return c
  }
  var back = layer(true)
  var front = layer(false)
  viewer.style.position = 'relative'
  back.style.zIndex = 0
  viewer.style.zIndex = 1
  front.style.zIndex = 2

  var world = null // set once the model is loaded: where its ground is and how big it is

  function build() {
    var c = viewer.getBoundingBoxCenter(), d = viewer.getDimensions()
    world = {
      cx: c.x, cz: c.z, groundY: c.y - d.y / 2, topY: c.y + d.y / 2,
      hx: d.x / 2, hz: d.z / 2,
    }
  }

  // ---- the camera, as model-viewer has it ----
  var last = ''
  function frame() {
    requestAnimationFrame(frame)
    if (!world) return
    var o = viewer.getCameraOrbit(), t = viewer.getCameraTarget(), fov = viewer.getFieldOfView()
    var W = viewer.clientWidth, H = viewer.clientHeight
    var key = [o.theta, o.phi, o.radius, t.x, t.y, t.z, fov, W, H].join(',')
    if (key === last) return
    last = key
    draw(o, t, fov, W, H)
  }

  function makeProjector(o, t, fov, W, H) {
    var st = Math.sin(o.theta), ct = Math.cos(o.theta), sp = Math.sin(o.phi), cp = Math.cos(o.phi)
    var px = t.x + o.radius * sp * st, py = t.y + o.radius * cp, pz = t.z + o.radius * sp * ct
    var fx = t.x - px, fy = t.y - py, fz = t.z - pz, fl = Math.hypot(fx, fy, fz)
    fx /= fl; fy /= fl; fz /= fl
    var rx = -fz, rz = fx, rl = Math.hypot(rx, rz) // right = forward x up
    rx /= rl; rz /= rl
    var ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy // up = right x forward
    var tan = Math.tan((fov * Math.PI) / 360), aspect = W / H
    return function (x, y, z, out) {
      var dx = x - px, dy = y - py, dz = z - pz
      var depth = dx * fx + dy * fy + dz * fz
      if (depth < 0.05) return false
      var sx = dx * rx + dz * rz, sy = dx * ux + dy * uy + dz * uz
      out[0] = (sx / (depth * tan * aspect) * 0.5 + 0.5) * W
      out[1] = (0.5 - (sy / (depth * tan)) * 0.5) * H
      out[2] = depth
      return true
    }
  }

  function setup(canvas, W, H) {
    var ratio = Math.min(2, window.devicePixelRatio || 1)
    if (canvas.width !== Math.round(W * ratio) || canvas.height !== Math.round(H * ratio)) {
      canvas.width = Math.round(W * ratio)
      canvas.height = Math.round(H * ratio)
    }
    var g = canvas.getContext('2d')
    g.setTransform(ratio, 0, 0, ratio, 0, 0)
    g.clearRect(0, 0, W, H)
    g.lineCap = 'round'
    return g
  }

  function draw(o, t, fov, W, H) {
    var project = makeProjector(o, t, fov, W, H)
    var A = [0, 0, 0], B = [0, 0, 0]
    var w = world
    var g = setup(back, W, H)
    var f = setup(front, W, H)

    // how strong the grid is at a place on the ground: full near the middle, then easing off the further
    // out it is, smoothly, until at the edge of its reach there is nothing left. The reach is a square
    // (with softly rounded corners), centred on the houses and as wide as the longer side of their ground
    // allows, so that the grid is long and wide the same way each way round.
    var half = Math.max(w.hx, w.hz) * REACH
    function fade(x, z) {
      var dx = Math.abs(x - w.cx) / half, dz = Math.abs(z - w.cz) / half
      var d = Math.pow(Math.pow(dx, 6) + Math.pow(dz, 6), 1 / 6)
      if (d <= SOFT) return 1
      if (d >= 1) return 0
      var k = 1 - (d - SOFT) / (1 - SOFT)
      return k * k * (3 - 2 * k)
    }

    // one straight line between two points of the world
    function line(ctx, x1, y1, z1, x2, y2, z2, alpha, width) {
      if (alpha <= 0.008) return
      if (!project(x1, y1, z1, A) || !project(x2, y2, z2, B)) return
      ctx.strokeStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')'
      ctx.lineWidth = width
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke()
    }

    // the ground grid: lines every CELL in both directions, drawn in pieces of one cell so that each
    // piece has its own strength; the lines at multiples of MAJOR_EVERY are stronger
    var gy = w.groundY - 0.004
    var x0 = Math.floor((w.cx - half) / CELL), x1 = Math.ceil((w.cx + half) / CELL)
    var z0 = Math.floor((w.cz - half) / CELL), z1 = Math.ceil((w.cz + half) / CELL)
    for (var i = x0; i <= x1; i++) {
      var major = i % MAJOR_EVERY === 0
      for (var j = z0; j < z1; j++) {
        line(g, i * CELL, gy, j * CELL, i * CELL, gy, (j + 1) * CELL, (major ? MAJOR : MINOR) * fade(i * CELL, (j + 0.5) * CELL), major ? WIDTH_MAJOR : WIDTH_MINOR)
      }
    }
    for (var j2 = z0; j2 <= z1; j2++) {
      var major2 = j2 % MAJOR_EVERY === 0
      for (var i2 = x0; i2 < x1; i2++) {
        line(g, i2 * CELL, gy, j2 * CELL, (i2 + 1) * CELL, gy, j2 * CELL, (major2 ? MAJOR : MINOR) * fade((i2 + 0.5) * CELL, j2 * CELL), major2 ? WIDTH_MAJOR : WIDTH_MINOR)
      }
    }

    // the axes of the drawing, crossing in the middle of the houses: x and z along the ground, both
    // ways from the middle, and y standing up from it, with a tick at every unit and a number at every
    // five (the numbers count away from the middle)
    var ox = w.cx, oz = w.cz
    var lenX = Math.ceil(w.hx * 1.15), lenZ = Math.ceil(w.hz * 1.1), lenY = Math.ceil((w.topY - w.groundY) * 2.4)
    line(f, ox - lenX, gy, oz, ox + lenX, gy, oz, 0.7, 0.8)
    line(f, ox, gy, oz - lenZ, ox, gy, oz + lenZ, 0.7, 0.8)
    line(f, ox, gy, oz, ox, gy + lenY, oz, 0.7, 0.8)
    f.font = '9px ui-monospace, Menlo, monospace'
    f.fillStyle = 'rgba(255,255,255,0.7)'
    function tick(x, y, z, dx, dy, dz, label) {
      line(f, x, y, z, x + dx, y + dy, z + dz, 0.55, 0.7)
      if (label !== null && project(x + dx * 2.2, y + dy * 2.2, z + dz * 2.2, A)) f.fillText(label, A[0] - 3, A[1] + 3)
    }
    for (var a = -lenX; a <= lenX; a++) {
      if (a === 0) continue
      var five = a % 5 === 0
      tick(ox + a, gy, oz, 0, 0, five ? 0.36 : 0.18, five ? String(a) : null)
    }
    for (var k = -lenZ; k <= lenZ; k++) {
      if (k === 0) continue
      var fiveZ = k % 5 === 0
      tick(ox, gy, oz + k, fiveZ ? 0.36 : 0.18, 0, 0, fiveZ ? String(k) : null)
    }
    for (var m = 1; m <= lenY; m++) tick(ox, gy + m * 0.5, oz, m % 2 === 0 ? 0.36 : 0.18, 0, 0, m % 2 === 0 ? String(m / 2) : null)
    function name(x, y, z, text) { if (project(x, y, z, A)) f.fillText(text, A[0] - 3, A[1] + 3) }
    name(ox + lenX + 0.8, gy, oz, 'X')
    name(ox, gy, oz + lenZ + 0.8, 'Z')
    name(ox, gy + lenY + 0.4, oz, 'Y')
    name(ox + 0.4, gy, oz + 0.9, '0')
  }

  function start() {
    build()
    last = ''
    frame()
  }
  if (viewer.loaded) start()
  else viewer.addEventListener('load', start, { once: true })
  window.addEventListener('resize', function () { last = '' })
})()
