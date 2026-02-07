function getRiskLevel(pct) {
  const x = Number(pct);
  if (!Number.isFinite(x)) return { level: 'unknown', color: 'slate' };
  if (x < 35) return { level: 'low', color: 'green' };
  if (x < 70) return { level: 'medium', color: 'amber' };
  return { level: 'high', color: 'red' };
}

function formatPct(pct) {
  const x = Number(pct);
  if (!Number.isFinite(x)) return '—';
  return `${Math.round(x)}%`;
}

const riskItems = [
  { key: 'heartRisk', label: 'Heart', icon: 'favorite' },
  { key: 'liverRisk', label: 'Liver', icon: 'gastroenterology' },
  { key: 'diabetesRisk', label: 'Metabolic', icon: 'bloodtype' },
  { key: 'depressionRisk', label: 'Mental Health', icon: 'psychology' },
];

export default function BodyMap({ analysis }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        <span className="material-symbols-outlined align-middle mr-2 text-primary">body_system</span>
        Risk Body Map
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {riskItems.map((item) => {
          const pct = analysis?.[item.key];
          const { level, color } = getRiskLevel(pct);

          const bgColors = {
            green: 'bg-green-100 dark:bg-green-900/30',
            amber: 'bg-amber-100 dark:bg-amber-900/30',
            red: 'bg-red-100 dark:bg-red-900/30',
            slate: 'bg-slate-100 dark:bg-slate-800',
          };

          const textColors = {
            green: 'text-green-700 dark:text-green-400',
            amber: 'text-amber-700 dark:text-amber-400',
            red: 'text-red-700 dark:text-red-400',
            slate: 'text-slate-600 dark:text-slate-400',
          };

          const iconColors = {
            green: 'text-green-600 dark:text-green-500',
            amber: 'text-amber-600 dark:text-amber-500',
            red: 'text-red-600 dark:text-red-500',
            slate: 'text-slate-500 dark:text-slate-500',
          };

          return (
            <div
              key={item.key}
              className={`p-4 rounded-xl ${bgColors[color]} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-2xl ${iconColors[color]}`}>
                  {item.icon}
                </span>
                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {item.label}
                  </div>
                  <div className={`text-xl font-bold ${textColors[color]}`}>
                    {formatPct(pct)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 capitalize">
                {level} risk
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
        Risk levels are computed by the FastAPI backend using ML models.
      </p>
    </div>
  );
}
