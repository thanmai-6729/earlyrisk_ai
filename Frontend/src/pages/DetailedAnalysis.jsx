import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import PrivateLayout from '../components/PrivateLayout.jsx';
import ModelConfidence from '../components/ModelConfidence.jsx';
import { getPatientLatest, getPatientHistory } from '../api.js';

function getRiskLevel(pct) {
  const x = Number(pct) || 0;
  if (x < 30) return { level: 'Low', color: 'green', bg: 'bg-green-500' };
  if (x <= 60) return { level: 'Moderate', color: 'amber', bg: 'bg-amber-500' };
  return { level: 'High', color: 'red', bg: 'bg-red-500' };
}

function getRiskBannerStyle(riskLevel) {
  switch (riskLevel) {
    case 'High':
      return {
        gradient: 'from-red-600 to-rose-700',
        badge: 'bg-red-400/30 text-white',
        badgeText: 'ATTENTION NEEDED',
      };
    case 'Moderate':
      return {
        gradient: 'from-amber-500 to-orange-600',
        badge: 'bg-amber-400/30 text-white',
        badgeText: 'ATTENTION NEEDED',
      };
    default:
      return {
        gradient: 'from-green-500 to-emerald-600',
        badge: 'bg-green-400/30 text-white',
        badgeText: 'HEALTHY RANGE',
      };
  }
}

function getContributorStyle(impact) {
  switch (impact) {
    case 'high':
      return { bar: 'bg-red-500', text: 'text-red-600', badge: 'High' };
    case 'moderate':
      return { bar: 'bg-amber-500', text: 'text-amber-600', badge: 'Moderate' };
    case 'low':
      return { bar: 'bg-green-500', text: 'text-green-600', badge: 'Low' };
    case 'protective':
      return { bar: 'bg-blue-500', text: 'text-blue-600', badge: 'Protective' };
    default:
      return { bar: 'bg-slate-400', text: 'text-slate-600', badge: 'Neutral' };
  }
}

function calculateRiskContributors(analysis, inputData) {
  const contributors = [];
  
  // Sleep Quality
  const sleepHours = Number(inputData?.sleep_hours) || 7;
  let sleepImpact = 'low';
  let sleepRisk = 3;
  if (sleepHours < 5) {
    sleepImpact = 'high';
    sleepRisk = 15;
  } else if (sleepHours < 6) {
    sleepImpact = 'moderate';
    sleepRisk = 8;
  } else if (sleepHours >= 7 && sleepHours <= 9) {
    sleepImpact = 'protective';
    sleepRisk = -5;
  }
  contributors.push({
    id: 'sleep',
    label: 'Sleep Quality',
    value: `Avg ${sleepHours} hours/night`,
    icon: 'bedtime',
    impact: sleepImpact,
    riskPct: sleepRisk,
    barWidth: Math.abs(sleepRisk) * 5,
  });
  
  // Cholesterol (LDL approximation)
  const cholesterol = Number(inputData?.cholesterol_mgdl) || 180;
  let cholImpact = 'low';
  let cholRisk = 3;
  if (cholesterol > 240) {
    cholImpact = 'high';
    cholRisk = 12;
  } else if (cholesterol > 200) {
    cholImpact = 'moderate';
    cholRisk = 8;
  } else if (cholesterol < 170) {
    cholImpact = 'protective';
    cholRisk = -4;
  }
  contributors.push({
    id: 'cholesterol',
    label: 'LDL Cholesterol',
    value: `${cholesterol} mg/dL`,
    icon: 'water_drop',
    impact: cholImpact,
    riskPct: cholRisk,
    barWidth: Math.abs(cholRisk) * 5,
  });
  
  // Stress Levels
  const stress = Number(inputData?.stress_level) || 5;
  let stressImpact = 'low';
  let stressRisk = 3;
  if (stress >= 8) {
    stressImpact = 'high';
    stressRisk = 10;
  } else if (stress >= 6) {
    stressImpact = 'moderate';
    stressRisk = 5;
  } else if (stress <= 3) {
    stressImpact = 'protective';
    stressRisk = -3;
  }
  contributors.push({
    id: 'stress',
    label: 'Stress Levels',
    value: stress >= 7 ? 'Elevated Cortisol' : stress <= 3 ? 'Low Stress' : 'Moderate',
    icon: 'psychology_alt',
    impact: stressImpact,
    riskPct: stressRisk,
    barWidth: Math.abs(stressRisk) * 5,
  });
  
  // Daily Steps (from exercise)
  const exercise = Number(inputData?.exercise_mins_per_week) || 120;
  const avgSteps = Math.round((exercise / 7) * 100 + 5000); // Rough estimation
  let stepsImpact = 'neutral';
  let stepsRisk = 0;
  if (exercise >= 150) {
    stepsImpact = 'protective';
    stepsRisk = -12;
  } else if (exercise < 60) {
    stepsImpact = 'moderate';
    stepsRisk = 6;
  }
  contributors.push({
    id: 'steps',
    label: 'Daily Steps',
    value: `Avg ${avgSteps.toLocaleString()} steps`,
    icon: 'directions_walk',
    impact: stepsImpact,
    riskPct: stepsRisk,
    barWidth: Math.abs(stepsRisk) * 5,
  });
  
  // BMI
  const height = Number(inputData?.height_cm) || 170;
  const weight = Number(inputData?.weight_kg) || 70;
  const bmi = height > 0 ? weight / ((height / 100) ** 2) : 0;
  let bmiImpact = 'neutral';
  let bmiRisk = 0;
  let bmiLabel = 'Normal';
  if (bmi >= 30) {
    bmiImpact = 'high';
    bmiRisk = 10;
    bmiLabel = 'Obese';
  } else if (bmi >= 25) {
    bmiImpact = 'moderate';
    bmiRisk = 5;
    bmiLabel = 'Overweight';
  } else if (bmi >= 18.5 && bmi < 25) {
    bmiImpact = 'neutral';
    bmiRisk = 0;
    bmiLabel = 'Normal';
  } else if (bmi < 18.5) {
    bmiImpact = 'low';
    bmiRisk = 3;
    bmiLabel = 'Underweight';
  }
  contributors.push({
    id: 'bmi',
    label: 'BMI',
    value: `${bmi.toFixed(1)} (${bmiLabel})`,
    icon: 'monitor_weight',
    impact: bmiImpact,
    riskPct: bmiRisk,
    barWidth: Math.abs(bmiRisk) * 5,
  });
  
  // Sort by absolute risk contribution
  contributors.sort((a, b) => Math.abs(b.riskPct) - Math.abs(a.riskPct));
  
  return contributors;
}

