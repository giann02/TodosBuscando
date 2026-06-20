import { useEffect, useState } from 'react'

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const icons = { success: '✓', error: '✕', info: '◉' }

  return (
    <div
      className={`toast toast-${toast.type} ${visible ? 'toast-visible' : ''}`}
      onClick={() => onRemove(toast.id)}
    >
      <span className="toast-icon">{icons[toast.type] || icons.info}</span>
      <span className="toast-msg">{toast.message}</span>
    </div>
  )
}

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  )
}
