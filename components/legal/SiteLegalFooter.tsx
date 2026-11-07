import { assetPath } from '../../lib/asset-path.mjs'
import './legal.css'

export function SiteLegalFooter() {
  return (
    <footer className="site-legal-footer">
      <a href={`${assetPath('privacy')}/`}>개인정보처리방침</a>
      <a href={`${assetPath('terms')}/`}>이용약관</a>
    </footer>
  )
}
