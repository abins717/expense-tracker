export default function BalanceCounter({ transactions, dataLoading, currencySymbol = '₹' }) {
  const totalIncome = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const totalExpense = transactions
    .filter((item) => item.type !== 'income')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const balance = totalIncome - totalExpense;


  if (dataLoading) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 px-5 py-5 shadow-[0_0_40px_rgba(16,185,129,0.08)] animate-pulse">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="h-2.5 w-24 bg-slate-800 rounded-full mb-3" />
            <div className="h-9 w-44 bg-slate-800 rounded-xl mb-4" />
            <div className="flex gap-3">
              <div className="h-12 w-28 bg-slate-800 rounded-xl" />
              <div className="h-12 w-28 bg-slate-800 rounded-xl" />
            </div>
          </div>
          <div className="h-14 w-16 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 px-5 py-5 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_35%)]"></div>

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/90 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Current Balance
          </p>

          <h2
  className={`text-4xl font-extrabold tracking-tight mt-2 ${
    balance >= 0 ? 'text-emerald-300' : 'text-red-300'
  }`}
>
  {currencySymbol}
  {balance.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  })}
</h2>

          <div className="flex gap-3 mt-5">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3 py-2">
              <p className="text-[9px] uppercase font-bold text-emerald-400">
                Income
              </p>

              <p className="text-sm font-bold text-emerald-300">
                {currencySymbol}{totalIncome.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-3 py-2">
              <p className="text-[9px] uppercase font-bold text-red-400">
                Expenses
              </p>

              <p className="text-sm font-bold text-red-300">
                {currencySymbol}{totalExpense.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-right">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Total Logs
          </span>

          <span className="font-mono font-bold text-slate-200 text-lg">
            {transactions.length}
          </span>
        </div>
      </div>
    </div>
  );
}