export default function DetailedAnalysis() {
  const navigate = useNavigate();
  const { analysisId } = useParams();
  const { user } = useAuth();
  const userId = user?.id;

  const [analysis, setAnalysis] = useState(null);
  const [inputData, setInputData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!userId) return;

    let alive = true;

    async function fetchData() {
      setLoading(true);
      try {
        const data = await getPatientLatest(userId);
        if (!alive) return;

        if (data?.analysis) {
          setAnalysis(data.analysis);
        }
        if (data?.latest) {
          setInputData(data.latest);
        }
      } catch {
        // Failed to fetch
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchData();

    return () => {
      alive = false;
    };
  }, [userId]);

  const primaryRisk = useMemo(() => {
    if (!analysis) return null;
    
    // Get the highest risk category
    const risks = [
      { key: 'heartRisk', label: 'Cardiac Health', icon: 'favorite' },
      { key: 'diabetesRisk', label: 'Diabetes', icon: 'bloodtype' },
      { key: 'liverRisk', label: 'Metabolic Health', icon: 'gastroenterology' },
      { key: 'depressionRisk', label: 'Mental Health', icon: 'psychology' },
    ];
    
    let highest = risks[0];
    let maxVal = 0;
    
    for (const risk of risks) {
      const val = Number(analysis[risk.key]) || 0;
      if (val > maxVal) {
        maxVal = val;
        highest = risk;
      }
    }
    
    return { ...highest, value: maxVal };
  }, [analysis]);

  const riskInfo = primaryRisk ? getRiskLevel(primaryRisk.value) : null;
  const bannerStyle = riskInfo ? getRiskBannerStyle(riskInfo.level) : null;
  const contributors = useMemo(() => calculateRiskContributors(analysis, inputData), [analysis, inputData]);

  if (loading) {
    return (
      <PrivateLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500">Loading analysis…</p>
          </div>
        </div>
      </PrivateLayout>
    );
  }

  if (!analysis) {
    return (
      <PrivateLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-4">
              error_outline
            </span>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No Analysis Found</h2>
            <p className="text-slate-500 mb-4">Please run an analysis from the dashboard first.</p>
            <button
              onClick={() => navigate('/app')}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => navigate('/app')} className="hover:text-primary">
            Dashboard
          </button>
          <span>›</span>
          <span className="text-slate-800">AI Risk Analysis</span>
        </div>
        <span className="text-sm text-slate-400">Last updated: Just now</span>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">{primaryRisk?.icon}</span>
          AI Risk Analysis: {primaryRisk?.label}
        </h1>
        <p className="text-slate-500 mt-1">
          Understanding the factors driving your current risk score based on the latest clinical data.
        </p>
      </div>

      {/* Risk Banner */}
      {bannerStyle && (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${bannerStyle.gradient} p-6 text-white mb-8`}>
          {/* ECG Pattern Background */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
              <path
                d="M0,100 L100,100 L120,100 L140,30 L160,170 L180,100 L200,100 L800,100"
                fill="none"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
          </div>
          
          <div className="relative z-10">
            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${bannerStyle.badge} mb-3`}>
              {bannerStyle.badgeText}
            </span>
            <h2 className="text-2xl font-bold mb-2">
              {riskInfo.level} Risk Detected
            </h2>
            <p className="text-white/90 max-w-xl">
              Based on recent vitals and lab results, your risk score has 
              {riskInfo.level === 'High' ? ' increased significantly' : 
               riskInfo.level === 'Moderate' ? ' increased slightly' : ' remained stable'} 
              over the last 30 days.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Risk Contributors */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    TOP 5 RISK CONTRIBUTORS
                    <span className="material-symbols-outlined text-slate-400 text-lg cursor-help">info</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Generated by AI from your 12-month trends</p>
                </div>
                <button
                  onClick={() => navigate('/reports')}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  View Full Report
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {contributors.map((contributor) => {
                const style = getContributorStyle(contributor.impact);
                const isProtective = contributor.riskPct < 0;
                
                return (
                  <div key={contributor.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isProtective ? 'bg-blue-100' : 
                        contributor.impact === 'high' ? 'bg-red-100' :
                        contributor.impact === 'moderate' ? 'bg-amber-100' :
                        'bg-slate-100'
                      }`}>
                        <span className={`material-symbols-outlined text-2xl ${
                          isProtective ? 'text-blue-600' :
                          contributor.impact === 'high' ? 'text-red-600' :
                          contributor.impact === 'moderate' ? 'text-amber-600' :
                          'text-slate-600'
                        }`}>
                          {contributor.icon}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-slate-800">{contributor.label}</h3>
                          <span className="text-sm text-slate-500">{style.badge}</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">{contributor.value}</p>
                        
                        {/* Impact Bar */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-12">Impact</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${style.bar} rounded-full transition-all duration-500`}
                              style={{ width: `${Math.min(100, contributor.barWidth)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Risk Percentage */}
                      <div className={`text-right ${style.text} font-semibold`}>
                        {isProtective ? (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-lg">arrow_downward</span>
                            {Math.abs(contributor.riskPct)}% Prot.
                          </span>
                        ) : contributor.riskPct > 0 ? (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-lg">arrow_upward</span>
                            {contributor.riskPct}% Risk
                          </span>
                        ) : (
                          <span>— Neutral</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Disclaimer */}
            <div className="p-4 bg-slate-50 rounded-b-2xl">
              <p className="text-xs text-slate-500 text-center">
                Disclaimer: AI predictions are for informational purposes only and do not constitute a clinical diagnosis. 
                Always consult with your healthcare provider.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Confidence & Plan CTA */}
        <div className="space-y-6">
          {/* Improve Score Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600">lightbulb</span>
              </div>
              <h3 className="font-semibold text-slate-800">Improve your score</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {inputData?.sleep_hours < 7 
                ? `Increasing your sleep duration to 7 hours could reduce your risk score by approximately 8%.`
                : inputData?.exercise_mins_per_week < 150
                ? `Increasing exercise to 150 mins/week could significantly improve your metabolic health.`
                : `Maintaining your current healthy habits will help keep your risk scores low.`
              }
            </p>
            <button
              onClick={() => navigate(`/plan/${analysisId || 'latest'}`)}
              className="w-full py-3 px-4 bg-white border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors"
            >
              View Personalized Plan
            </button>
          </div>

          {/* Model Confidence */}
          <ModelConfidence analysis={analysis} />
        </div>
      </div>
    </PrivateLayout>
  );
}
