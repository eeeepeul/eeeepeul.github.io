const AVC_MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
]

export function pickH264Mime(isTypeSupported) {
  return AVC_MIME_TYPES.find((mime) => isTypeSupported(mime)) || null
}
