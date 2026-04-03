import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  variant = 'primary'
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-serif tracking-widest uppercase">{title}</h3>
          <button onClick={onClose} className="text-brand-gray hover:text-brand-black transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <p className="text-sm text-brand-gray mb-10 leading-relaxed tracking-wide">
          {message}
        </p>
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full py-4 text-[10px] tracking-[0.3em] font-bold transition-all ${
              variant === 'danger' 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-brand-black text-white hover:bg-brand-black/90'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 text-[10px] tracking-[0.3em] font-bold border border-brand-black/10 hover:bg-brand-black/5 transition-all"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
