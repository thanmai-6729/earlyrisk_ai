import { useCallback, useState } from 'react';
import PublicLayout from '../components/PublicLayout.jsx';
import HealthForm from '../components/HealthForm.jsx';
import RiskSummary from '../components/RiskSummary.jsx';
import BodyMap from '../components/BodyMap.jsx';
import RiskCharts from '../components/RiskCharts.jsx';
import AdviceList from '../components/AdviceList.jsx';
import GuestLimitBanner from '../components/GuestLimitBanner.jsx';
import { analyzeHealth } from '../api.js';

const MAX_GUEST_ATTEMPTS = 3;
const ATTEMPT_KEY = 'sdd_guest_attempts_v1';

function getAttempts() {
  try {
    const raw = localStorage.getItem(ATTEMPT_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function setAttempts(n) {
  try {
    localStorage.setItem(ATTEMPT_KEY, String(n));
  } catch {
    // Ignore localStorage errors
  }
}

export default function Demo() {
  const [attemptsUsed, setAttemptsUsed] = useState(getAttempts);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const remaining = Math.max(0, MAX_GUEST_ATTEMPTS - attemptsUsed);
  const isBlocked = remaining <= 0;

  const handleAnalyze = useCallback(
    async (payload) => {
      if (isBlocked) {
        setStatusMessage('Demo limit reached. Please sign up to continue.');
        return;
      }

      setLoading(true);
      setStatusMessage('Running AI analysis…');

      try {
        // Guest mode: persist = false
        const result = await analyzeHealth(payload, { persist: false });
        setAnalysis(result);

        // Increment attempts
        const newAttempts = attemptsUsed + 1;
        setAttempts(newAttempts);
        setAttemptsUsed(newAttempts);

        setStatusMessage('Analysis complete!');
      } catch (err) {
        setStatusMessage(`Error: ${err?.message || err}`);
      } finally {
        setLoading(false);
      }
    },
    [attemptsUsed, isBlocked]
  );

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            <span className="material-symbols-outlined align-middle mr-3 text-primary text-4xl">
              science
            </span>
            Try the Demo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Enter your health metrics below to receive an AI-powered risk assessment.
            No account required for up to {MAX_GUEST_ATTEMPTS} analyses.
          </p>
        </div>

        {/* Guest Limit Banner */}
        <div className="mb-6">
          <GuestLimitBanner attemptsUsed={attemptsUsed} maxAttempts={MAX_GUEST_ATTEMPTS} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                <span className="material-symbols-outlined align-middle mr-2 text-primary">
                  edit_note
                </span>
                Health Metrics
              </h2>
              <HealthForm
                onSubmit={handleAnalyze}
                submitLabel={isBlocked ? 'Limit Reached' : 'Analyze Health'}
                disabled={isBlocked}
                loading={loading}
                statusMessage={statusMessage}
              />
            </div>
          </div>

          {/* Right Column - Body Map */}
          <div className="lg:col-span-1">
            <BodyMap analysis={analysis} />
          </div>
        </div>

        {/* Results Section */}
        {analysis && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              <span className="material-symbols-outlined align-middle mr-2 text-primary">
                analytics
              </span>
              Analysis Results
            </h2>

            {/* Risk Summary */}
            <RiskSummary analysis={analysis} />

            {/* Charts & Advice */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RiskCharts trendData={analysis.trendData} />
              <AdviceList advice={analysis.advice} />
            </div>
          </div>
        )}

        {/* Call to Action when no results yet */}
        {!analysis && !isBlocked && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-2xl">arrow_upward</span>
              <span>Fill in the form above and click "Analyze Health" to see your results</span>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
