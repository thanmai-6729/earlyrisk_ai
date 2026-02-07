export default function AdviceList({ advice }) {
  const items = Array.isArray(advice) ? advice : [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        <span className="material-symbols-outlined align-middle mr-2 text-primary">tips_and_updates</span>
        AI-Generated Advice
      </h3>

      {items.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No high/medium-risk advice triggered for this snapshot.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((a, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-lg mt-0.5 flex-shrink-0">
                check_circle
              </span>
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">{a.disease}:</span>{' '}
                <span className="text-slate-600 dark:text-slate-300">{a.advice}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
