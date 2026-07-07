import { useEffect } from 'react';

export default function Toast({ message, type = 'ok', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2800);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div 
      className="toast show" 
      style={{ 
        background: type === 'warn' ? 'var(--warn)' : 'var(--text)',
        pointerEvents: 'none'
      }}
    >
      {message}
    </div>
  );
}
