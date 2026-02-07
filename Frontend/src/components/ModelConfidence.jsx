import { useMemo } from 'react';

const RING_SIZE = 100;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function calculateConfidence(analysis) {
  if (!analysis) return 0;
  
  // Count how many data points we have
  const dataPoints = [
    'diabetesRisk',
    'heartRisk',
    'liverRisk',
    'depressionRisk',
  ];
  
  let validPoints = 0;
  let hasHistory = false;
  
  for (const key of dataPoints) {
    const val = analysis[key];
    if (val !== undefined && val !== null && Number.isFinite(Number(val))) {
      validPoints++;
    }
  }
  
  // Check if we have trend data (indicates historical records)
  if (analysis.trendData?.timestamps?.length > 1) {
    hasHistory = true;
  }
  
  // Base confidence from data completeness
  let confidence = (validPoints / dataPoints.length) * 70;
  
  // Bonus for historical data
  if (hasHistory) {
    confidence += 20;
  }
  
  // Bonus if ML probabilities exist
  if (analysis.mlProbabilities && Object.keys(analysis.mlProbabilities).length > 0) {
    confidence += 10;
  }
  
  return Math.min(100, Math.max(0, Math.round(confidence)));
}

function getConfidenceLevel(confidence) {
  if (confidence >= 85) return { label: 'High Confidence', color: '#22c55e', bgColor: '#dcfce7' };
  if (confidence >= 60) return { label: 'Moderate Confidence', color: '#f59e0b', bgColor: '#fef3c7' };
  return { label: 'Low Confidence', color: '#ef4444', bgColor: '#fee2e2' };
}

function getConfidenceMessage(confidence) {
  if (confidence >= 85) {
    return 'The AI model has high certainty based on the completeness of your data.';
  }
  if (confidence >= 60) {
    return 'More health data would improve prediction accuracy.';
  }
  return 'Limited data available. Consider adding more health metrics.';
}

export default function ModelConfidence({ analysis }) {
  const { confidence, level, message } = useMemo(() => {
    const conf = calculateConfidence(analysis);
    const lev = getConfidenceLevel(conf);
    const msg = getConfidenceMessage(conf);
    return { confidence: conf, level: lev, message: msg };
  }, [analysis]);

  const offset = CIRCUMFERENCE - (confidence / 100) * CIRCUMFERENCE;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Model Confidence</h2>
      
      <div className="flex items-center gap-6">
        {/* Confidence Ring */}
        <div className="relative flex-shrink-0">
          <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
            {/* Background circle */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={STROKE_WIDTH}
            />
            {/* Progress circle */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={level.color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-800">{confidence}%</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium mb-2"
            style={{ backgroundColor: level.bgColor, color: level.color }}
          >
            <span className="material-symbols-outlined text-base">
              {confidence >= 85 ? 'verified' : confidence >= 60 ? 'info' : 'warning'}
            </span>
            {level.label}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>

      {/* Data Completeness Indicators */}
      {confidence < 85 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">Improve accuracy by adding:</p>
          <div className="flex flex-wrap gap-2">
            {!analysis?.trendData?.timestamps?.length && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                Historical data
              </span>
            )}
            {(!analysis?.mlProbabilities || Object.keys(analysis.mlProbabilities).length === 0) && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                Lab reports
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
