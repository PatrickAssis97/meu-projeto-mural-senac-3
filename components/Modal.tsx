import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 animate-fade-in-up"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-[#002b4f] rounded-lg shadow-2xl w-full max-w-2xl m-4 border-2 border-[#f58220]/50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-white/20">
          <h2 id="modal-title" className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl p-1 leading-none">&times;</button>
        </header>
        <div className="p-6 text-white overflow-y-auto max-h-[80vh]">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
