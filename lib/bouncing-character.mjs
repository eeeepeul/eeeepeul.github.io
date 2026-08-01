function reflectAxis(position, velocity, maximum) {
  if (maximum <= 0) return { position: 0, velocity: 0 }

  let nextPosition = position
  let nextVelocity = velocity

  while (nextPosition < 0 || nextPosition > maximum) {
    if (nextPosition < 0) {
      nextPosition = -nextPosition
      nextVelocity = Math.abs(nextVelocity)
    }

    if (nextPosition > maximum) {
      nextPosition = maximum - (nextPosition - maximum)
      nextVelocity = -Math.abs(nextVelocity)
    }
  }

  return { position: nextPosition, velocity: nextVelocity }
}

export function createRandomBouncingCharacter(bounds, random = Math.random) {
  const maximumX = Math.max(0, bounds.width - bounds.itemWidth)
  const maximumY = Math.max(0, bounds.height - bounds.itemHeight)
  const x = random() * maximumX
  const y = random() * maximumY
  const speed = 55 + random() * 70
  const angle = random() * Math.PI * 2

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  }
}

export function advanceBouncingCharacter(state, bounds, deltaSeconds) {
  const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0
  const maximumX = Math.max(0, bounds.width - bounds.itemWidth)
  const maximumY = Math.max(0, bounds.height - bounds.itemHeight)
  const horizontal = reflectAxis(state.x + state.vx * delta, state.vx, maximumX)
  const vertical = reflectAxis(state.y + state.vy * delta, state.vy, maximumY)

  return {
    x: horizontal.position,
    y: vertical.position,
    vx: horizontal.velocity,
    vy: vertical.velocity,
  }
}

export function createFollowCameraOffset(character, viewport) {
  return {
    x: viewport.width / 2 - (character.x + character.itemWidth / 2),
    y: viewport.height / 2 - (character.y + character.itemHeight / 2),
  }
}

export function createCameraRelativeWorldPosition(screenPosition, cameraOffset) {
  return {
    x: screenPosition.x - cameraOffset.x,
    y: screenPosition.y - cameraOffset.y,
  }
}
