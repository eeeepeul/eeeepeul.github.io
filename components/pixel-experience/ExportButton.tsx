type ExportButtonProps = {
  supported: boolean
  recording: boolean
  disabled: boolean
  onStart: () => void
  onStop: () => void
}

export function ExportButton({
  supported,
  recording,
  disabled,
  onStart,
  onStop,
}: ExportButtonProps) {
  if (recording) {
    return (
      <button className="action-button recording-button" type="button" onClick={onStop}>
        <span className="record-dot" /> 녹화 중지
      </button>
    )
  }

  return (
    <button
      className="action-button"
      type="button"
      disabled={disabled || !supported}
      onClick={onStart}
      title={!supported ? '이 브라우저는 H.264 MP4 녹화를 지원하지 않습니다.' : undefined}
    >
      H.264 MP4 저장
    </button>
  )
}
