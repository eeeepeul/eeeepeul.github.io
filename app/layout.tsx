import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { preload } from 'react-dom'
import { assetPath } from '../lib/asset-path.mjs'
import { CompassCursor } from '../components/site/CompassCursor'
import { RotateNotice } from '../components/site/RotateNotice'
import { SharedVisitRecorder } from '../components/site/SharedVisitRecorder'
import './globals.css'
import './map-skin.css'

export const metadata: Metadata = {
  title: 'Pixel CCTV — if and only if',
  description: '영상과 킥, 손끝이 함께 만드는 개인용 픽셀 CCTV 경험',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
}

// The planet's pictures are asked for in the page's head, so they come down at the same time as the
// code that draws the planet (which is big) instead of after it.
const PLANET_PICTURES = ['maps/globe-map.webp', 'maps/globe-land.webp?v=5', 'maps/milky-way.webp', 'maps/milky-way-2.webp']

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  PLANET_PICTURES.forEach((picture) => preload(assetPath(picture), { as: 'image' }))
  return (
    <html lang="ko">
      <body>
        <SharedVisitRecorder />
        <CompassCursor />
        {children}
        <RotateNotice />
      </body>
    </html>
  )
}
