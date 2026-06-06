import { useState, useMemo } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toYMD = (date) => {
  // Use local date parts to avoid UTC offset shifting the date (critical for IST users)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseYMD = (str) => {
  // Parse "YYYY-MM-DD" as local date (not UTC)
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const daysBetween = (a, b) =>
  Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));

const fmtDisplay = (dateObj) =>
  dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Format a transaction's date consistently from timestamp (fallback to dateString)
const formatTxDate = (t) => {
  if (t.timestamp) return new Date(t.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (t.dateString) return t.dateString;
  return '-';
};

// ─── PDF generator ────────────────────────────────────────────────────────────

function generatePDF(filtered, dateLabel, typeLabel, currencySymbol, typeFilter) {
  currencySymbol = currencySymbol || '₹';
  const fmt = (t) =>
  (t.type === 'income' ? '+' : '-') +
  currencySymbol +
  parseFloat(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const totalIncome  = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpense = filtered.filter((t) => t.type !== 'income').reduce((s, t) => s + parseFloat(t.amount), 0);

  const rows = filtered.map((t, i) => `
    <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
      <td>${i + 1}</td>
      <td>${t.title || '-'}</td>
      <td class="${t.type === 'income' ? 'income' : 'expense'}">${t.type === 'income' ? 'Income' : 'Expense'}</td>
      <td>${t.category || '-'}</td>
      <td class="${t.type === 'income' ? 'income' : 'expense'} amount">${fmt(t)}</td>
      <td>${formatTxDate(t)}</td>
    </tr>`).join('');

  const generatedOn = new Date().toLocaleString('en-IN');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Expense Report — ${dateLabel}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1e293b;padding:32px}
  .header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;border-bottom:2px solid #10b981;padding-bottom:16px}
  .brand{display:flex;align-items:center;gap:10px}
  .brand-icon{width:36px;height:36px;background:#10b981;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:800}
  .brand-name{font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-.5px}
  .brand-sub{font-size:11px;color:#64748b;margin-top:2px}
  .meta{text-align:right;font-size:11px;color:#64748b;line-height:1.8}
  .meta strong{color:#1e293b}
  .summary{display:flex;gap:16px;margin-bottom:24px}
  .card{flex:1;border-radius:10px;padding:14px 18px}
  .card.total{background:#f1f5f9;border:1px solid #e2e8f0}
  .card.inc{background:#ecfdf5;border:1px solid #a7f3d0}
  .card.exp{background:#fff1f2;border:1px solid #fecdd3}
  .card-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:4px}
  .card-value{font-size:18px;font-weight:800;color:#0f172a}
  .card.inc .card-value{color:#059669}
  .card.exp .card-value{color:#e11d48}
  .filters{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
  .pill{font-size:10px;font-weight:600;padding:4px 10px;border-radius:99px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead tr{background:#0f172a}
  thead th{color:#94a3b8;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.8px;padding:10px 12px;text-align:left}
  thead th.amount{text-align:right}
  tbody tr.even{background:#fff}
  tbody tr.odd{background:#f8fafc}
  td{padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:middle}
  td.income{color:#059669;font-weight:600}
  td.expense{color:#e11d48;font-weight:600}
  td.amount{text-align:right;font-family:monospace;font-size:12px}
  .no-data{text-align:center;padding:32px;color:#94a3b8;font-size:13px}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
  @media print{body{padding:20px}@page{margin:16px}}
</style></head><body>
  <div class="header">
    <div class="brand">
      <div class="brand-icon">${currencySymbol}</div>
      <div><div class="brand-name">Expense Tracker</div><div class="brand-sub">Transaction Report</div></div>
    </div>
    <div class="meta">
      <div><strong>Period:</strong> ${dateLabel}</div>
      <div><strong>Filter:</strong> ${typeLabel}</div>
      <div><strong>Records:</strong> ${filtered.length}</div>
      <div><strong>Generated:</strong> ${generatedOn}</div>
    </div>
  </div>
  <div class="summary">
    ${typeFilter !== 'income' && typeFilter !== 'expense' ? `<div class="card total"><div class="card-label">Net Balance</div><div class="card-value">${currencySymbol}${(totalIncome - totalExpense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>` : ''}
    ${typeFilter !== 'expense' ? `<div class="card inc"><div class="card-label">Total Income</div><div class="card-value">${currencySymbol}${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>` : ''}
    ${typeFilter !== 'income' ? `<div class="card exp"><div class="card-label">Total Expenses</div><div class="card-value">${currencySymbol}${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>` : ''}
  </div>
  <div class="filters">
    <span class="pill">&#128197; ${dateLabel}</span>
    <span class="pill">&#9654; ${typeLabel}</span>
    <span class="pill">${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}</span>
  </div>
  <table>
    <thead><tr><th>#</th><th>Title</th><th>Type</th><th>Category</th><th class="amount">Amount</th><th>Date</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="no-data">No transactions match the selected filters.</td></tr>'}</tbody>
  </table>
  <div class="footer"><span>Expense Tracker — Confidential</span><span>Generated on ${generatedOn}</span></div>
  <script>window.onload=()=>{window.print();}</script>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ─── CSV generator ────────────────────────────────────────────────────────────

function generateCSV(filtered, dateLabel, currencySymbol, typeFilter) {
  currencySymbol = currencySymbol || '₹';
  const headers = ['#', 'Title', 'Type', 'Category', `Amount (${currencySymbol})`, 'Date'];
  const rows    = filtered.map((t, i) => [
    i + 1, t.title,
    t.type === 'income' ? 'Income' : 'Expense',
    t.category,
    `${currencySymbol}${parseFloat(t.amount).toFixed(2)}`,
    formatTxDate(t),
  ]);

  const totalIncome  = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpense = filtered.filter((t) => t.type !== 'income').reduce((s, t) => s + parseFloat(t.amount), 0);

  // Build summary rows based on filter — Option A: only show relevant totals
  const summaryRows = [];
  if (typeFilter !== 'expense') summaryRows.push(['', '', '', 'Total Income',   `${currencySymbol}${totalIncome.toFixed(2)}`,  '']);
  if (typeFilter !== 'income')  summaryRows.push(['', '', '', 'Total Expenses', `${currencySymbol}${totalExpense.toFixed(2)}`, '']);
  if (typeFilter !== 'income' && typeFilter !== 'expense')
    summaryRows.push(['', '', '', 'Net Balance', `${currencySymbol}${(totalIncome - totalExpense).toFixed(2)}`, '']);

  const csv = [
    headers, ...rows, [],
    ...summaryRows,
  ].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');

  // Prepend UTF-8 BOM (\uFEFF) so Excel correctly renders Unicode symbols (₹, €, £, etc.)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `expense-report-${dateLabel.replace(/\s+/g, '-').toLowerCase()}-${toYMD(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Filter transactions by a resolved {from, to} Date range ─────────────────

function filterByRange(transactions, from, to) {
  // Set to = end of that day
  const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999);
  return transactions.filter((t) => {
    const d = t.timestamp ? new Date(t.timestamp) : new Date(t.dateString);
    return d >= from && d <= toEnd;
  });
}

// ─── Resolve a quick-range preset to {from, to} Date objects ─────────────────

function resolvePreset(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  if (value === 'today')     return { from: today,     to: today };
  if (value === 'yesterday') return { from: yesterday, to: yesterday };
  if (value === 'last7') {
    const f = new Date(today); f.setDate(today.getDate() - 6);
    return { from: f, to: today };
  }
  if (value === 'last30') {
    const f = new Date(today); f.setDate(today.getDate() - 29);
    return { from: f, to: today };
  }
  if (value === 'thismonth') {
    const f = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: f, to: today };
  }
  if (value === 'lastmonth') {
    const f = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const t2 = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: f, to: t2 };
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepDot({ label, active, done }) {
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all
      ${done   ? 'bg-emerald-500 border-emerald-500 text-white'
      : active ? 'bg-slate-800 border-emerald-500 text-emerald-400'
               : 'bg-slate-900 border-slate-700 text-slate-600'}`}>
      {done ? '✓' : label}
    </div>
  );
}

function RadioOption({ value, selected, onChange, accent = 'emerald', children }) {
  const on = selected === value;
  return (
    <button type="button" onClick={() => onChange(value)}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all
        ${on
          ? accent === 'indigo'
            ? 'border-indigo-500/60 bg-indigo-500/10'
            : 'border-emerald-500/60 bg-emerald-500/10'
          : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'}`}>
      <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center
        ${on ? accent === 'indigo' ? 'border-indigo-400' : 'border-emerald-400' : 'border-slate-600'}`}>
        {on && <span className={`w-1.5 h-1.5 rounded-full ${accent === 'indigo' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />}
      </span>
      <span className={`text-xs font-medium ${on ? 'text-slate-100' : 'text-slate-400'}`}>{children}</span>
    </button>
  );
}

// ─── Step 2: Date selection ───────────────────────────────────────────────────

function DateStep({ transactions, dateVal, setDateVal, customFrom, setCustomFrom, customTo, setCustomTo }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Earliest transaction date in user's data
  const earliestTs = useMemo(() => {
    const ts = transactions.map((t) => t.timestamp || new Date(t.dateString).getTime()).filter(Boolean);
    return ts.length ? Math.min(...ts) : today.getTime();
  }, [transactions]);

  const earliestDate = useMemo(() => {
    const d = new Date(earliestTs);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [earliestTs]);
  const todayYMD     = toYMD(today);

  // Calendar min = 6 months back from today — user can freely pick any date in this window.
  // The live tx count feedback tells them if there's no data in that range.
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  const minYMD = toYMD(sixMonthsAgo);

  // Validation for custom range
  const customError = useMemo(() => {
    if (!customFrom || !customTo) return null;
    const f = parseYMD(customFrom);
    const t = parseYMD(customTo);
    if (f > t)           return 'Start date must be before end date.';
    if (daysBetween(f, t) > 183) return 'Range too large — max allowed is 6 months (183 days).';
    return null;
  }, [customFrom, customTo]);

  // Count how many transactions fall in the custom range (for live feedback)
  const customCount = useMemo(() => {
    if (!customFrom || !customTo || customError) return null;
    return filterByRange(transactions, parseYMD(customFrom), parseYMD(customTo)).length;
  }, [customFrom, customTo, customError, transactions]);

  // Preset options — only show presets that overlap with data the user actually has
  const presets = useMemo(() => {
    const opts = [];
    const pushIfData = (value, label) => {
      const range = resolvePreset(value);
      if (!range) return;
      // Check the range doesn't go before the earliest transaction
      if (range.to < earliestDate) return; // entire range is before first transaction
      const count = filterByRange(transactions, range.from, range.to).length;
      opts.push({ value, label, count });
    };
    pushIfData('today',     'Today');
    pushIfData('yesterday', 'Yesterday');
    pushIfData('last7',     'Last 7 Days');
    pushIfData('last30',    'Last 30 Days');
    pushIfData('thismonth', 'This Month');
    pushIfData('lastmonth', 'Last Month');
    return opts;
  }, [transactions, earliestDate]);

  const isCustomActive = dateVal === 'custom';

  const handlePreset = (v) => {
    setDateVal(v);
    setCustomFrom('');
    setCustomTo('');
  };

  const handleCustomFrom = (v) => {
    setCustomFrom(v);
    setDateVal('custom');
  };

  const handleCustomTo = (v) => {
    setCustomTo(v);
    setDateVal('custom');
  };

  return (
    <div className="space-y-2">
      {/* Info about data range */}
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-3">
        <span className="text-amber-400 text-xs">ℹ</span>
        <p className="text-[10px] text-slate-400">
          You can select any date range up to <span className="text-slate-200 font-semibold">6 months back</span> from today. Your earliest data is from <span className="text-slate-200 font-semibold">{fmtDisplay(earliestDate)}</span>.
        </p>
      </div>

      {/* Quick presets */}
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 px-0.5">Quick Select</p>
      {presets.length === 0 && (
        <p className="text-[11px] text-slate-500 px-1">No preset ranges have data yet.</p>
      )}
      {presets.map((opt) => (
        <button key={opt.value} type="button"
          onClick={() => handlePreset(opt.value)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all
            ${dateVal === opt.value
              ? 'border-emerald-500/60 bg-emerald-500/10'
              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'}`}>
          <span className="flex items-center gap-3">
            <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center
              ${dateVal === opt.value ? 'border-emerald-400' : 'border-slate-600'}`}>
              {dateVal === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </span>
            <span className={`text-xs font-medium ${dateVal === opt.value ? 'text-slate-100' : 'text-slate-400'}`}>
              {opt.label}
            </span>
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md
            ${opt.count === 0
              ? 'text-slate-600 bg-slate-800'
              : dateVal === opt.value
                ? 'text-emerald-300 bg-emerald-500/20'
                : 'text-slate-500 bg-slate-800'}`}>
            {opt.count} tx
          </span>
        </button>
      ))}

      {/* Divider */}
      <div className="flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">or custom range</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Custom date pickers */}
      <div className={`rounded-xl border p-3 space-y-2 transition-all
        ${isCustomActive ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/40'}`}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">From</label>
            <input type="date"
              value={customFrom}
              min={minYMD}
              max={customTo || todayYMD}
              onChange={(e) => handleCustomFrom(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">To</label>
            <input type="date"
              value={customTo}
              min={customFrom || minYMD}
              max={todayYMD}
              onChange={(e) => handleCustomTo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60 transition-colors"
            />
          </div>
        </div>

        {/* Validation error */}
        {customError && (
          <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-medium">
            <span>⚠</span> {customError}
          </div>
        )}

        {/* Live count feedback */}
        {!customError && customFrom && customTo && (
          <div className={`text-[10px] font-semibold flex items-center gap-1.5
            ${customCount === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {customCount === 0
              ? '⚠ No transactions in this range.'
              : `✓ ${customCount} transaction${customCount !== 1 ? 's' : ''} found in this range.`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Export Modal ────────────────────────────────────────────────────────

export default function ExportModal({ transactions = [], onClose, currencySymbol }) {
  const [step,       setStep]       = useState(0);
  const [format,     setFormat]     = useState(null);
  const [dateVal,    setDateVal]    = useState(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [typeVal,    setTypeVal]    = useState(null);

  // Resolve date selection to a label string
  const getDateLabel = () => {
    if (dateVal === 'custom' && customFrom && customTo) {
      return `${fmtDisplay(parseYMD(customFrom))} – ${fmtDisplay(parseYMD(customTo))}`;
    }
    const presetLabels = {
      today: 'Today', yesterday: 'Yesterday',
      last7: 'Last 7 Days', last30: 'Last 30 Days',
      thismonth: 'This Month', lastmonth: 'Last Month',
    };
    return presetLabels[dateVal] || '';
  };

  const getTypeLabel = () =>
    typeVal === 'both' ? 'Income & Expenses'
    : typeVal === 'income' ? 'Income Only' : 'Expenses Only';

  // Validate step 1 (date)
  const dateStepValid = useMemo(() => {
    if (!dateVal) return false;
    if (dateVal === 'custom') {
      if (!customFrom || !customTo) return false;
      const f = parseYMD(customFrom);
      const t = parseYMD(customTo);
      if (f > t) return false;
      if (daysBetween(f, t) > 183) return false;
      // Must have at least 1 transaction in range
      return filterByRange(transactions, f, t).length > 0;
    }
    // For presets: must have transactions in that range
    const range = resolvePreset(dateVal);
    if (!range) return false;
    return filterByRange(transactions, range.from, range.to).length > 0;
  }, [dateVal, customFrom, customTo, transactions]);

  const canNext = [!!format, dateStepValid, !!typeVal];

  const handleExport = () => {
    let filtered;
    if (dateVal === 'custom') {
      filtered = filterByRange(transactions, parseYMD(customFrom), parseYMD(customTo));
    } else {
      const range = resolvePreset(dateVal);
      filtered = filterByRange(transactions, range.from, range.to);
    }
    if (typeVal === 'income')  filtered = filtered.filter((t) => t.type === 'income');
    if (typeVal === 'expense') filtered = filtered.filter((t) => t.type !== 'income');

    if (format === 'csv') generateCSV(filtered, getDateLabel(), currencySymbol, typeVal);
    else                  generatePDF(filtered, getDateLabel(), getTypeLabel(), currencySymbol, typeVal);
    onClose();
  };

  const stepTitles = ['Choose Format', 'Select Date Range', 'Select Type'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white">Export Transactions</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">{stepTitles[step]}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs">✕</button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 px-5 py-3 border-b border-slate-800/60">
          <StepDot label="1" active={step === 0} done={step > 0} />
          <div className={`flex-1 h-px max-w-[40px] transition-colors ${step > 0 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          <StepDot label="2" active={step === 1} done={step > 1} />
          <div className={`flex-1 h-px max-w-[40px] transition-colors ${step > 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          <StepDot label="3" active={step === 2} done={step > 2} />
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">

          {/* Step 0 — Format */}
          {step === 0 && (
            <>
              <RadioOption value="csv" selected={format} onChange={setFormat}>
                <span className="flex flex-col">
                  <span className="font-semibold text-slate-200">CSV File</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Spreadsheet-compatible · opens in Excel / Sheets</span>
                </span>
              </RadioOption>
              <RadioOption value="pdf" selected={format} onChange={setFormat} accent="indigo">
                <span className="flex flex-col">
                  <span className="font-semibold text-slate-200">PDF Report</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Formatted report with summary · ready to print or share</span>
                </span>
              </RadioOption>
            </>
          )}

          {/* Step 1 — Date */}
          {step === 1 && (
            <DateStep
              transactions={transactions}
              dateVal={dateVal}       setDateVal={setDateVal}
              customFrom={customFrom} setCustomFrom={setCustomFrom}
              customTo={customTo}     setCustomTo={setCustomTo}
            />
          )}

          {/* Step 2 — Type */}
          {step === 2 && (
            <>
              <RadioOption value="both" selected={typeVal} onChange={setTypeVal}>
                <span className="flex flex-col">
                  <span className="font-semibold text-slate-200">Both</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Include income and expenses</span>
                </span>
              </RadioOption>
              <RadioOption value="expense" selected={typeVal} onChange={setTypeVal}>
                <span className="flex flex-col">
                  <span className="font-semibold text-slate-200">Expenses Only</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Only outgoing transactions</span>
                </span>
              </RadioOption>
              <RadioOption value="income" selected={typeVal} onChange={setTypeVal}>
                <span className="flex flex-col">
                  <span className="font-semibold text-slate-200">Income Only</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Only incoming transactions</span>
                </span>
              </RadioOption>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-800/60 flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-xs font-semibold hover:text-white hover:border-slate-600 transition-all">
              ← Back
            </button>
          )}

          {step < 2 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext[step]}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all
                ${canNext[step]
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
              Next →
            </button>
          ) : (
            <button onClick={handleExport} disabled={!canNext[2]}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all
                ${canNext[2]
                  ? format === 'pdf'
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
              {format === 'pdf' ? '⬇ Download PDF' : '⬇ Download CSV'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
