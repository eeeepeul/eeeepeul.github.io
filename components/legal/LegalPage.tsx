import type { ReactNode } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { CONTACT_LABEL, CONTACT_URL, LEGAL_UPDATED } from '../../lib/legal.mjs'
import './legal.css'

export function LegalPage({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <main className="legal-page">
      <a className="legal-back" href={assetPath('') || '/'}>← 처음으로</a>
      <h1>{title}</h1>
      <p className="legal-meta">최종 수정일: {LEGAL_UPDATED}</p>
      {children}
      <h2>문의처</h2>
      <p>
        문의와 삭제 요청은 <a href={CONTACT_URL} rel="noopener noreferrer" target="_blank">{CONTACT_LABEL}</a>로 남겨 주세요.
      </p>
      <nav className="legal-links" aria-label="정책 문서">
        <a href={`${assetPath('privacy')}/`}>개인정보처리방침</a>
        <a href={`${assetPath('terms')}/`}>이용약관</a>
      </nav>
    </main>
  )
}
