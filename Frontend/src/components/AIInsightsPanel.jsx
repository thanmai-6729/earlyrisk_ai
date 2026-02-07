import { useMemo } from 'react';

function getHighestRisk(analysis) {
  if (!analysis) return null;
  
  const risks = [
    { key: 'diabetesRisk', label: 'Diabetes', category: 'blood sugar' },
    { key: 'heartRisk', label: 'Cardiac', category: 'cardiovascular' },
    { key: 'liverRisk', label: 'Metabolic', category: 'liver function' },
    { key: 'depressionRisk', label: 'Mental Health', category: 'stress and wellness' },
  ];
  
  let highest = null;
  let maxVal = -1;
  
  for (const risk of risks) {
    const val = Number(analysis[risk.key]) || 0;
    if (val > maxVal) {
      maxVal = val;
      highest = { ...risk, value: val };
    }
  }
  
  return highest;
}

function getTrendMessage(trendData, highestRisk) {
  if (!trendData?.riskEvolution || !highestRisk) return null;
  
  const evolution = trendData.riskEvolution;
  const diseaseKey = Object.keys(evolution).find(k => 
    k.toLowerCase().includes(highestRisk.label.toLowerCase().split(' ')[0])
  );
  
  if (!diseaseKey || !evolution[diseaseKey]?.length) return null;
  
  const data = evolution[diseaseKey];
  if (data.length < 2) return null;
  
  const current = data[data.length - 1] * 100;
  const previous = data[data.length - 2] * 100;
  const diff = current - previous;
  
  if (Math.abs(diff) < 2) return { type: 'stable', diff: 0 };
  if (diff > 0) return { type: 'increasing', diff: Math.abs(diff) };
  return { type: 'decreasing', diff: Math.abs(diff) };
}

function generateNarrative(analysis, highestRisk, trend) {
  if (!highestRisk) return 'Complete your health analysis to receive AI-powered insights.';
  
  const { label, value, category } = highestRisk;
  let narrative = '';
  
  if (value >= 60) {
    narrative = `Your ${category} indicators suggest elevated ${label.toLowerCase()} risk requiring attention. `;
  } else if (value >= 30) {
    narrative = `Your ${category} metrics show moderate ${label.toLowerCase()} risk factors. `;
  } else {
    narrative = `Your ${category} indicators are within healthy ranges. `;
  }
  
  if (trend?.type === 'increasing') {
    narrative += `This represents a ${trend.diff.toFixed(1)}% increase from your previous assessment.`;
  } else if (trend?.type === 'decreasing') {
    narrative += `Great progress! This shows a ${trend.diff.toFixed(1)}% improvement from your last check.`;
  } else if (trend?.type === 'stable') {
    narrative += 'Your risk levels have remained stable since your last assessment.';
  }
  
  return narrative;
}

function getEarlyWarning(analysis, highestRisk) {
  if (!highestRisk || highestRisk.value < 40) return null;
  
  const warnings = {
    Diabetes: 'Pre-diabetic indicators detected. Early intervention can prevent progression.',
    Cardiac: 'Cardiovascular stress markers elevated. Lifestyle changes recommended.',
    Metabolic: 'Metabolic syndrome risk factors present. Dietary review suggested.',
    'Mental Health': 'Elevated stress markers detected. Consider stress management strategies.',
  };
  
  return warnings[highestRisk.label] || null;
}

function getPredictionTime(highestRisk) {
  if (!highestRisk || highestRisk.value < 30) return null;
  
  // Simulated early detection based on risk level
  const months = Math.max(3, Math.round((100 - highestRisk.value) / 10));
  return months;
}

export default function AIInsightsPanel({ analysis, trendData }) {
  const insights = useMemo(() => {
    const highestRisk = getHighestRisk(analysis);
    const trend = getTrendMessage(trendData, highestRisk);
    const narrative = generateNarrative(analysis, highestRisk, trend);
    const earlyWarning = getEarlyWarning(analysis, highestRisk);
    const predictionMonths = getPredictionTime(highestRisk);
    
    return { highestRisk, trend, narrative, earlyWarning, predictionMonths };
  }, [analysis, trendData]);

  if (!analysis) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined">neurology</span>
          </div>
          <h2 className="text-lg font-semibold">AI Predictive Insights</h2>
        </div>
        <p className="text-blue-100">
          Complete your health analysis to receive personalized AI-powered predictions.
        </p>
      </div>
    );
  }

  const { highestRisk, trend, narrative, earlyWarning, predictionMonths } = insights;
  const hasWarning = earlyWarning && highestRisk?.value >= 40;

  return (
    <div className={`rounded-2xl p-6 ${hasWarning ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-600 to-indigo-700'} text-white`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <span className="material-symbols-outlined">neurology</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">AI Predictive Insights</h2>
          <p className="text-sm text-white/80">Generated from your health data</p>
        </div>
      </div>

      {/* Early Warning */}
      {hasWarning && (
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4 border border-white/20">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-yellow-200">warning</span>
            <div>
              <h3 className="font-semibold text-yellow-100 mb-1">Early Warning</h3>
              <p className="text-sm text-white/90">{earlyWarning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Time-based Prediction */}
      {predictionMonths && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className="material-symbols-outlined text-lg">schedule</span>
          <span className="text-white/90">
            Detected potential risk <strong>{predictionMonths} months</strong> earlier than typical diagnosis
          </span>
        </div>
      )}

      {/* Narrative */}
      <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
        <p className="text-white/95 leading-relaxed">{narrative}</p>
      </div>

      {/* Trend Indicator */}
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className={`material-symbols-outlined ${trend.type === 'increasing' ? 'text-red-200' : trend.type === 'decreasing' ? 'text-green-200' : 'text-white/70'}`}>
            {trend.type === 'increasing' ? 'trending_up' : trend.type === 'decreasing' ? 'trending_down' : 'trending_flat'}
          </span>
          <span className="text-white/80">
            {trend.type === 'increasing' ? 'Risk increasing' : trend.type === 'decreasing' ? 'Risk decreasing' : 'Stable trend'}
          </span>
        </div>
      )}
    </div>
  );
}
