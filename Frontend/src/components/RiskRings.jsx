import { useMemo } from 'react';

const RING_SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getRiskColor(pct) {
  const x = Number(pct);
  if (!Number.isFinite(x)) return { stroke: '#94a3b8', bg: '#f1f5f9', text: '#64748b' };
  if (x < 30) return { stroke: '#22c55e', bg: '#dcfce7', text: '#15803d' };
  if (x <= 60) return { stroke: '#f59e0b', bg: '#fef3c7', text: '#b45309' };
  return { stroke: '#ef4444', bg: '#fee2e2', text: '#dc2626' };
}

function getRiskLabel(pct) {
  const x = Number(pct);
  if (!Number.isFinite(x)) return 'Unknown';
  if (x < 30) return 'Low';
  if (x <= 60) return 'Moderate';
  return 'High';
}

function RiskRing({ value, label, icon, subtitle }) {
  const pct = Number(value) || 0;
  const colors = getRiskColor(pct);
  const riskLabel = getRiskLabel(pct);
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="relative">
          <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
            {/* Background circle */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={colors.bg}
              strokeWidth={STROKE_WIDTH}
            />
            {/* Progress circle */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold leading-none" style={{ color: colors.text }}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-lg" style={{ color: colors.stroke }}>
              {icon}
            </span>
            <h3 className="font-semibold text-slate-800 truncate">{label}</h3>
          </div>
          <p className="text-sm text-slate-500 mb-2">{subtitle}</p>
          <span
            className="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {riskLabel} Risk
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RiskRings({ analysis }) {
  const risks = useMemo(() => [
    {
      key: 'diabetesRisk',
      label: 'Diabetes',
      icon: 'bloodtype',
      subtitle: 'Blood sugar levels',
    },
    {
      key: 'heartRisk',
      label: 'Heart Disease',
      icon: 'ecg_heart',
      subtitle: 'Cardiovascular health',
    },
    {
      key: 'liverRisk',
      label: 'Liver Health',
      icon: 'gastroenterology',
      subtitle: 'Liver function',
    },
  ], []);

  if (!analysis) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {risks.map((risk, idx) => (
        <RiskRing
          key={`${risk.key}-${idx}`}
          value={analysis[risk.key]}
          label={risk.label}
          icon={risk.icon}
          subtitle={risk.subtitle}
        />
      ))}
    </div>
  );
}
