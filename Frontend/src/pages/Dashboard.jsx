import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import PrivateLayout from '../components/PrivateLayout.jsx';
import HealthForm from '../components/HealthForm.jsx';
import RiskRings from '../components/RiskRings.jsx';
import RiskTrends from '../components/RiskTrends.jsx';
import RecentAlerts from '../components/RecentAlerts.jsx';
import BodyMap from '../components/BodyMap.jsx';
import RiskCharts from '../components/RiskCharts.jsx';
import AdviceList from '../components/AdviceList.jsx';
import MedicalDocumentUpload from '../components/MedicalDocumentUpload.jsx';
import { analyzeHealth, getPatientLatest } from '../api.js';
import { saveAnalysisHistory, getRiskTrendData } from '../auth/supabase.js';

const PROFILE_KEY_PREFIX = 'earlyrisk_profile_v1_';

function loadProfile(userId) {
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProfile(userId, profile) {
  try {
    localStorage.setItem(`${PROFILE_KEY_PREFIX}${userId}`, JSON.stringify(profile));
  } catch {
    // Ignore localStorage errors
  }
}

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0) return null;
  const m = h / 100;
  return w / (m * m);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, displayName, healthData } = useAuth();
  const userId = user?.id;

  const [initialValues, setInitialValues] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [riskTrendData, setRiskTrendData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const formRef = useRef(null);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const [fetchingLatest, setFetchingLatest] = useState(true);

  // Load latest data from backend
  useEffect(() => {
    if (!userId) return;

    let alive = true;

    async function fetchLatest() {
      setFetchingLatest(true);
      try {
        const latest = await getPatientLatest(userId);
        if (!alive) return;

        if (latest?.patient && latest?.latest) {
          const vals = {
            age: latest.patient.age,
            gender: latest.patient.gender,
            height_cm: latest.patient.height_cm,
            weight_kg: latest.latest.weight_kg,
            bp_systolic: latest.latest.bp_systolic,
            bp_diastolic: latest.latest.bp_diastolic,
            sugar_mgdl: latest.latest.sugar_mgdl,
            hba1c_pct: latest.latest.hba1c_pct,
            cholesterol_mgdl: latest.latest.cholesterol_mgdl,
            sleep_hours: latest.latest.sleep_hours,
            exercise_mins_per_week: latest.latest.exercise_mins_per_week,
            stress_level: latest.latest.stress_level,
            family_history: latest.latest.family_history ? 1 : 0,
          };
          setInitialValues(vals);
        } else {
          // Try loading from localStorage first, then Supabase profile healthData
          const saved = loadProfile(userId);
          if (saved) {
            setInitialValues(saved);
          } else if (healthData && Object.keys(healthData).length > 0) {
            // Use healthData from Supabase profile as fallback for new users
            setInitialValues(healthData);
          }
        }

        if (latest?.analysis) {
          setAnalysis(latest.analysis);
        }
      } catch {
        // Try local fallback, then Supabase profile healthData
        const saved = loadProfile(userId);
        if (saved) {
          setInitialValues(saved);
        } else if (healthData && Object.keys(healthData).length > 0) {
          // Use healthData from Supabase profile as fallback for new users
          setInitialValues(healthData);
        }
      } finally {
        if (alive) setFetchingLatest(false);
      }
    }

    fetchLatest();

    return () => {
      alive = false;
    };
  }, [userId, healthData]);

  // Fetch risk trend data from Supabase
  const fetchRiskTrends = useCallback(async () => {
    if (!userId) return;
    try {
      const trends = await getRiskTrendData(userId, 12);
      setRiskTrendData(trends);
    } catch (err) {
      console.warn('Could not fetch risk trends:', err);
    }
  }, [userId]);

  // Fetch trends on mount and when userId changes
  useEffect(() => {
    fetchRiskTrends();
  }, [fetchRiskTrends]);

  const handleAnalyze = useCallback(
    async (payload) => {
      if (!userId) return;

      setLoading(true);
      setStatusMessage('Running AI analysis…');

      try {
        const fullPayload = { ...payload, patient_id: userId };
        const result = await analyzeHealth(fullPayload, { persist: true });
        setAnalysis(result);
        saveProfile(userId, payload);
        
        // Save to Supabase analysis history
        try {
          await saveAnalysisHistory({
            userId,
            inputData: payload,
            analysisResult: result,
            source: 'form'
          });
          // Refresh trend data after saving
          await fetchRiskTrends();
        } catch (historyErr) {
          console.warn('Could not save analysis history:', historyErr);
        }
        
        setStatusMessage('Analysis complete!');
        setShowForm(false);
        // Scroll to top smoothly after analysis
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        setStatusMessage(`Error: ${err?.message || err}`);
      } finally {
        setLoading(false);
      }
    },
    [userId, fetchRiskTrends]
  );

  // Handle scan complete from MedicalDocumentUpload
  const handleScanComplete = useCallback(
    async (result, fileRecord) => {
      if (result) {
        // Build analysis object from scan result
        const analysisFromScan = {
          diabetesRisk: result.diabetesRisk,
          heartRisk: result.heartRisk,
          liverRisk: result.liverRisk,
          depressionRisk: result.depressionRisk,
          advice: result.advice || [],
          trendData: analysis?.trendData, // Keep existing trend data
        };
        setAnalysis(analysisFromScan);
        setShowForm(false); // Hide form after successful scan
        
        // Update form values with extracted values
        const merged = { ...initialValues, ...result.normalized_values };
        if (result.normalized_values) {
          setInitialValues(merged);
          saveProfile(userId, merged);
        }
        
        // Save to Supabase analysis history
        try {
          await saveAnalysisHistory({
            userId,
            inputData: merged,
            analysisResult: analysisFromScan,
            source: 'document_scan'
          });
          // Refresh trend data after saving
          await fetchRiskTrends();
        } catch (historyErr) {
          console.warn('Could not save scan analysis history:', historyErr);
        }
        
        // Scroll to top to show results after state updates
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    },
    [userId, initialValues, analysis, fetchRiskTrends]
  );

  // Get user profile for scan context
  const userProfile = {
    age: initialValues?.age || 30,
    gender: initialValues?.gender || 'other',
    height_cm: initialValues?.height_cm || 170,
    weight_kg: initialValues?.weight_kg || 70,
    sleep_hours: initialValues?.sleep_hours || 7,
    exercise_mins_per_week: initialValues?.exercise_mins_per_week || 120,
    stress_level: initialValues?.stress_level || 5,
    family_history: initialValues?.family_history || 0,
  };

  const bmi = computeBmi(initialValues?.height_cm, initialValues?.weight_kg);

  if (fetchingLatest) {
    return (
      <PrivateLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500">Loading your health data…</p>
          </div>
        </div>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            Welcome back, {displayName}
          </h1>
          <p className="text-slate-500">
            Your AI-powered health intelligence dashboard
            {bmi && (
              <span className="ml-2 text-sm bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                BMI: {bmi.toFixed(1)}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          {/* Only show Update Data button when user has previous analysis */}
          {analysis && (
            <button
              onClick={() => {
                if (!showForm) {
                  setShowForm(true);
                  setTimeout(() => {
                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                } else {
                  setShowForm(false);
                }
              }}
              className="px-4 py-2 rounded-lg font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                {showForm ? 'close' : 'edit_note'}
              </span>
              {showForm ? 'Hide Form' : 'Update Data'}
            </button>
          )}
          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2 rounded-lg font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">description</span>
            View Reports
          </button>
        </div>
      </div>

      {/* Risk Rings - Always visible when analysis exists */}
      {analysis && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">monitoring</span>
            Health Risk Overview
          </h2>
          <RiskRings analysis={analysis} />
        </div>
      )}

      {/* Risk Trends & Recent Alerts - Side by Side */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Risk Trends - Left Side */}
          <div className="lg:col-span-3">
            <RiskTrends analysis={analysis} trendData={riskTrendData} compact />
          </div>

          {/* Recent Alerts - Right Side */}
          <div className="lg:col-span-2">
            <RecentAlerts analysis={analysis} trendData={analysis?.trendData} />
          </div>
        </div>
      )}

      {/* View Detailed Analysis CTA */}
      {analysis && (
        <div className="mb-8 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">insights</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">View Detailed Risk Analysis</h3>
                <p className="text-slate-300 text-sm">
                  Understand the factors driving your risk scores and get personalized recommendations.
                </p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => navigate('/analysis/latest')}
                className="px-6 py-3 bg-white text-slate-800 font-semibold rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                View Analysis
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Report Card */}
      {analysis && (
        <div className="mb-8">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-primary">description</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Download Report</h3>
                  <p className="text-slate-500 text-xs">
                    Get your health assessment as PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('latestAnalysis', JSON.stringify(analysis));
                  let iframe = document.getElementById('print-iframe');
                  if (!iframe) {
                    iframe = document.createElement('iframe');
                    iframe.id = 'print-iframe';
                    iframe.style.position = 'absolute';
                    iframe.style.width = '0';
                    iframe.style.height = '0';
                    iframe.style.border = 'none';
                    iframe.style.left = '-9999px';
                    document.body.appendChild(iframe);
                  }
                  iframe.src = '/report';
                  iframe.onload = () => {
                    setTimeout(() => {
                      iframe.contentWindow.print();
                    }, 300);
                  };
                }}
                className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Section - Collapsible */}
      {(showForm || !analysis) && (
        <div ref={formRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 scroll-mt-24">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">
                <span className="material-symbols-outlined align-middle mr-2 text-primary">
                  edit_note
                </span>
                Health Metrics
              </h2>
              <HealthForm
                key={JSON.stringify(initialValues)}
                initialValues={initialValues}
                onSubmit={handleAnalyze}
                submitLabel="Analyze Health"
                loading={loading}
                statusMessage={statusMessage}
              />
            </div>

            {/* Medical Document Upload */}
            <MedicalDocumentUpload 
              onScanComplete={handleScanComplete} 
              userProfile={userProfile}
            />
          </div>

          {/* Right Column - Body Map */}
          <div className="lg:col-span-1">
            <BodyMap analysis={analysis} />
          </div>
        </div>
      )}

      {/* Trends & Recommendations Section */}
      {analysis && (
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              analytics
            </span>
            Trends & Recommendations
          </h2>

          {/* Charts & Advice */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskCharts trendData={analysis.trendData} />
            <AdviceList advice={analysis.advice} />
          </div>
        </div>
      )}

      {/* No Results CTA */}
      {!analysis && !showForm && (
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-8 bg-slate-50 rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-5xl text-slate-400">monitoring</span>
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">
                No analysis yet
              </h3>
              <p className="text-slate-500">
                Fill in the form and click "Analyze Health" to get your AI-powered risk assessment.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              Enter Health Data
            </button>
          </div>
        </div>
      )}
    </PrivateLayout>
  );
}
