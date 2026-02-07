import { useMemo } from 'react';

function generateAlerts(analysis, trendData) {
  if (!analysis) return [];
  
  const alerts = [];
  const now = new Date();
  
  // Risk threshold alerts
  const riskThresholds = [
    { key: 'diabetesRisk', label: 'Diabetes Risk', icon: 'bloodtype', threshold: 60 },
    { key: 'heartRisk', label: 'Cardiac Risk', icon: 'favorite', threshold: 60 },
    { key: 'liverRisk', label: 'Liver Risk', icon: 'gastroenterology', threshold: 60 },
    { key: 'depressionRisk', label: 'Mental Health', icon: 'psychology', threshold: 60 },
  ];
  
  for (const { key, label, icon, threshold } of riskThresholds) {
    const value = Number(analysis[key]) || 0;
    if (value >= threshold) {
      alerts.push({
        id: `high-${key}`,
        type: 'critical',
        icon,
        title: `High ${label}`,
        message: `Your ${label.toLowerCase()} is at ${Math.round(value)}%, above the ${threshold}% threshold.`,
        timestamp: now,
      });
    } else if (value >= 40 && value < threshold) {
      alerts.push({
        id: `moderate-${key}`,
        type: 'warning',
        icon,
        title: `Elevated ${label}`,
        message: `Your ${label.toLowerCase()} is at ${Math.round(value)}%, approaching elevated levels.`,
        timestamp: now,
      });
    }
  }
  
  // Trend-based alerts
  if (trendData?.riskEvolution) {
    for (const [disease, values] of Object.entries(trendData.riskEvolution)) {
      if (!values || values.length < 2) continue;
      
      const current = values[values.length - 1] * 100;
      const previous = values[values.length - 2] * 100;
      const change = current - previous;
      
      if (change >= 10) {
        alerts.push({
          id: `spike-${disease}`,
          type: 'warning',
          icon: 'trending_up',
          title: `${disease} Risk Increasing`,
          message: `Your ${disease.toLowerCase()} risk increased by ${change.toFixed(1)}% since last check.`,
          timestamp: now,
        });
      } else if (change <= -10) {
        alerts.push({
          id: `improvement-${disease}`,
          type: 'success',
          icon: 'trending_down',
          title: `${disease} Risk Improving`,
          message: `Great progress! Your ${disease.toLowerCase()} risk decreased by ${Math.abs(change).toFixed(1)}%.`,
          timestamp: now,
        });
      }
    }
  }
  
  // Sort: critical first, then warning, then success
  const priority = { critical: 0, warning: 1, success: 2 };
  alerts.sort((a, b) => priority[a.type] - priority[b.type]);
  
  return alerts.slice(0, 5); // Limit to 5 most important
}

function getAlertStyle(type) {
  switch (type) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-500',
        title: 'text-red-700',
        text: 'text-red-600',
        badge: 'bg-red-100 text-red-700',
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-500',
        title: 'text-amber-700',
        text: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-700',
      };
    case 'success':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-500',
        title: 'text-green-700',
        text: 'text-green-600',
        badge: 'bg-green-100 text-green-700',
      };
    default:
      return {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: 'text-slate-500',
        title: 'text-slate-700',
        text: 'text-slate-600',
        badge: 'bg-slate-100 text-slate-700',
      };
  }
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RecentAlerts({ analysis, trendData }) {
  const alerts = useMemo(() => generateAlerts(analysis, trendData), [analysis, trendData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500">notifications_active</span>
          Recent Alerts
        </h2>
        {alerts.length > 0 && (
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
            {alerts.length} active
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-green-400 mb-2">
            check_circle
          </span>
          <p className="text-slate-500">No alerts at this time</p>
          <p className="text-sm text-slate-400 mt-1">All health metrics are within normal ranges</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const styles = getAlertStyle(alert.type);
            return (
              <div
                key={alert.id}
                className={`${styles.bg} ${styles.border} border rounded-xl p-4 transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined ${styles.icon}`}>
                    {alert.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className={`font-medium ${styles.title} truncate`}>
                        {alert.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                        {alert.type}
                      </span>
                    </div>
                    <p className={`text-sm ${styles.text}`}>{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {formatTime(alert.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
