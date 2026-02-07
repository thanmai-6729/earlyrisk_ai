import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PrivateLayout from '../components/PrivateLayout.jsx';
import MedicalDocumentUpload from '../components/MedicalDocumentUpload.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { getUserMedicalFiles } from '../auth/supabase.js';

export default function Upload() {
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const [recentFiles, setRecentFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [scanResult, setScanResult] = useState(null);

  // Load user's recent uploads
  useEffect(() => {
    async function loadRecentFiles() {
      if (!user?.id) return;
      
      setLoadingFiles(true);
      try {
        const files = await getUserMedicalFiles(user.id);
        setRecentFiles(files.slice(0, 5)); // Show only last 5
      } catch (err) {
        console.error('Failed to load recent files:', err);
      } finally {
        setLoadingFiles(false);
      }
    }

    loadRecentFiles();
  }, [user?.id]);

  // Get user profile for analysis context
  const userProfile = {
    age: 30,
    gender: 'other',
    height_cm: 170,
    weight_kg: 70,
    sleep_hours: 7,
    exercise_mins_per_week: 120,
    stress_level: 5,
    family_history: 0,
  };

  const handleScanComplete = useCallback((result, fileRecord) => {
    setScanResult(result);
    
    if (fileRecord) {
      setRecentFiles((prev) => [fileRecord, ...prev].slice(0, 5));
    }
  }, []);

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complete' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <PrivateLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Medical Document Scanner
        </h1>
        <p className="text-slate-500">
          Upload lab reports, prescriptions, or medical documents for AI-powered health analysis
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Upload Section */}
        <div className="lg:col-span-2">
          <MedicalDocumentUpload
            onScanComplete={handleScanComplete}
            userProfile={userProfile}
          />

          {/* View Results CTA */}
          <AnimatePresence>
            {scanResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-6"
              >
                <button
                  onClick={() => navigate('/app')}
                  className="w-full py-4 px-6 rounded-xl font-semibold bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">dashboard</span>
                  View Full Dashboard with Results
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Uploads */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Recent Uploads
            </h3>

            {loadingFiles ? (
              <div className="py-4 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : recentFiles.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No uploads yet. Your scanned documents will appear here.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentFiles.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <span className="material-symbols-outlined text-slate-400">
                      {file.file_type === 'pdf' ? 'picture_as_pdf' : 
                       file.file_type === 'csv' ? 'table_chart' : 'image'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {file.file_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(file.uploaded_at)}
                      </p>
                    </div>
                    {getStatusBadge(file.status)}
                  </li>
                ))}
              </ul>
            )}

            {recentFiles.length > 0 && (
              <button
                onClick={() => navigate('/app/reports')}
                className="mt-4 w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg font-medium transition-colors"
              >
                View All Reports →
              </button>
            )}
          </div>

          {/* Supported Formats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              Supported Formats
            </h3>
            <ul className="space-y-3 text-slate-600 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                </div>
                <div>
                  <span className="font-medium">PDF Documents</span>
                  <p className="text-xs text-slate-400">Lab reports, prescriptions</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-500">table_chart</span>
                </div>
                <div>
                  <span className="font-medium">CSV Files</span>
                  <p className="text-xs text-slate-400">Health data exports</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-500">image</span>
                </div>
                <div>
                  <span className="font-medium">Images (PNG, JPG)</span>
                  <p className="text-xs text-slate-400">Scanned reports, photos</p>
                </div>
              </li>
            </ul>
          </div>

          {/* What We Extract */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">biotech</span>
              AI Extracts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                'Blood Sugar',
                'HbA1c',
                'Cholesterol',
                'Blood Pressure',
                'Hemoglobin',
                'Liver Function',
                'Kidney Function',
                'Thyroid (TSH)',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-slate-600">
                  <span className="material-symbols-outlined text-xs text-green-500">check</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <h3 className="text-green-700 font-semibold mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined">shield</span>
              Your Privacy Matters
            </h3>
            <p className="text-green-600 text-sm">
              All uploads are encrypted and stored securely. Your medical data is never shared 
              with third parties. You can delete your files at any time.
            </p>
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
}
