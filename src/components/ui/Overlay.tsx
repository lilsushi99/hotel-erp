import React, { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { ToastNotification } from '../../context/HotelContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  size,
}) => {
  const resolvedMaxWidth =
    maxWidth ||
    (size === 'sm'
      ? 'max-w-md'
      : size === 'md'
      ? 'max-w-lg'
      : size === 'xl'
      ? 'max-w-2xl'
      : 'max-w-xl');
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]">
      <div
        className={`bg-white rounded-[14px] w-full ${resolvedMaxWidth} max-h-[90vh] flex flex-col shadow-[0_18px_44px_rgba(0,0,0,0.12)] overflow-hidden`}
      >
        <div className="px-5 py-4 border-b border-[#EFEFEA] flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-[17px] font-medium text-[#1E1E1E]">{title}</h2>
            {subtitle && (
              <p className="text-[12.5px] font-normal text-[#6E6E6A] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7.5 h-7.5 rounded-[9px] bg-[#F6F6F4] hover:bg-[#EAEAE4] flex items-center justify-center text-[#4A4A46] transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  widthClass?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  widthClass = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]">
      <div
        className={`bg-white w-full ${widthClass} h-full rounded-l-[14px] shadow-[0_0_44px_rgba(0,0,0,0.14)] flex flex-col overflow-hidden`}
      >
        <div className="px-5 py-4 border-b border-[#EFEFEA] flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-[17px] font-medium text-[#1E1E1E]">{title}</h2>
            {subtitle && (
              <p className="text-[12.5px] font-normal text-[#6E6E6A] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7.5 h-7.5 rounded-[9px] bg-[#F6F6F4] hover:bg-[#EAEAE4] flex items-center justify-center text-[#4A4A46] transition-colors shrink-0 cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]">
      <div className="bg-white rounded-[14px] w-full max-w-md p-5 shadow-[0_18px_44px_rgba(0,0,0,0.12)]">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
              destructive
                ? 'bg-[#FCECE9] text-[#DC2626]'
                : 'bg-[#FEF4E6] text-[#D97706]'
            }`}
          >
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15.5px] font-medium text-[#1E1E1E]">{title}</h3>
            <p className="text-[13px] font-normal text-[#6E6E6A] mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-[10px] text-[13px] font-normal text-[#4A4A46] bg-[#F6F6F4] hover:bg-[#EAEAE4] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-[10px] text-[13px] font-medium text-white transition-colors cursor-pointer ${
              destructive
                ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                : 'bg-[#7463A6] hover:bg-[#635394]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-white border border-[#E6E6E0] rounded-[12px] p-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.08)] flex items-start gap-3"
        >
          <div className="mt-0.5 shrink-0">
            {t.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            )}
            {t.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-[#DC2626]" />
            )}
            {t.type === 'info' && <Info className="w-4 h-4 text-[#7463A6]" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#1E1E1E]">
              {t.title}
            </div>
            <div className="text-[12px] font-normal text-[#6E6E6A] mt-0.5 leading-snug">
              {t.message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="text-[#8E8E88] hover:text-[#1E1E1E] p-1 rounded-[7px]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
