import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import PrivateLayout from '../components/PrivateLayout.jsx';
import RiskCharts from '../components/RiskCharts.jsx';
import FileUpload from '../components/FileUpload.jsx';
import { getPatientHistory, uploadReport } from '../api.js';
import { getAnalysisHistory } from '../auth/supabase.js';

const PROFILE_KEY_PREFIX = 'earlyrisk_profile_v1_';

function loadProfile(userId) {
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatPct(pct) {
  const x = Number(pct);
  if (!Number.isFinite(x)) return '—';
  return `${Math.round(x)}%`;
}

function getRiskColor(pct) {
  const x = Number(pct);
  if (!Number.isFinite(x)) return 'text-slate-400';
  if (x < 35) return 'text-green-600';
  if (x < 70) return 'text-amber-600';
  return 'text-red-600';
}

export default function Reports() {
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const userId = user?.id;

  const [history, setHistory] = useState([]);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch patient history
  useEffect(() => {
    if (!userId) return;

    let alive = true;

    async function fetchHistory() {
      setLoading(true);
      try {
        // Fetch both backend history and Supabase analysis history
        const [data, supabaseAnalyses] = await Promise.all([
          getPatientHistory(userId).catch(() => ({ history: [], trendData: null })),
          getAnalysisHistory(userId, 20).catch(() => []),
        ]);
        
        if (!alive) return;

        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
        if (data.trendData) {
          setTrendData(data.trendData);
        }
        // Store analysis history for PDF reports
        if (Array.isArray(supabaseAnalyses)) {
          setAnalysisHistory(supabaseAnalyses);
        }
        // Get latest analysis if available
        if (data.history?.length > 0) {
          const latest = data.history[data.history.length - 1];
          if (latest.analysis) {
            setLatestAnalysis(latest.analysis);
          }
        }
      } catch {
        // Failed to fetch history
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchHistory();

    return () => {
      alive = false;
    };
  }, [userId]);

  const handleUpload = useCallback(
    async (file) => {
      if (!userId) return;

      const saved = loadProfile(userId) || {};
      const payload = { ...saved, patient_id: userId };

      const result = await uploadReport({ file, payload });

      // Refresh history after upload
      try {
        const data = await getPatientHistory(userId);
        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
        if (data.trendData) {
          setTrendData(data.trendData);
        }
      } catch {
        // Ignore refresh error
      }

      return result;
    },
    [userId]
  );

  if (loading) {
    return (
      <PrivateLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500">Loading your reports…</p>
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
              Reports & Trends
            </h1>
            <p className="text-slate-500">
              View your health history and download reports
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/app')}
              className="px-4 py-2 rounded-lg font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              Dashboard
            </button>
            {(history.length > 0 || latestAnalysis) && (
              <button
                onClick={() => {
                  // Save latest analysis to localStorage for report page
                  if (latestAnalysis) {
                    localStorage.setItem('latestAnalysis', JSON.stringify(latestAnalysis));
                  }
                  // Use hidden iframe to print without opening new tab
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
                className="px-4 py-2 rounded-lg font-semibold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Download
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trend Chart */}
            {trendData && (
              <RiskCharts trendData={trendData} />
            )}

            {/* History Table */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                <span className="material-symbols-outlined align-middle mr-2 text-primary">
                  history
                </span>
                Health Metrics History
              </h2>

              {history.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-5xl text-slate-400 mb-2">
                    folder_open
                  </span>
                  <p className="text-slate-500">
                    No history yet. Run an analysis from the Dashboard to see your history here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">
                          Date
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-slate-500">
                          Sugar
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-slate-500">
                          HbA1c
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-slate-500">
                          Chol
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-slate-500">
                          BP
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...history].reverse().map((entry, idx) => (
                        <tr
                          key={entry.record_id || idx}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-3 px-2 text-sm text-slate-600">
                            {formatDate(entry.timestamp)}
                          </td>
                          <td className="py-3 px-2 text-sm text-center text-slate-600">
                            {entry.sugar_mgdl ?? '—'}
                          </td>
                          <td className="py-3 px-2 text-sm text-center text-slate-600">
                            {entry.hba1c_pct ?? '—'}
                          </td>
                          <td className="py-3 px-2 text-sm text-center text-slate-600">
                            {entry.cholesterol_mgdl ?? '—'}
                          </td>
                          <td className="py-3 px-2 text-sm text-center text-slate-600">
                            {entry.bp_systolic ?? '—'}/{entry.bp_diastolic ?? '—'}
                          </td>
                          <td className="py-3 px-2 text-sm text-center">
                            <button
                              onClick={() => navigate(`/analysis/${entry.record_id || 'latest'}`)}
                              className="text-primary hover:text-primary/80 font-medium text-xs flex items-center gap-1 justify-center"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Upload */}
          <div className="lg:col-span-1 space-y-6">
            <FileUpload onUpload={handleUpload} label="Upload New Report" />

            {/* Quick Stats */}
            {latestAnalysis && (
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  <span className="material-symbols-outlined align-middle mr-2 text-primary">
                    insights
                  </span>
                  Latest Risk Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Diabetes Risk</span>
                    <span className={`font-semibold ${getRiskColor(latestAnalysis.diabetesRisk)}`}>
                      {formatPct(latestAnalysis.diabetesRisk)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Heart Risk</span>
                    <span className={`font-semibold ${getRiskColor(latestAnalysis.heartRisk)}`}>
                      {formatPct(latestAnalysis.heartRisk)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Liver Risk</span>
                    <span className={`font-semibold ${getRiskColor(latestAnalysis.liverRisk)}`}>
                      {formatPct(latestAnalysis.liverRisk)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Depression Risk</span>
                    <span className={`font-semibold ${getRiskColor(latestAnalysis.depressionRisk)}`}>
                      {formatPct(latestAnalysis.depressionRisk)}
                    </span>
                  </div>
                </div>

                {/* View Analysis Button */}
                <button
                  onClick={() => navigate('/analysis/latest')}
                  className="w-full mt-4 py-2.5 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">insights</span>
                  View Detailed Analysis
                </button>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">
                  info
                </span>
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">
                    About Reports
                  </h4>
                  <p className="text-sm text-slate-600">
                    Upload medical reports (PDF/images) to automatically extract health metrics.
                    The AI will scan for values like HbA1c, blood sugar, cholesterol, and blood pressure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </PrivateLayout>
  );
}
