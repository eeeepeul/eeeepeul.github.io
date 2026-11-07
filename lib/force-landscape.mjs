// A phone held upright shows the stage turned a quarter turn (see html[data-force-landscape] in
// globals.css). The browser still reports pointer positions in the upright window, so while the stage
// is turned they are laid over into the turned frame (x' = clientY, y' = width - clientX), and so are
// the boxes that getBoundingClientRect gives for things inside the stage. Code written for a
// landscape window then works unchanged.

const POINTER_EVENTS = [
  'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerover', 'pointerout',
  'mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'contextmenu', 'auxclick',
]
const TOUCH_EVENTS = ['touchstart', 'touchmove', 'touchend', 'touchcancel']

const define = (target, name, value) => Object.defineProperty(target, name, { value, configurable: true })

function mapPointer(event) {
  if (event.__landscapeMapped) return
  const width = window.innerWidth
  const { clientX, clientY, movementX, movementY } = event
  const x = clientY
  const y = width - clientX
  define(event, '__landscapeMapped', true)
  ;['clientX', 'pageX', 'x'].forEach((name) => define(event, name, x))
  ;['clientY', 'pageY', 'y'].forEach((name) => define(event, name, y))
  if (typeof movementX === 'number') {
    define(event, 'movementX', movementY)
    define(event, 'movementY', -movementX)
  }
}

function mapTouch(touch, width) {
  return new Proxy(touch, {
    get(target, key) {
      if (key === 'clientX' || key === 'pageX') return target.clientY
      if (key === 'clientY' || key === 'pageY') return width - target.clientX
      const value = target[key]
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

function mapTouches(event) {
  if (event.__landscapeMapped) return
  const width = window.innerWidth
  define(event, '__landscapeMapped', true)
  ;['touches', 'targetTouches', 'changedTouches'].forEach((name) => {
    const list = Array.from(event[name] || [], (touch) => mapTouch(touch, width))
    list.item = (index) => list[index] || null
    define(event, name, list)
  })
}

export function startForcedLandscape() {
  const root = document.documentElement
  root.setAttribute('data-force-landscape', '')

  const options = { capture: true, passive: true }
  POINTER_EVENTS.forEach((type) => window.addEventListener(type, mapPointer, options))
  TOUCH_EVENTS.forEach((type) => window.addEventListener(type, mapTouches, options))

  const original = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const rect = original.call(this)
    if (!this.closest || !this.closest('.stage-shell')) return rect
    return new DOMRect(rect.top, window.innerWidth - rect.right, rect.height, rect.width)
  }

  return () => {
    root.removeAttribute('data-force-landscape')
    POINTER_EVENTS.forEach((type) => window.removeEventListener(type, mapPointer, options))
    TOUCH_EVENTS.forEach((type) => window.removeEventListener(type, mapTouches, options))
    Element.prototype.getBoundingClientRect = original
  }
}
