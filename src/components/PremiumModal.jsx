import { useState, useEffect } from 'react';

export default function PremiumModal({ modal, onClose }) {
  // Hooks must always run — never conditionally. Keep them before any early return.
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!modal) return;
    setInputValue(modal.defaultValue || '');
    setError('');
  }, [modal]);

  if (!modal) return null;

  const {
    type = 'confirm',
    tone = 'indigo',
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    inputType = 'text',
    inputPlaceholder = '',
    onConfirm,
    validate,
    details = null,
  } = modal;

  const handleConfirm = () => {
    if (type === 'prompt') {
      const cleanVal = String(inputValue).trim();
      if (validate) {
        const validationError = validate(cleanVal);
        if (validationError) {
          setError(validationError);
          return;
        }
      }
      onConfirm(cleanVal);
    } else {
      onConfirm();
    }
  };

  const getToneColors = () => {
    switch (tone) {
      case 'rose':
      case 'danger':
        return {
          glow: 'shadow-[0_0_50px_rgba(239,68,68,0.15)]',
          border: 'border-red-500/20',
          bg: 'bg-red-500/10',
          text: 'text-red-400',
          btnBg: 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)]',
        };
      case 'emerald':
      case 'success':
        return {
          glow: 'shadow-[0_0_50px_rgba(16,185,129,0.15)]',
          border: 'border-emerald-500/20',
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          btnBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
        };
      case 'indigo':
      default:
        return {
          glow: 'shadow-[0_0_50px_rgba(99,102,241,0.15)]',
          border: 'border-indigo-500/20',
          bg: 'bg-indigo-500/10',
          text: 'text-indigo-400',
          btnBg: 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.25)]',
        };
    }
  };

  const colors = getToneColors();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-5 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-sm rounded-3xl border ${colors.border} bg-slate-900/90 p-6 ${colors.glow} animate-scaleUp transition-all duration-300`}>
        
        {/* Decorative top icon */}
        <div className="flex justify-between items-start mb-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${colors.border} ${colors.bg} text-xl font-bold ${colors.text}`}>
            {type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : type === 'prompt' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
          </div>
          
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-350 transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title & Message */}
        <h2 className="text-lg font-extrabold tracking-tight text-white">{title}</h2>
        {message && <p className="mt-2 text-xs leading-relaxed text-slate-400">{message}</p>}

        {/* Dynamic form input for Prompt type */}
        {type === 'prompt' && (
          <div className="mt-4 space-y-2">
            <input
              type={inputType}
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none transition-colors"
            />
            {error && (
              <p className="text-[10px] font-semibold text-red-400 mt-1">
                ⚠️ {error}
              </p>
            )}
          </div>
        )}

        {/* Dynamic Success Receipt visual details */}
        {type === 'success' && details && (
          <div className="mt-5 rounded-2xl bg-slate-950/70 border border-slate-900 p-4 space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl pointer-events-none rounded-full"></div>
            
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Transaction Type</p>
                <p className={`text-xs font-bold mt-0.5 ${details.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {details.type === 'income' ? 'Income Log' : 'Expense Log'}
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Category</p>
                <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-350 mt-0.5">
                  {details.category}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Description</p>
              <p className="text-xs font-semibold text-slate-200 truncate">{details.title}</p>
            </div>

            <div className="flex justify-between items-end pt-1">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Amount Logged</p>
                <p className={`text-xl font-black tracking-tight ${details.type === 'income' ? 'text-emerald-300' : 'text-red-300'}`}>
                  {details.type === 'income' ? '+' : '-'}₹{parseFloat(details.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {details.budgetGoal && details.type !== 'income' && (
                <div className="text-right">
                  <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Budget Status</p>
                  <p className={`text-[10px] font-bold ${details.budgetRemaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {details.budgetRemaining < 0 
                      ? `Over limit by ₹${Math.abs(details.budgetRemaining).toLocaleString('en-IN')}`
                      : `₹${details.budgetRemaining.toLocaleString('en-IN')} left`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buttons / Actions */}
        <div className="mt-6 flex gap-2">
          {type !== 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-bold text-slate-400 transition-colors hover:border-slate-700 hover:text-white"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-xl px-4 py-3 text-xs font-extrabold transition-all active:scale-[0.98] ${
              type === 'success' ? 'w-full ' + colors.btnBg : 'flex-1 ' + colors.btnBg
            }`}
          >
            {type === 'success' ? 'Done' : confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
