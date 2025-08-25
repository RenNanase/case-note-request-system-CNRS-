import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, isVisible, onClose, duration = 5000 }: ToastProps) {
  // Debug toast rendering
  console.log('🔔 Toast component render:', { message, type, isVisible, duration });

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-500">
      <div className={cn(
        "flex items-center space-x-3 p-4 rounded-lg shadow-xl border-2 min-w-[350px] transform transition-all duration-300 animate-bounce",
        type === 'success'
          ? "bg-green-50 border-green-300 text-green-800 shadow-green-100"
          : "bg-red-50 border-red-300 text-red-800 shadow-red-100"
      )}>
        {type === 'success' ? (
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
        ) : (
          <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
        )}
        <span className="flex-1 font-medium text-sm">{message}</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
