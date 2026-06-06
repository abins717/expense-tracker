import { useState } from 'react';
import ExportModal from './ExportModal';
import { getCategoryColor } from '../utils/categories';

// ─── Currency options ─────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
];

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon, title, subtitle, children }) {
  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/60">
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-sm shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-200">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Row item ─────────────────────────────────────────────────────────────────
function SettingRow({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-300">{label}</p>
        {hint && <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Pill selector ────────────────────────────────────────────────────────────
function PillSelector({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all
            ${value === opt.value
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Profile avatar ───────────────────────────────────────────────────────────
function Avatar({ name, isGuest }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  return (
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shadow-lg
      ${isGuest
        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400'
        : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400'}`}>
      {initials}
    </div>
  );
}

// ─── Main Settings Tab ────────────────────────────────────────────────────────
export default function SettingsTab({
  user,
  isGuest,
  transactions,
  currency,
  currencySymbol,
  onCurrencyChange,
  defaultTxType,
  onDefaultTxTypeChange,
  categories = [],
  categoryBudgets = {},
  onCategoryBudgetChange,
  displayName,
  onDisplayNameChange,
  onClearData,
  onSignOut,
}) {
  const [showExport, setShowExport] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName || '');
  // Local draft inputs for each category budget — keyed by category name
  const [budgetInputs, setBudgetInputs] = useState(() => {
    const init = {};
    categories.forEach((c) => { init[c] = categoryBudgets[c] ? String(categoryBudgets[c]) : ''; });
    return init;
  });
  // Which categories are currently in edit mode
  const [editingBudgets, setEditingBudgets] = useState({});
  // Toast notification
  const [toast, setToast] = useState(null);
  // Currency change confirmation dialog
  const [pendingCurrency, setPendingCurrency] = useState(null);

  const MAX_BUDGET = 9999999;

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleNameSave = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      onDisplayNameChange(trimmed);
      showToast(`Display name updated to "${trimmed}"`);
    }
    setEditingName(false);
  };

  const handleBudgetEdit = (cat) => {
    setBudgetInputs((prev) => ({ ...prev, [cat]: categoryBudgets[cat] ? String(categoryBudgets[cat]) : '' }));
    setEditingBudgets((prev) => ({ ...prev, [cat]: true }));
  };

  const handleBudgetSave = (cat) => {
    const val = budgetInputs[cat];
    onCategoryBudgetChange(cat, val);
    setEditingBudgets((prev) => ({ ...prev, [cat]: false }));
    if (!val || Number(val) === 0) {
      showToast(`Budget limit removed for ${cat}`);
    } else {
      showToast(`Budget set to ${currencySymbol}${Number(val).toLocaleString()} for ${cat} ✓`);
    }
  };

  const handleCurrencyClick = (code) => {
    if (code === currency) return;
    setPendingCurrency(code);
  };

  const confirmCurrencyChange = () => {
    onCurrencyChange(pendingCurrency);
    setPendingCurrency(null);
    const c = CURRENCIES.find((x) => x.code === pendingCurrency);
    showToast(`Currency changed to ${c?.code} ${c?.symbol}`);
  };


  return (
    <div className="space-y-5 animate-fadeIn pb-4">

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold bg-emerald-500/90 text-slate-950 border border-emerald-400/40 backdrop-blur-md">
          ✓ {toast}
        </div>
      )}

      {/* ── Currency confirmation dialog ─────────────────────────────────────── */}
      {pendingCurrency && (() => {
        const next = CURRENCIES.find((x) => x.code === pendingCurrency);
        const current = CURRENCIES.find((x) => x.code === currency);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
            <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg shrink-0">
                  ⚠️
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">Change Currency?</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">This only changes the symbol</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-700/60">
                Switching from <span className="text-slate-200 font-semibold">{current?.symbol} {current?.code}</span> to <span className="text-slate-200 font-semibold">{next?.symbol} {next?.code}</span> will only update the currency symbol. <span className="text-amber-400">Your transaction amounts will not be converted.</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingCurrency(null)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCurrencyChange}
                  className="flex-1 px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
                >
                  Yes, Switch
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Profile card ────────────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-800/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        {/* Subtle glow */}
        <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20
          ${isGuest ? 'bg-amber-500' : 'bg-emerald-500'}`} />

        <div className="flex items-center gap-4 relative z-10">
          <Avatar name={displayName || user?.displayName || 'Guest'} isGuest={isGuest} />
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false); }}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/60 min-w-0"
                  placeholder="Enter display name"
                  maxLength={30}
                />
                <button onClick={handleNameSave}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors shrink-0">
                  ✓
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white truncate">
                  {displayName || user?.displayName || 'Guest User'}
                </p>
                <button onClick={() => { setNameInput(displayName || user?.displayName || ''); setEditingName(true); }}
                  className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414A2 2 0 018.586 12.5z" />
                  </svg>
                </button>
              </div>
            )}
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{user?.email || 'guest@local'}</p>
            <span className={`inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full
              ${isGuest
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {isGuest ? 'Guest Session' : 'Google Account'}
            </span>
          </div>
        </div>

        {isGuest && (
          <div className="mt-4 flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2.5 relative z-10">
            <span className="text-amber-400 text-xs shrink-0 mt-0.5">⚠</span>
            <p className="text-[10px] text-amber-400/80 leading-relaxed">
              Guest data is stored locally. Sign in with Google to sync across devices.
            </p>
          </div>
        )}
      </div>

      {/* ── Preferences ─────────────────────────────────────────────────────── */}
      <Section icon="🌐" title="Currency" subtitle="Applies to all amounts displayed in the app">
        <div className="grid grid-cols-2 gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleCurrencyClick(c.code)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all
                ${currency === c.code
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
            >
              <span className={`text-base font-bold w-6 text-center shrink-0
                ${currency === c.code ? 'text-emerald-400' : 'text-slate-500'}`}>
                {c.symbol}
              </span>
              <div className="min-w-0">
                <p className={`text-[11px] font-bold truncate ${currency === c.code ? 'text-slate-100' : 'text-slate-400'}`}>
                  {c.code}
                </p>
                <p className="text-[9px] text-slate-600 truncate">{c.label}</p>
              </div>
              {currency === c.code && (
                <span className="ml-auto text-emerald-400 text-xs shrink-0">✓</span>
              )}
            </button>
          ))}
        </div>
      </Section>

      <Section icon="📝" title="Record Defaults" subtitle="Pre-select options when opening the Record tab">
        <SettingRow label="Default Transaction Type" hint="Which type is pre-selected when you open Record">
          <PillSelector
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
            value={defaultTxType}
            onChange={(val) => { onDefaultTxTypeChange(val); showToast(`Default set to ${val.charAt(0).toUpperCase() + val.slice(1)}`); }}
          />
        </SettingRow>
      </Section>

      <Section icon="🎯" title="Category Budgets" subtitle="Set monthly spending limits per category">
        <div className="space-y-3">
          {categories
            .filter((c) => !['Salary', 'Freelance', 'Investment', 'Bonus', 'Gift'].includes(c))
            .map((cat) => {
              const color = getCategoryColor(cat);
              const hasLimit = categoryBudgets[cat] > 0;
              const isEditing = editingBudgets[cat];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color.solid }} />
                  <span className="text-xs text-slate-300 flex-1 font-medium">{cat}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditing ? (
                      <>
                        <span className="text-[10px] text-slate-500">{currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          max={MAX_BUDGET}
                          autoFocus
                          placeholder="No limit"
                          value={budgetInputs[cat] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.min(MAX_BUDGET, Math.max(0, Number(e.target.value)));
                            setBudgetInputs((prev) => ({ ...prev, [cat]: val === '' ? '' : String(val) }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleBudgetSave(cat);
                            if (e.key === 'Escape') setEditingBudgets((p) => ({ ...p, [cat]: false }));
                          }}
                          className="w-24 text-right bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => handleBudgetSave(cat)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors shrink-0"
                          title="Save"
                        >
                          ✓
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`text-xs font-mono ${hasLimit ? 'text-slate-300' : 'text-slate-600'}`}>
                          {hasLimit ? `${currencySymbol}${Number(categoryBudgets[cat]).toLocaleString()}` : 'No limit'}
                        </span>
                        <button
                          onClick={() => handleBudgetEdit(cat)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-500 hover:text-emerald-400 hover:bg-slate-700 transition-colors shrink-0"
                          title="Edit budget"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414A2 2 0 018.586 12.5z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
        <p className="text-[10px] text-slate-600 pt-1">Leave blank or set 0 to remove a category's limit.</p>
      </Section>

      {/* ── Data & Export ────────────────────────────────────────────────────── */}
      <Section icon="📊" title="Data & Export" subtitle="Manage and export your transaction data">

        <button
          onClick={() => setShowExport(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-200">Export Transactions</p>
              <p className="text-[10px] text-slate-500">Download as CSV or PDF</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: 'Transactions', value: transactions.length },
            { label: 'Income', value: transactions.filter((t) => t.type === 'income').length },
            { label: 'Expenses', value: transactions.filter((t) => t.type !== 'income').length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
              <p className="text-sm font-bold text-slate-200">{s.value}</p>
              <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Danger zone ──────────────────────────────────────────────────────── */}
      <Section icon="⚠️" title="Danger Zone" subtitle="Irreversible actions — proceed with caution">
        <button
          onClick={onClearData}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-red-400">Clear All Data</p>
              <p className="text-[10px] text-slate-500">Permanently delete all transactions</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-600 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-300">Sign Out</p>
              <p className="text-[10px] text-slate-500">{isGuest ? 'Clears all guest data permanently' : 'Return to login screen'}</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </Section>

      {/* App version */}
      <p className="text-center text-[10px] text-slate-700 font-medium pb-2">
        Expense Tracker · v1.0.0
      </p>

      {showExport && (
        <ExportModal
  transactions={transactions}
  onClose={() => setShowExport(false)}
  currencySymbol={currencySymbol} />
      )}
    </div>
  );
}
