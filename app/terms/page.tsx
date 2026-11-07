import type { Metadata } from 'next'
import { LegalPage } from '../../components/legal/LegalPage'

export const metadata: Metadata = { title: '이용약관 — Pixel CCTV' }

export default function TermsPage() {
  return (
    <LegalPage title="이용약관">
      <h2>1. 목적</h2>
      <p>이 약관은 개인이 운영하는 Pixel CCTV 사이트의 이용 조건을 정합니다. 서비스는 무료이며 비영리입니다.</p>
      <h2>2. 이용 방법</h2>
      <p>별도의 가입 없이 누구나 이용할 수 있습니다. 사이트를 이용하면 이 약관과 개인정보처리방침에 동의한 것으로 봅니다.</p>
      <h2>3. 이용자가 지킬 일</h2>
      <ul>
        <li>사이트 운영을 방해하거나 서버에 과도한 요청을 보내지 않습니다.</li>
        <li>타인을 불쾌하게 하거나 불법적인 내용을 공유 기능에 올리지 않습니다.</li>
      </ul>
      <h2>4. 콘텐츠의 권리</h2>
      <p>사이트의 영상, 음원, 이미지, 코드에 대한 권리는 각 권리자에게 있습니다. 허락 없이 복제하거나 배포할 수 없습니다.</p>
      <h2>5. 공유 캐릭터</h2>
      <p>이용자가 만든 캐릭터는 다른 방문자에게 공개되며, 운영자는 부적절한 내용을 삭제할 수 있습니다.</p>
      <h2>6. 서비스 변경과 책임</h2>
      <p>서비스는 예고 없이 바뀌거나 중단될 수 있으며, 현재 상태 그대로 제공됩니다.</p>
    </LegalPage>
  )
}
