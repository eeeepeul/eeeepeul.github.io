// On a phone held upright the stage is only a thin strip; this asks for the phone to be turned on its
// side. It is shown by CSS only (see .rotate-notice), and only on pages that have the stage.
export function RotateNotice() {
  return (
    <div className="rotate-notice" role="alert">
      <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <rect x="22" y="8" width="20" height="36" rx="3" />
        <path d="M14 52a22 22 0 0 0 36 0" />
        <path d="M50 46v6h-6" />
      </svg>
      <p>화면을 가로로 돌려서 봐 주세요</p>
    </div>
  )
}
