import { useState } from 'react';
import { normalizeCategoryName, getCategoryColor } from '../utils/categories';

function PieChart({ data, total, currencySymbol = '₹' }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const cx = 100, cy = 100, outerR = 80, innerR = 55, gap = 0.018;
  const size = 200;

  const polar = (angle, r) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];

  const slicePath = (start, end, outer, inner) => {
    const [x1, y1] = polar(start, outer);
    const [x2, y2] = polar(end, outer);
    const [x3, y3] = polar(end, inner);
    const [x4, y4] = polar(start, inner);
    const large = (end - start) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
  };

  const slices = [];
  let cumAngle = -Math.PI / 2;
  data.forEach((item, i) => {
    const fraction = item.value / total;
    const sweep = fraction * 2 * Math.PI - gap;
    const startAngle = cumAngle;
    const endAngle = cumAngle + sweep;
    const midAngle = startAngle + sweep / 2;
    cumAngle += fraction * 2 * Math.PI;
    slices.push({ ...item, fraction, startAngle, endAngle, midAngle, index: i, color: getCategoryColor(item.name) });
  });

  const hovered = hoveredSlice !== null ? slices[hoveredSlice] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <defs>
          <filter id="pie-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.3)" />
          </filter>
        </defs>
        {slices.map((s, i) => {
          const isHovered = hoveredSlice === i;
          const tx = isHovered ? Math.cos(s.midAngle) * 6 : 0;
          const ty = isHovered ? Math.sin(s.midAngle) * 6 : 0;
          return (
            <path
              key={s.name}
              d={slicePath(s.startAngle, s.endAngle, outerR, innerR)}
              fill={s.color.solid}
              stroke="#0b1329"
              strokeWidth="2"
              style={{
                transform: `translate(${tx}px, ${ty}px)`,
                transformOrigin: `${cx}px ${cy}px`,
                opacity: hoveredSlice !== null && !isHovered ? 0.35 : 1,
                filter: isHovered ? 'url(#pie-shadow)' : 'none',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredSlice(i)}
              onMouseLeave={() => setHoveredSlice(null)}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={innerR - 1} fill="#0b1329" />
        {hovered ? (
          <>
            <text x={cx} y={cy - 8} textAnchor="middle" fill={hovered.color.solid}
              fontSize="9" fontWeight="600" fontFamily="Inter,sans-serif">
              {hovered.name.length > 12 ? hovered.name.slice(0, 11) + '…' : hovered.name}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill="#f1f5f9"
              fontSize="13" fontWeight="700" fontFamily="Inter,sans-serif">
              {currencySymbol}{hovered.value.toLocaleString('en-IN')}
            </text>
            <text x={cx} y={cy + 22} textAnchor="middle" fill="#94a3b8"
              fontSize="10" fontFamily="Inter,sans-serif">
              {(hovered.fraction * 100).toFixed(1)}%
            </text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" fill="#475569"
              fontSize="8" fontWeight="600" fontFamily="Inter,sans-serif" letterSpacing="0.8">
              TOTAL SPENT
            </text>
            <text x={cx} y={cy + 13} textAnchor="middle" fill="#f1f5f9"
              fontSize="14" fontWeight="700" fontFamily="Inter,sans-serif">
              {currencySymbol}{total.toLocaleString('en-IN')}
            </text>
          </>
        )}
      </svg>

      <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1">
        {slices.map((s) => (
          <div
            key={s.name}
            onMouseEnter={() => setHoveredSlice(s.index)}
            onMouseLeave={() => setHoveredSlice(null)}
            className="flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-all"
            style={{
              background: hoveredSlice === s.index ? 'rgba(255,255,255,0.04)' : 'transparent',
              opacity: hoveredSlice !== null && hoveredSlice !== s.index ? 0.35 : 1,
              transition: 'opacity 0.18s ease, background 0.15s ease',
            }}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color.solid }} />
            <span className="text-[11px] text-slate-400 truncate flex-1">{s.name}</span>
            <span className="text-[11px] font-semibold shrink-0" style={{ color: s.color.solid }}>
              {(s.fraction * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      <div className="w-full border-t border-slate-800/50 pt-3">
        {hovered ? (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: hovered.color.solid }} />
              <span className="text-xs text-slate-300 font-medium">{hovered.name}</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {currencySymbol}{hovered.value.toLocaleString('en-IN')}
              <span className="ml-2 font-semibold" style={{ color: hovered.color.solid }}>
                {(hovered.fraction * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        ) : (
          <p className="text-[10px] text-slate-600 text-center">Tap or hover a slice for details</p>
        )}
      </div>
    </div>
  );
}

// ─── Category Budget Progress card ────────────────────────────────────────────
function CategoryBudgetsCard({ categories, categoryBudgets, categorySpend, currencySymbol, onCategoryBudgetChange }) {
  const categoriesWithBudget    = categories.filter((c) => categoryBudgets[c] > 0);
  const categoriesWithoutBudget = categories.filter((c) => !(categoryBudgets[c] > 0));

  if (categoriesWithBudget.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-slate-400 mb-1">No category budgets set yet.</p>
        <p className="text-[10px] text-slate-600">Go to Settings → Category Budgets to set limits.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categoriesWithBudget.map((cat) => {
        const color   = getCategoryColor(cat);
        const limit   = categoryBudgets[cat];
        const spent   = categorySpend[cat] || 0;
        const pct     = Math.min(100, (spent / limit) * 100);
        const isOver  = spent > limit;
        const barColor = isOver ? '#ef4444' : pct >= 75 ? '#f59e0b' : color.solid;

        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color.solid }} />
                <span className="text-xs font-semibold text-slate-300">{cat}</span>
                {isOver && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                    OVER
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                <span style={{ color: barColor }}>{currencySymbol}{spent.toLocaleString('en-IN')}</span>
                <span className="text-slate-600"> / </span>
                {currencySymbol}{limit.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800/60">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
            <p className="text-[9px] text-slate-600 mt-1 text-right">{pct.toFixed(1)}% used</p>
          </div>
        );
      })}

      {categoriesWithoutBudget.length > 0 && (
        <div className="border-t border-slate-800/50 pt-3 mt-1">
          <p className="text-[9px] text-slate-600 uppercase font-bold tracking-wider mb-2">No limit set</p>
          <div className="flex flex-wrap gap-2">
            {categoriesWithoutBudget.map((cat) => {
              const color = getCategoryColor(cat);
              return (
                <div key={cat} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/50">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color.solid }} />
                  <span className="text-[10px] text-slate-500">{cat}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatusTab({
  transactions = [],
  categoryBudgets = {},
  categories = [],
  onCategoryBudgetChange,
  dataLoading = false,
  currencySymbol = '₹',
}) {
  const expenseTransactions = transactions.filter((item) => item.type !== 'income');
  const totalSpent = expenseTransactions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const categoryMetrics = expenseTransactions.reduce((acc, item) => {
    const cat = normalizeCategoryName(item.category);
    acc[cat] = (acc[cat] || 0) + (parseFloat(item.amount) || 0);
    return acc;
  }, {});

  const pieData = Object.entries(categoryMetrics)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Financial insights
  const largestExpense = expenseTransactions.reduce(
    (largest, item) => (parseFloat(item.amount) || 0) > (parseFloat(largest?.amount) || 0) ? item : largest,
    null
  );
  const topCategory   = pieData.length > 0 ? pieData[0] : null;
  const averageExpense = expenseTransactions.length > 0 ? totalSpent / expenseTransactions.length : 0;
  const totalIncome   = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const savingsRate   = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

  const currentMonth = new Date().getMonth();
  const currentYear  = new Date().getFullYear();

  const currentMonthExpenses = expenseTransactions
    .filter((t) => {
      const d = t.timestamp ? new Date(t.timestamp) : new Date(t.dateString);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const previousMonthExpenses = expenseTransactions
    .filter((t) => {
      const d = t.timestamp ? new Date(t.timestamp) : new Date(t.dateString);
      const pm = currentMonth === 0 ? 11 : currentMonth - 1;
      const py = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getMonth() === pm && d.getFullYear() === py;
    })
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const monthlyChange = previousMonthExpenses > 0
    ? ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
    : 0;

  // Budget health based on category budgets
  const categoriesWithBudget = categories.filter((c) => categoryBudgets[c] > 0);
  const overBudgetCount = categoriesWithBudget.filter((c) => (categoryMetrics[c] || 0) > categoryBudgets[c]).length;
  const nearLimitCount  = categoriesWithBudget.filter((c) => {
    const pct = (categoryMetrics[c] || 0) / categoryBudgets[c] * 100;
    return pct >= 75 && pct < 100;
  }).length;

  let budgetHealth = { label: 'No Budgets', color: 'text-slate-400' };
  if (categoriesWithBudget.length > 0) {
    if (overBudgetCount > 0)    budgetHealth = { label: `${overBudgetCount} Over Limit`, color: 'text-red-400' };
    else if (nearLimitCount > 0) budgetHealth = { label: `${nearLimitCount} Near Limit`, color: 'text-amber-400' };
    else                         budgetHealth = { label: 'All On Track', color: 'text-emerald-400' };
  }

  if (dataLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
          <div className="h-2 w-32 bg-slate-800 rounded-full mb-5" />
          <div className="space-y-4">
            <div className="h-10 bg-slate-800 rounded-xl" />
            <div className="h-10 bg-slate-800 rounded-xl" />
            <div className="h-10 bg-slate-800 rounded-xl" />
          </div>
        </div>
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
          <div className="h-2 w-32 bg-slate-800 rounded-full mb-5" />
          <div className="flex justify-center"><div className="w-40 h-40 bg-slate-800 rounded-full" /></div>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <div className="h-6 bg-slate-800 rounded-lg" />
            <div className="h-6 bg-slate-800 rounded-lg" />
          </div>
        </div>
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
          <div className="h-2 w-36 bg-slate-800 rounded-full mb-5" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-14 bg-slate-800 rounded-xl" />
            <div className="h-14 bg-slate-800 rounded-xl" />
            <div className="h-14 bg-slate-800 rounded-xl" />
          </div>
        </div>
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
          <div className="h-2 w-28 bg-slate-800 rounded-full mb-5" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-slate-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Category Budgets card ─────────────────────────────────────────── */}
      <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Category Budgets</h3>
          <span className={`text-[10px] font-bold ${budgetHealth.color}`}>{budgetHealth.label}</span>
        </div>
        <CategoryBudgetsCard
          categories={categories.filter((c) => !['Salary', 'Freelance', 'Investment', 'Bonus', 'Gift'].includes(c))}
          categoryBudgets={categoryBudgets}
          categorySpend={categoryMetrics}
          currencySymbol={currencySymbol}
          onCategoryBudgetChange={onCategoryBudgetChange}
        />
      </div>

      {/* ── Spending breakdown pie chart ──────────────────────────────────── */}
      <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-4">Spending Breakdown</h3>
        {pieData.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-8">No spending data yet.</p>
        ) : (
          <PieChart data={pieData} total={totalSpent} currencySymbol={currencySymbol} />
        )}
      </div>

      {/* ── Monthly comparison ────────────────────────────────────────────── */}
      <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-4">Monthly Comparison</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[9px] uppercase text-slate-500 font-bold">This Month</p>
            <p className="text-sm font-bold text-slate-200 mt-1">{currencySymbol}{currentMonthExpenses.toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Last Month</p>
            <p className="text-sm font-bold text-slate-200 mt-1">{currencySymbol}{previousMonthExpenses.toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Change</p>
            <p className={`text-sm font-bold mt-1 ${monthlyChange <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* ── Financial insights ────────────────────────────────────────────── */}
      <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-4">Financial Insights</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Largest Expense</p>
            <p className="text-sm font-bold text-red-300 mt-1">
              {currencySymbol}{largestExpense ? parseFloat(largestExpense.amount).toLocaleString('en-IN') : '0'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Largest Purchase</p>
            <p className="text-sm font-bold text-slate-200 mt-1 truncate">{largestExpense?.title || 'None'}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Top Category</p>
            <p className="text-sm font-bold text-emerald-300 mt-1 truncate">{topCategory?.name || 'None'}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Avg Expense</p>
            <p className="text-sm font-bold text-slate-200 mt-1">
              {currencySymbol}{averageExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Savings Rate</p>
            <p className="text-sm font-bold text-emerald-300 mt-1">{Math.max(0, savingsRate).toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Budget Health</p>
            <p className={`text-sm font-bold mt-1 ${budgetHealth.color}`}>{budgetHealth.label}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
