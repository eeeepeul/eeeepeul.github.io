/* The scanned houses as a cloud of small cubes, as in the supplied picture of a scanned head: every
   surface of the houses (roofs, walls, doors, frames) is cut into small square cubes lit like a rough
   scan, their colour the surface's own, a little different from cube to cube; the cubes thin out and
   fly off towards the top of each house, so the houses seem to dissolve upward. The model's own
   meshes are hidden and replaced; its scattered scan particles and blue markers are kept. The camera,
   the controls and the grid are not touched. Reads the model out of <model-viewer> once it has loaded. */
(function () {
  var viewer = document.getElementById('m')
  if (!viewer) return

  // ---- how it looks (change these) ----
  var CUBES = 26000 // how many cubes in all
  var SIZE = 0.115 // a cube's edge, in the model's units
  var SIZE_SPREAD = 0.7 // how much cubes differ in size (0 to 1)
  var DISSOLVE_FROM = 0.4 // from this height of a house (0 bottom, 1 top) the cubes start to thin out
  var FLY_UP = 0.9 // how high the cubes that are loose fly above a house, in the model's units
  var SHADE = 0.55 // how much cubes differ in brightness (0 to 1)

  function symbol(name) {
    return Object.getOwnPropertySymbols(viewer).find(function (s) {
      return s.description === name
    })
  }

  // a small seeded random, so the cloud is the same every time
  var seed = 20261031
  function random() {
    seed = (seed + 0x6d2b79f5) | 0
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // the colours of a mesh's own texture, read into pixels, so each cube takes the colour the house had
  // at that spot (windows dark, walls pale, roofs rust) instead of one flat colour
  var textures = new Map()
  function textureOf(material) {
    var map = material && material.map
    if (!map || !map.image) return null
    if (textures.has(map)) return textures.get(map)
    var info = null
    try {
      var image = map.image
      var w = image.width || image.naturalWidth
      var h = image.height || image.naturalHeight
      if (w && h) {
        var scale = Math.min(1, 1024 / Math.max(w, h))
        var canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(w * scale))
        canvas.height = Math.max(1, Math.round(h * scale))
        var context = canvas.getContext('2d', { willReadFrequently: true })
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        info = { data: context.getImageData(0, 0, canvas.width, canvas.height).data, w: canvas.width, h: canvas.height, flipY: map.flipY !== false }
      }
    } catch (error) {
      info = null
    }
    textures.set(map, info)
    return info
  }
  function srgb(v) {
    return Math.pow(v / 255, 2.2)
  }

  function build() {
    var scene = viewer[symbol('scene')]
    if (!scene) return
    scene.updateMatrixWorld(true)
    var meshes = []
    scene.traverse(function (node) {
      if (node.isMesh && node.geometry && node.geometry.attributes.position) meshes.push(node)
    })
    if (!meshes.length) return
    var any = meshes[0]
    var Mesh = any.constructor
    var Geometry = any.geometry.constructor
    var Attribute = any.geometry.attributes.position.constructor
    var Material = any.material.constructor

    // which meshes become cubes: the houses' own surfaces (not the scan particles or markers)
    var sources = meshes.filter(function (m) {
      var name = (m.name || '') + ' ' + ((m.parent && m.parent.name) || '')
      return /roof|wall|frames|door/i.test(name) && !/particle|marker/i.test(name)
    })
    if (!sources.length) return

    // the area of each source's triangles, to share the cubes out in proportion
    var tri = []
    var total = 0
    sources.forEach(function (m, si) {
      var g = m.geometry
      var pos = g.attributes.position
      var index = g.index
      var count = index ? index.count / 3 : pos.count / 3
      var a = [0, 0, 0]
      var b = [0, 0, 0]
      var c = [0, 0, 0]
      function get(vi, out) {
        out[0] = pos.getX(vi)
        out[1] = pos.getY(vi)
        out[2] = pos.getZ(vi)
        var e = m.matrixWorld.elements
        var x = out[0]
        var y = out[1]
        var z = out[2]
        out[0] = e[0] * x + e[4] * y + e[8] * z + e[12]
        out[1] = e[1] * x + e[5] * y + e[9] * z + e[13]
        out[2] = e[2] * x + e[6] * y + e[10] * z + e[14]
      }
      var uv = g.attributes.uv
      for (var t = 0; t < count; t++) {
        var i0 = index ? index.getX(t * 3) : t * 3
        var i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1
        var i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2
        get(i0, a)
        get(i1, b)
        get(i2, c)
        var ux = b[0] - a[0]
        var uy = b[1] - a[1]
        var uz = b[2] - a[2]
        var vx = c[0] - a[0]
        var vy = c[1] - a[1]
        var vz = c[2] - a[2]
        var nx = uy * vz - uz * vy
        var ny = uz * vx - ux * vz
        var nz = ux * vy - uy * vx
        var area = 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz)
        if (area < 1e-7) continue
        total += area
        var uvs = uv
          ? [[uv.getX(i0), uv.getY(i0)], [uv.getX(i1), uv.getY(i1)], [uv.getX(i2), uv.getY(i2)]]
          : null
        tri.push({ s: si, a: a.slice(), b: b.slice(), c: c.slice(), area: area, uvs: uvs })
      }
    })
    if (!tri.length || total <= 0) return

    // heights of each house: the model's footprint boxes are not needed, a coarse grid is enough
    var minY = Infinity
    var maxY = -Infinity
    tri.forEach(function (t) {
      ;[t.a, t.b, t.c].forEach(function (p) {
        if (p[1] < minY) minY = p[1]
        if (p[1] > maxY) maxY = p[1]
      })
    })
    var span = Math.max(1e-6, maxY - minY)
    // the houses' own floor, for the grid and the axes of the drawing (house-grid.js): they stand on it
    window.__houseGround = minY

    var cubes = []
    tri.forEach(function (t) {
      var want = (t.area / total) * CUBES
      var n = Math.floor(want) + (random() < want - Math.floor(want) ? 1 : 0)
      var color = sources[t.s].material.color || { r: 0.8, g: 0.75, b: 0.7 }
      var map = sources[t.s].material
      var tex = t.uvs ? textureOf(map) : null
      var nx = (t.b[1] - t.a[1]) * (t.c[2] - t.a[2]) - (t.b[2] - t.a[2]) * (t.c[1] - t.a[1])
      var ny = (t.b[2] - t.a[2]) * (t.c[0] - t.a[0]) - (t.b[0] - t.a[0]) * (t.c[2] - t.a[2])
      var nz = (t.b[0] - t.a[0]) * (t.c[1] - t.a[1]) - (t.b[1] - t.a[1]) * (t.c[0] - t.a[0])
      var nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
      for (var k = 0; k < n; k++) {
        var r1 = Math.sqrt(random())
        var r2 = random()
        var x = t.a[0] * (1 - r1) + t.b[0] * r1 * (1 - r2) + t.c[0] * r1 * r2
        var y = t.a[1] * (1 - r1) + t.b[1] * r1 * (1 - r2) + t.c[1] * r1 * r2
        var z = t.a[2] * (1 - r1) + t.b[2] * r1 * (1 - r2) + t.c[2] * r1 * r2
        // towards the top of the houses the cubes thin out, and those that stay may be lifted off
        var h = (y - minY) / span
        var gone = Math.max(0, (h - DISSOLVE_FROM) / (1 - DISSOLVE_FROM))
        if (random() < gone * gone * 0.9) continue
        var lift = random() < gone * 0.7 ? random() * random() * FLY_UP * (0.4 + gone) : 0
        var spread = lift * 0.6
        var cr = color.r
        var cg = color.g
        var cb = color.b
        if (tex) {
          var u = t.uvs[0][0] * (1 - r1) + t.uvs[1][0] * r1 * (1 - r2) + t.uvs[2][0] * r1 * r2
          var v = t.uvs[0][1] * (1 - r1) + t.uvs[1][1] * r1 * (1 - r2) + t.uvs[2][1] * r1 * r2
          u = u - Math.floor(u)
          v = v - Math.floor(v)
          var px = Math.min(tex.w - 1, Math.floor(u * tex.w))
          var py = Math.min(tex.h - 1, Math.floor((tex.flipY ? 1 - v : v) * tex.h))
          var o = (py * tex.w + px) * 4
          cr = srgb(tex.data[o]) * color.r
          cg = srgb(tex.data[o + 1]) * color.g
          cb = srgb(tex.data[o + 2]) * color.b
        }
        cubes.push({
          x: x + (random() - 0.5) * spread,
          y: y + lift,
          z: z + (random() - 0.5) * spread,
          size: SIZE * (1 + (random() - 0.5) * 2 * SIZE_SPREAD) * (lift > 0 ? 0.8 : 1),
          nx: nx / nl,
          ny: ny / nl,
          nz: nz / nl,
          r: cr,
          g: cg,
          b: cb,
          mat: map,
        })
      }
    })

    // one mesh from all the cubes: 8 corners each, shaded by their own corner direction so that each
    // cube has a lit side and a dark one
    var n = cubes.length
    var positions = new Float32Array(n * 8 * 3)
    var normals = new Float32Array(n * 8 * 3)
    var colors = new Float32Array(n * 8 * 3)
    var indices = new Uint32Array(n * 36)
    var faces = [
      [0, 2, 1, 1, 2, 3],
      [4, 5, 6, 5, 7, 6],
      [0, 1, 4, 1, 5, 4],
      [2, 6, 3, 3, 6, 7],
      [0, 4, 2, 2, 4, 6],
      [1, 3, 5, 3, 7, 5],
    ]
    cubes.forEach(function (q, i) {
      // each cube turned a little, like a scan's loose voxels
      var angle = random() * Math.PI
      var ca = Math.cos(angle)
      var sa = Math.sin(angle)
      var shade = 1 + (random() - 0.5) * 2 * SHADE
      var half = q.size / 2
      for (var v = 0; v < 8; v++) {
        var sx = v & 1 ? 1 : -1
        var sy = v & 2 ? 1 : -1
        var sz = v & 4 ? 1 : -1
        var lx = sx * half
        var lz = sz * half
        var o = (i * 8 + v) * 3
        positions[o] = q.x + lx * ca - lz * sa
        positions[o + 1] = q.y + sy * half
        positions[o + 2] = q.z + lx * sa + lz * ca
        // the corner's own direction, mixed with the surface's, so the cube reads as a cube
        var cx = (sx * ca - sz * sa) * 0.6 + q.nx * 0.8
        var cy = sy * 0.6 + q.ny * 0.8
        var cz = (sx * sa + sz * ca) * 0.6 + q.nz * 0.8
        var cl = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1
        normals[o] = cx / cl
        normals[o + 1] = cy / cl
        normals[o + 2] = cz / cl
        var top = sy > 0 ? 1.08 : 0.9
        colors[o] = Math.min(1, q.r * shade * top)
        colors[o + 1] = Math.min(1, q.g * shade * top)
        colors[o + 2] = Math.min(1, q.b * shade * top)
      }
      faces.forEach(function (f, fi) {
        for (var k = 0; k < 6; k++) indices[i * 36 + fi * 6 + k] = i * 8 + f[k]
      })
    })
    var geometry = new Geometry()
    geometry.setAttribute('position', new Attribute(positions, 3))
    geometry.setAttribute('normal', new Attribute(normals, 3))
    geometry.setAttribute('color', new Attribute(colors, 3))
    geometry.setIndex(new Attribute(indices, 1))
    var material = new Material({ vertexColors: true, roughness: 0.85, metalness: 0 })
    var cloud = new Mesh(geometry, material)
    cloud.frustumCulled = false
    cloud.name = 'House_voxels'
    scene.target ? scene.target.add(cloud) : scene.add(cloud)
    sources.forEach(function (m) {
      m.visible = false
    })
    // the glass of the windows goes too: it would hang in the air round the cubes
    meshes.forEach(function (m) {
      if (/glass/i.test((m.name || '') + ' ' + ((m.parent && m.parent.name) || ''))) m.visible = false
    })
    if (viewer.requestUpdate) viewer.requestUpdate()
    viewer.dataset.voxels = String(n)
  }

  var done = false
  function once() {
    if (done) return
    done = true
    try {
      build()
    } catch (error) {
      console.error('house voxels failed', error)
    }
  }
  viewer.addEventListener('load', once)
  if (viewer.loaded) once()
})()
