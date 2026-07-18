export function assetPath(path, basePath = process.env.NEXT_PUBLIC_BASE_PATH || '') {
  const baseSegments = basePath.split('/').filter(Boolean)
  const normalizedBase = baseSegments.length > 0 ? `/${baseSegments.join('/')}` : ''
  const normalizedPath = `/${path.split('/').filter(Boolean).join('/')}`

  return `${normalizedBase}${normalizedPath}`
}
