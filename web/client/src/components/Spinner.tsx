import './Spinner.css'

interface Props {
  label?: string
  inline?: boolean
}

export function Spinner({ label, inline }: Props) {
  const content = (
    <>
      <span className="spinner-dot" />
      {label && <span className="spinner-label">{label}</span>}
    </>
  )

  if (inline) {
    return <span className="spinner spinner--inline">{content}</span>
  }

  return <div className="spinner">{content}</div>
}
