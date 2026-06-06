import { useState } from 'react';
import { normalizeCategoryName } from '../utils/categories';

export default function HistoryTimeline({
  groupedTimelineDataset,
  transactionsCount,
  transactions,
  onDeleteTransaction,
  onEditTransaction,
  currencySymbol
}) {

  const [searchTerm, setSearchTerm] = useState('');

  if (transactionsCount === 0) {
    return (
      <div className="bg-slate-900/40 border border-dashed border-slate-800/80 rounded-2xl p-12 text-center animate-fadeIn">
        <p className="text-slate-500 text-xs font-medium">No transactions added yet.</p>
      </div>
    );
  }

  const allTransactions = Object.values(groupedTimelineDataset).flat();

  const hasResults =
    searchTerm.trim() === '' ||
    allTransactions.some((item) => {
      const search = searchTerm.toLowerCase();
      return (
        item.title?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search) ||
        item.amount?.toString().includes(search)
      );
    });

  return (
    <div className="space-y-4">

      {/* Search row */}
      <div className="animate-fadeIn">
        <div className="relative">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* No Results */}
      {!hasResults && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center animate-fadeIn">
          <p className="text-slate-500 text-xs">No matching transactions found.</p>
        </div>
      )}

      {Object.keys(groupedTimelineDataset).map((timelineKey) => {
        const chronologicalItems = groupedTimelineDataset[timelineKey];

        const filteredItems = chronologicalItems.filter((item) => {
          if (!searchTerm.trim()) return true;
          const search = searchTerm.toLowerCase();
          return (
            item.title?.toLowerCase().includes(search) ||
            item.category?.toLowerCase().includes(search) ||
            item.amount?.toString().includes(search)
          );
        });

        if (filteredItems.length === 0) return null;

        return (
          <div key={timelineKey} className="space-y-2.5 animate-fadeIn">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 border-l border-emerald-500/60 pl-2">
              {timelineKey}
            </h4>

            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden divide-y divide-slate-800/50 shadow-md">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-900/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 max-w-[90px] truncate select-none">
                      {normalizeCategoryName(item.category)}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{item.title}</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : item.dateString}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`text-xs font-bold font-mono ${item.type === 'income' ? 'text-emerald-300' : 'text-red-300'}`}>
                      {item.type === 'income' ? '+' : '-'}
                        {currencySymbol}
                        {parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2})}
                    </span>

                    {/* Edit button */}
                    <button
                      onClick={() => onEditTransaction(item)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all focus:outline-none"
                      title="Edit transaction"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414A2 2 0 018.586 12.5z" />
                      </svg>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteTransaction(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all focus:outline-none"
                      title="Delete transaction"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Export Modal */}
    </div>
  );
}
