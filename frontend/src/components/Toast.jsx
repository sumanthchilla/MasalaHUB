import "./Toast.css";

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.type}`} key={toast.id}>
          <span className="toast-dot" aria-hidden="true" />
          <p>{toast.message}</p>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => onDismiss(toast.id)}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastStack;
