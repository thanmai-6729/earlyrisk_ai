function getRiskStyle(pct) {
  const x = Number(pct);
  if (!Number.isFinite(x)) {
    return {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
    };
  }
  if (x < 35) {
    return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    };
  }
  if (x < 70) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
    };
  }
  return {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  };
}

function formatPct(pct) {
  const x = Number(pct);
  if (!Number.isFinite(x)) return '—';
  return `${Math.round(x)}%`;
}

export default function RiskSummary({ analysis }) {
  const risks = [
    { key: 'diabetesRisk', label: 'Diabetes', icon: 'bloodtype' },
    { key: 'heartRisk', label: 'Heart Disease', icon: 'favorite' },
    { key: 'liverRisk', label: 'Liver Issues', icon: 'gastroenterology' },
    { key: 'depressionRisk', label: 'Depression', icon: 'psychology' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        <span className="material-symbols-outlined align-middle mr-2 text-primary">monitoring</span>
        Risk Assessment
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {risks.map((risk) => {
          const pct = analysis?.[risk.key];
          const styles = getRiskStyle(pct);

          return (
            <div
              key={risk.key}
              className={`p-4 rounded-xl border ${styles.bg} ${styles.border} transition-all hover:shadow-md`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`material-symbols-outlined ${styles.text}`}>{risk.icon}</span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {risk.label}
                </span>
              </div>
              <div className={`text-3xl font-bold ${styles.text}`}>{formatPct(pct)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
