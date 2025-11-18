import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onDismiss]);

  const baseClasses = 'px-4 py-3 rounded-md shadow-lg text-white flex items-center justify-between animate-slide-in w-full max-w-sm';
  const typeClasses = {
    success: 'bg-green-600',
    error: 'bg-red-600',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-4 text-xl font-bold leading-none p-1">&times;</button>
    </div>
  );
};

export default Toast;
