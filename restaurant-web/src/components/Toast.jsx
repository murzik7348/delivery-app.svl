import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideToast } from '../store/slices/toastSlice';
import { X, AlertCircle } from 'lucide-react';

const TOAST_DURATION = 5000;

export default function Toast() {
  const dispatch = useDispatch();
  const { message, type, id } = useSelector((state) => state.toast);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => dispatch(hideToast()), TOAST_DURATION);
    return () => clearTimeout(t);
  }, [message, id, dispatch]);

  if (!message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border min-w-[320px] max-w-[480px] ${
          isError ? 'bg-danger/90 border-danger/50 text-white' : isSuccess ? 'bg-success/90 border-success/50 text-white' : 'bg-surface border-borderWhite text-white'
        }`}
      >
        {isError && <AlertCircle className="w-5 h-5 shrink-0" />}
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={() => dispatch(hideToast())} className="p-1 hover:bg-white/10 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
