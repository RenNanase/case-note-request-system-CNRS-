import { useToast } from '@/contexts/ToastContext';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start space-x-3 p-4 rounded-lg shadow-xl border min-w-[350px] max-w-[500px] transform transition-all duration-300 animate-in slide-in-from-right-full",
            {
              'bg-green-50 border-green-200 text-green-800': toast.variant === 'success' || toast.variant === 'default',
              'bg-red-50 border-red-200 text-red-800': toast.variant === 'destructive',
            }
          )}
        >
          {(toast.variant === 'success' || toast.variant === 'default') && (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          )}
          {toast.variant === 'destructive' && (
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{toast.title}</div>
            {toast.description && (
              <div className="text-sm opacity-90 mt-1">{toast.description}</div>
            )}
          </div>

          <button
            onClick={() => dismiss(toast.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
