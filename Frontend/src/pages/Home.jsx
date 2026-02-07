import { Link, useNavigate } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout.jsx';

export default function Home() {
  const navigate = useNavigate();

  return (
    <PublicLayout showNav={true}>
      {/* Hero Section */}
      <section className="relative py-12 lg:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Detect What Patients
                </span>
                <br />
                Don't Even Know They Have
              </h1>
              <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-xl">
                AI-powered early detection of silent diseases like diabetes, hypertension, and cardiac risks
                <strong> 2-5 years before clinical diagnosis.</strong>
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/demo')}
                  className="px-8 py-4 rounded-xl text-lg font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  Try Demo
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-8 py-4 rounded-xl text-lg font-semibold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">person_add</span>
                  Get Started Free
                </button>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">3-5</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Years Early Detection</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">92%</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Detection Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">60%</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Preventable Complications</div>
                </div>
              </div>
            </div>

            {/* Visual */}
            <div className="relative hidden lg:block">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">SilentDetect Dashboard</span>
                </div>

                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-amber-800 dark:text-amber-300">Early Diabetes Risk</span>
                      <span className="text-2xl font-bold text-amber-600">68%</span>
                    </div>
                    <div className="h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                      ~3.2 years to clinical diagnosis
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center border border-red-200 dark:border-red-800">
                      <span className="material-symbols-outlined text-red-500 mb-1">trending_up</span>
                      <p className="text-xs text-red-700 dark:text-red-400">Glucose Rising</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center border border-amber-200 dark:border-amber-800">
                      <span className="material-symbols-outlined text-amber-500 mb-1">bedtime</span>
                      <p className="text-xs text-amber-700 dark:text-amber-400">Sleep Declined</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
                      <span className="material-symbols-outlined text-blue-500 mb-1">favorite</span>
                      <p className="text-xs text-blue-700 dark:text-blue-400">HDL Worsening</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white rounded-xl px-4 py-2 shadow-lg">
                <span className="material-symbols-outlined align-middle mr-1">check_circle</span>
                <span className="text-sm font-medium">AI Analysis Complete</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-white dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              The Silent Epidemic
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Millions suffer from undetected diseases until it's too late
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-3xl text-red-600">schedule</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Delayed Detection</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Most life-threatening conditions remain undiagnosed for 5+ years despite early signals.
              </p>
              <div className="text-3xl font-bold text-red-600">40-60%</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-3xl text-amber-600">pie_chart</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Fragmented Data</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Health signals scattered across lab reports, wearables, and lifestyle data with no connection.
              </p>
              <div className="text-3xl font-bold text-amber-600">12+ Sources</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-3xl text-blue-600">stethoscope</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Reactive Healthcare</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Current systems wait for symptoms to appear rather than predicting and preventing disease.
              </p>
              <div className="text-3xl font-bold text-blue-600">$3.8T Cost</div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="technology" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Our AI-Powered Solution
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Connecting the dots before diseases become critical
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'upload_file', title: 'Upload Reports', desc: 'PDF/image scanning extracts health metrics automatically' },
              { icon: 'analytics', title: 'AI Analysis', desc: 'ML models predict risk across 4+ disease categories' },
              { icon: 'body_system', title: 'Risk Mapping', desc: 'Visual body map shows affected systems at a glance' },
              { icon: 'tips_and_updates', title: 'Smart Advice', desc: 'Personalized recommendations based on your profile' },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl text-primary">{item.icon}</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Start with a free demo analysis - no account required. See what our AI can detect.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/demo')}
              className="px-8 py-4 rounded-xl text-lg font-semibold bg-white text-primary hover:bg-slate-100 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">science</span>
              Try Free Demo
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 rounded-xl text-lg font-semibold bg-slate-900 border-2 border-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg"
            >
              <span className="material-symbols-outlined">person_add</span>
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500">
            © 2026 EarlyRisk AI. All rights reserved.
          </p>
        </div>
      </footer>
    </PublicLayout>
  );
}
