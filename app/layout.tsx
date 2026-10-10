import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { CompassCursor } from '../components/site/CompassCursor'
import { SharedVisitRecorder } from '../components/site/SharedVisitRecorder'
import './globals.css'
import './cctv-skin.css'

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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <SharedVisitRecorder />
        <CompassCursor />
        {children}
      </body>
    </html>
  )
}
