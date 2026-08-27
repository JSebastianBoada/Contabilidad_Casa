import { useFinance } from '../context/FinanceContext'

export function ToastContainer() {
  const { toasts, removeToast } = useFinance()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)}>
          <div className="toast-content">
            <h4>{t.title}</h4>
            {t.message && <p>{t.message}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
