import { useState, useEffect } from 'react';
import { normalizeCategoryName } from '../utils/categories';

export default function TransactionForm({ defaultTxType = 'expense',
  onSaveTransaction,
  categories = [],
  defaultCategories = [],
  onSaveCategory,
  onRenameCategory,
  onDeleteCategory,
  editingTransaction = null,
  onCancelEdit = null,
  currencySymbol = '₹',
  transactionsCount = 0,
  minDate = new Date().toISOString().split('T')[0],
}) {
  const isEditMode = !!editingTransaction;
  const today = new Date().toISOString().split('T')[0];
  const isUnlocked = transactionsCount > 0;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState(defaultTxType);
  const [category, setCategory] = useState(categories[0] || 'Food');
  const [date, setDate] = useState(today);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ title: false, amount: false, message: '' });
  const [showDateToast, setShowDateToast] = useState(false);

  const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Bonus', 'Gift'];
  const activeCategories = transactionType === 'income' ? incomeCategories : categories;

  // Sync defaultTxType from settings whenever it changes (and not in edit mode)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!editingTransaction) {
      setTransactionType(defaultTxType);
    }
  }, [defaultTxType, editingTransaction]);

  // Populate form when entering edit mode
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (editingTransaction) {
      setTitle(editingTransaction.title || '');
      setAmount(String(editingTransaction.amount || ''));
      setTransactionType(editingTransaction.type || 'expense');
      setCategory(normalizeCategoryName(editingTransaction.category) || categories[0] || 'Food');
      setDate(editingTransaction.dateString ? new Date(editingTransaction.timestamp || Date.now()).toISOString().split('T')[0] : today);
    } else {
      setTitle('');
      setAmount('');
      setTransactionType(defaultTxType);
      setCategory(categories[0] || 'Food');
      setDate(today);
    }
    setFieldErrors({ title: false, amount: false, message: '' });
  }, [editingTransaction]);

  // Sync category when type switches
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (editingTransaction) return; // don't reset when editing
    if (transactionType === 'income') {
      setCategory('Salary');
    } else {
      setCategory(categories[0] || 'Food');
    }
    setShowCategoryMenu(false);
  }, [transactionType, categories, editingTransaction]);

  // Auto-select newly added or renamed categories
  const [prevCategories, setPrevCategories] = useState(categories);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const newAdded = categories.find((c) => !prevCategories.includes(c));
    const removed = prevCategories.find((c) => !categories.includes(c));

    if (newAdded) {
      if (removed && category === removed) {
        setCategory(newAdded);
      } else if (!removed) {
        setCategory(newAdded);
      }
    } else if (removed && category === removed) {
      setCategory(categories[0] || 'Food');
    }
    setPrevCategories(categories);
  }, [categories, category, prevCategories]);

  const customCategories = categories.filter((item) => !defaultCategories.includes(item));

  const selectedCategory = activeCategories.includes(category)
    ? category
    : activeCategories[0] || 'Food';

  const resetErrors = () => setFieldErrors({ title: false, amount: false, message: '' });

  const handleAmountInputChange = (e) => {
    const rawValue = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(rawValue)) {
      setAmount(rawValue);
      if (fieldErrors.amount) resetErrors();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    resetErrors();
    const cleanTitle = title.trim();
    const numericAmount = parseFloat(amount);
    if (!cleanTitle) { setFieldErrors({ title: true, amount: false, message: 'Transaction title cannot be empty.' }); return; }
    if (isNaN(numericAmount) || numericAmount <= 0) { setFieldErrors({ title: false, amount: true, message: 'Value must be a positive number greater than zero.' }); return; }

    onSaveTransaction({
      ...(isEditMode ? { id: editingTransaction.id } : {}),
      title: cleanTitle,
      amount: numericAmount,
      category: selectedCategory,
      type: transactionType,
      date: isUnlocked ? date : today,
    });

    if (!isEditMode) {
      setTitle('');
      setAmount('');
      setTransactionType(defaultTxType);
      setDate(today);
    }
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md animate-fadeIn">

      {/* Header — changes based on mode */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold tracking-tight text-slate-300">
            {isEditMode ? 'Edit Transaction' : 'Log New Transaction'}
          </h3>
          {isEditMode && (
            <p className="text-[10px] text-slate-500 mt-0.5">Make your changes then hit Update.</p>
          )}
        </div>
        {isEditMode && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors"
          >
            ✕ Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fieldErrors.message && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-400 font-medium">
            ! {fieldErrors.message}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Description Title</label>
          <input
            type="text"
            placeholder="e.g., Grocery shopping, Weekly stipend"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-colors ${fieldErrors.title ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500/50'}`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Transaction Amount ({currencySymbol})</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountInputChange}
            className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-700 focus:outline-none transition-colors ${fieldErrors.amount ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500/50'}`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Transaction Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTransactionType('expense')}
              className={`rounded-xl px-4 py-3 text-xs font-bold border transition-all ${transactionType === 'expense' ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
              Expense
            </button>
            <button type="button" onClick={() => setTransactionType('income')}
              className={`rounded-xl px-4 py-3 text-xs font-bold border transition-all ${transactionType === 'income' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
              Income
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Category Label</label>
            {transactionType !== 'income' && (
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCategoryManager((v) => !v)}
                  className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors">
                  Manage
                </button>
                <button type="button" onClick={onSaveCategory}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-355 transition-colors">
                  + New Tag
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button type="button" onClick={() => setShowCategoryMenu((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-left text-xs text-slate-300 transition-colors hover:border-slate-700 focus:outline-none focus:border-emerald-500/50">
              <span>{selectedCategory}</span>
              <span className="text-slate-500">{showCategoryMenu ? '▲' : '▼'}</span>
            </button>
            {showCategoryMenu && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
                {activeCategories.map((cat) => (
                  <button key={cat} type="button"
                    onClick={() => { setCategory(cat); setShowCategoryMenu(false); }}
                    className={`block w-full px-3.5 py-2.5 text-left text-xs transition-colors ${selectedCategory === cat ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-300 hover:bg-slate-900'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {transactionType !== 'income' && showCategoryManager && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom Categories</p>
            {customCategories.length === 0 ? (
              <p className="text-[11px] text-slate-500">No custom categories yet.</p>
            ) : (
              <div className="space-y-2">
                {customCategories.map((cat) => (
                  <div key={cat} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-semibold text-slate-300">{cat}</span>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => onRenameCategory(cat)}
                          className="rounded-md bg-slate-800/70 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:text-white">Edit</button>
                        <button type="button" onClick={() => onDeleteCategory(cat)}
                          className="rounded-md bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-300 hover:bg-red-500/20">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Date Picker ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>Transaction Date</span>
              {!isUnlocked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold tracking-wide">
                  🔒 LOCKED
                </span>
              )}
              {isUnlocked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold tracking-wide">
                  ✦ ACTIVE
                </span>
              )}
            </label>
          </div>

          <div className="relative">
            {/* Glow effect when unlocked */}
            {isUnlocked && (
              <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/20 blur-sm pointer-events-none" />
            )}
            <div className={`relative flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all
              ${isUnlocked
                ? 'border-emerald-500/30 bg-slate-950 hover:border-emerald-500/50'
                : 'border-slate-800 bg-slate-950/50 opacity-60 cursor-not-allowed'}`}>
              {/* Calendar icon */}
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0
                ${isUnlocked ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {isUnlocked ? (
                  <input
                    type="date"
                    value={date}
                    min={minDate}
                    max={today}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setShowDateToast(true);
                      setTimeout(() => setShowDateToast(false), 2000);
                    }}
                    className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer [color-scheme:dark]"
                  />
                ) : (
                  <div
                    className="text-xs text-slate-500 cursor-not-allowed select-none"
                    onClick={() => { setShowDateToast(true); setTimeout(() => setShowDateToast(false), 2500); }}
                  >
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              {!isUnlocked && (
                <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
            </div>
          </div>

          {/* Locked hint */}
          {!isUnlocked && (
            <p className="text-[10px] text-slate-600 flex items-center gap-1 pl-0.5">
              <span className="text-amber-500/70">⚡</span>
              Post your first transaction to unlock custom date selection.
            </p>
          )}

          {/* Unlocked hint */}
          {isUnlocked && date !== today && (
            <p className="text-[10px] text-emerald-500/70 flex items-center gap-1 pl-0.5">
              <span>✦</span>
              Backdating to {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* ── Date Toast ─────────────────────────────────────────────────────── */}
        {showDateToast && (
          <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold border animate-fadeIn
            ${isUnlocked
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
            {isUnlocked
              ? <>✓ Date set to {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</>
              : <>🔒 Post your first transaction to unlock date selection</>}
          </div>
        )}

        <button type="submit"
          className={`w-full font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-lg active:scale-[0.99] mt-2 ${
            isEditMode
              ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}>
          {isEditMode ? '✓ Update Transaction' : 'Post Transaction Entry'}
        </button>
      </form>
    </div>
  );
}
