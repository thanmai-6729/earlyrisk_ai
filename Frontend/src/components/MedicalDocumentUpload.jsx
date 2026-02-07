import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/useAuth';
import { uploadMedicalFile, saveMedicalFileMetadata, updateMedicalFile } from '../auth/supabase';
import { scanDocument as scanDocumentAPI } from '../api';

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function MedicalDocumentUpload({ onScanComplete, userProfile = {} }) {
  const { user } = useAuth();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [scanResult, setScanResult] = useState(null);

  const resetState = useCallback(() => {
    setFile(null);
    setProgress(0);
    setStatus({ type: '', message: '' });
    setScanResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const validateFile = useCallback((file) => {
    if (!file) return 'No file selected';

    const fileType = ACCEPTED_TYPES[file.type];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!fileType && !['pdf', 'csv', 'png', 'jpg', 'jpeg'].includes(ext)) {
      return 'Invalid file type. Please upload PDF, CSV, PNG, or JPG files.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }

    return null;
  }, []);

  const handleFileSelect = useCallback((selectedFile) => {
    const error = validateFile(selectedFile);
    if (error) {
      setStatus({ type: 'error', message: error });
      return;
    }

    setFile(selectedFile);
    setStatus({ type: '', message: '' });
    setScanResult(null);
  }, [validateFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const getFileType = (file) => {
    const mimeType = ACCEPTED_TYPES[file.type];
    if (mimeType) return mimeType;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['pdf', 'csv', 'png', 'jpg', 'jpeg'].includes(ext)) return ext;

    return 'pdf'; // Default fallback
  };

  const handleUploadAndScan = useCallback(async () => {
    if (!file || !user?.id) {
      setStatus({ type: 'error', message: 'Please select a file first' });
      return;
    }

    const userId = user.id;
    const fileType = getFileType(file);
    let fileRecord = null;

    try {
      // Phase 1: Upload to Supabase Storage
      setUploading(true);
      setProgress(10);
      setStatus({ type: 'info', message: 'Uploading file to secure storage...' });

      const { url, path } = await uploadMedicalFile(file, userId);
      setProgress(30);

      // Phase 2: Save metadata to database
      setStatus({ type: 'info', message: 'Saving file metadata...' });
      fileRecord = await saveMedicalFileMetadata({
        userId,
        fileName: file.name,
        fileUrl: url,
        fileType,
        status: 'processing',
      });
      setProgress(40);
      setUploading(false);

      // Phase 3: Scan document via FastAPI
      setScanning(true);
      setStatus({ type: 'info', message: 'AI is scanning your document...' });

      const scanPayload = {
        file_url: url,
        file_type: fileType,
        user_id: userId,
        // Include user profile data for better analysis
        age: userProfile.age || 30,
        gender: userProfile.gender || 'other',
        height_cm: userProfile.height_cm || 170,
        weight_kg: userProfile.weight_kg || 70,
        sleep_hours: userProfile.sleep_hours || 7,
        exercise_mins_per_week: userProfile.exercise_mins_per_week || 120,
        stress_level: userProfile.stress_level || 5,
        family_history: userProfile.family_history || 0,
      };

      setProgress(60);
      const result = await scanDocumentAPI(scanPayload);
      setProgress(90);

      // Phase 4: Update database with results
      setStatus({ type: 'info', message: 'Saving analysis results...' });
      await updateMedicalFile(fileRecord.id, {
        extracted_data: result.extracted_values || {},
        analysis_result: {
          diabetesRisk: result.diabetesRisk,
          heartRisk: result.heartRisk,
          liverRisk: result.liverRisk,
          depressionRisk: result.depressionRisk,
          advice: result.advice,
        },
        status: 'completed',
      });

      setProgress(100);
      setScanResult(result);
      setStatus({
        type: 'success',
        message: `Scan complete! ${Object.keys(result.normalized_values || {}).length} values extracted.`,
      });

      // Notify parent component
      if (onScanComplete) {
        onScanComplete(result, fileRecord);
      }

    } catch (error) {
      console.error('Upload/scan error:', error);
      setStatus({
        type: 'error',
        message: error?.message || 'An error occurred during upload or scanning',
      });

      // Update file record with error status
      if (fileRecord?.id) {
        try {
          await updateMedicalFile(fileRecord.id, {
            status: 'failed',
            error_message: error?.message || 'Unknown error',
          });
        } catch {
          // Ignore update error
        }
      }
    } finally {
      setUploading(false);
      setScanning(false);
    }
  }, [file, user, userProfile, onScanComplete]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'csv':
        return 'table_chart';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'image';
      default:
        return 'description';
    }
  };

  const isProcessing = uploading || scanning;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">document_scanner</span>
          Medical Document Scanner
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload lab reports, prescriptions, or medical documents for AI analysis
        </p>
      </div>

      {/* Drop Zone */}
      <div className="p-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isProcessing && inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragActive
              ? 'border-primary bg-primary/5'
              : 'border-slate-300 hover:border-primary hover:bg-slate-50'
            }
            ${isProcessing ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,.png,.jpg,.jpeg"
            onChange={handleInputChange}
            disabled={isProcessing}
            className="hidden"
          />

          {!file ? (
            <>
              <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">
                cloud_upload
              </span>
              <p className="text-slate-600 font-medium">
                {dragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Supports: PDF, CSV, PNG, JPG (max 10MB)
              </p>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-primary">
                  {getFileIcon(file.name)}
                </span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              {!isProcessing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetState();
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-slate-500 mt-2 text-center">{progress}%</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Message */}
        <AnimatePresence mode="wait">
          {status.message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
                status.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : status.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  status.type === 'error'
                    ? 'text-red-500'
                    : status.type === 'success'
                    ? 'text-green-500'
                    : 'text-blue-500'
                }`}
              >
                {status.type === 'error' ? 'error' : status.type === 'success' ? 'check_circle' : 'info'}
              </span>
              <p
                className={`text-sm ${
                  status.type === 'error'
                    ? 'text-red-700'
                    : status.type === 'success'
                    ? 'text-green-700'
                    : 'text-blue-700'
                }`}
              >
                {status.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <button
          onClick={handleUploadAndScan}
          disabled={!file || isProcessing}
          className="mt-6 w-full py-3 px-6 rounded-xl font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {uploading ? 'Uploading...' : 'Scanning...'}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">document_scanner</span>
              Upload & Scan Document
            </>
          )}
        </button>
      </div>

      {/* Scan Results */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-100"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">check_circle</span>
                Scan Results
              </h3>

              {/* Extracted Values */}
              {scanResult.normalized_values && Object.keys(scanResult.normalized_values).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-2">Extracted Values</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(scanResult.normalized_values).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                      >
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-lg font-semibold text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Scores */}
              {(scanResult.diabetesRisk || scanResult.heartRisk || scanResult.liverRisk) && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-2">Risk Assessment</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'diabetesRisk', label: 'Diabetes', icon: 'bloodtype' },
                      { key: 'heartRisk', label: 'Heart', icon: 'favorite' },
                      { key: 'liverRisk', label: 'Liver', icon: 'gastroenterology' },
                      { key: 'depressionRisk', label: 'Depression', icon: 'psychology' },
                    ].map(({ key, label, icon }) => {
                      const value = scanResult[key];
                      if (value == null) return null;
                      const riskLevel =
                        value < 35 ? 'low' : value < 70 ? 'medium' : 'high';
                      const colors = {
                        low: 'bg-green-50 text-green-700 border-green-200',
                        medium: 'bg-amber-50 text-amber-700 border-amber-200',
                        high: 'bg-red-50 text-red-700 border-red-200',
                      };

                      return (
                        <div
                          key={key}
                          className={`rounded-lg p-3 border ${colors[riskLevel]}`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className="material-symbols-outlined text-sm">{icon}</span>
                            <span className="text-xs font-medium">{label}</span>
                          </div>
                          <p className="text-xl font-bold">{Math.round(value)}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {scanResult.warnings?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Warnings
                  </h4>
                  <ul className="text-sm text-amber-600 space-y-1">
                    {scanResult.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confidence Score */}
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-sm">verified</span>
                Extraction confidence: {Math.round((scanResult.confidence || 0) * 100)}%
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
