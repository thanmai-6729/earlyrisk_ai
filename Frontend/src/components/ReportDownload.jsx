import { useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { supabase, getLatestAnalysis } from '../auth/supabase.js';
import { downloadReport, downloadLatestReport, triggerDownload, openInNewTab } from '../api.js';

/**
 * ReportDownload Component
 * 
 * Provides UI for downloading, printing, and sharing AI health reports.
 * Can work with a specific analysis ID or fetch the latest analysis.
 */
export default function ReportDownload({ 
  analysisId = null,
  variant = 'button', // 'button' | 'card' | 'icon'
  size = 'md', // 'sm' | 'md' | 'lg'
  showPrint = true,
  showShare = true,
  className = '',
  onDownloadStart,
  onDownloadComplete,
  onError,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null); // 'download' | 'print' | 'share'
  const [error, setError] = useState(null);

  // Get access token from Supabase
  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Please sign in to download reports');
    }
    return session.access_token;
  }, []);

  // Get analysis ID to use
  const getAnalysisId = useCallback(async () => {
    if (analysisId) return analysisId;
    
    // Fetch latest analysis if no ID provided
    if (!user?.id) throw new Error('User not authenticated');
    
    const latest = await getLatestAnalysis(user.id);
    if (!latest?.id) {
      throw new Error('No analysis found. Run a health analysis first.');
    }
    return latest.id;
  }, [analysisId, user?.id]);

  // Generate filename based on date
  const generateFilename = useCallback(() => {
    const date = new Date().toISOString().split('T')[0];
    return `EarlyriskAI_Health_Report_${date}.pdf`;
  }, []);

  // Download report
  const handleDownload = useCallback(async () => {
    setLoading(true);
    setAction('download');
    setError(null);
    onDownloadStart?.();

    try {
      const token = await getAccessToken();
      
      let blob;
      
      // If specific analysisId provided, use that endpoint
      if (analysisId) {
        blob = await downloadReport(analysisId, token, { preview: false });
      } else {
        // Use the latest report endpoint (works without Supabase analysis history)
        if (!user?.id) throw new Error('User not authenticated');
        blob = await downloadLatestReport(user.id, token, { preview: false });
      }
      
      const filename = generateFilename();
      triggerDownload(blob, filename);
      
      onDownloadComplete?.({ success: true, filename });
    } catch (err) {
      console.error('Download failed:', err);
      const message = err?.message || 'Failed to download report';
      setError(message);
      onError?.(err);
    } finally {
      setLoading(false);
      setAction(null);
    }
  }, [analysisId, user?.id, getAccessToken, generateFilename, onDownloadStart, onDownloadComplete, onError]);

  // Print report (opens in new tab for printing)
  const handlePrint = useCallback(async () => {
    setLoading(true);
    setAction('print');
    setError(null);

    try {
      const token = await getAccessToken();
      
      let blob;
      
      // If specific analysisId provided, use that endpoint
      if (analysisId) {
        blob = await downloadReport(analysisId, token, { preview: true });
      } else {
        // Use the latest report endpoint
        if (!user?.id) throw new Error('User not authenticated');
        blob = await downloadLatestReport(user.id, token, { preview: true });
      }
      
      // Open in new tab and trigger print
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    } catch (err) {
      console.error('Print failed:', err);
      const message = err?.message || 'Failed to prepare report for printing';
      setError(message);
      onError?.(err);
    } finally {
      setLoading(false);
      setAction(null);
    }
  }, [analysisId, user?.id, getAccessToken, onError]);

  // Share report (Web Share API or copy link)
  const handleShare = useCallback(async () => {
    setLoading(true);
    setAction('share');
    setError(null);

    try {
      const token = await getAccessToken();
      
      let blob;
      
      // If specific analysisId provided, use that endpoint
      if (analysisId) {
        blob = await downloadReport(analysisId, token, { preview: false });
      } else {
        // Use the latest report endpoint
        if (!user?.id) throw new Error('User not authenticated');
        blob = await downloadLatestReport(user.id, token, { preview: false });
      }
      
      const filename = generateFilename();
      
      // Check if Web Share API is available
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My Earlyrisk AI Health Report',
            text: 'Check out my AI health analysis report from Earlyrisk AI',
            files: [file],
          });
          return;
        }
      }
      
      // Fallback: Download and show instructions
      triggerDownload(blob, filename);
      
      // Show helpful message
      alert('Report downloaded! You can share the PDF via email or messaging apps.');
      
    } catch (err) {
      if (err?.name === 'AbortError') {
        // User cancelled share
        return;
      }
      console.error('Share failed:', err);
      const message = err?.message || 'Failed to share report';
      setError(message);
      onError?.(err);
    } finally {
      setLoading(false);
      setAction(null);
    }
  }, [analysisId, user?.id, getAccessToken, generateFilename, onError]);

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  // Icon only variant
  if (variant === 'icon') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          title="Download Report"
        >
          {loading && action === 'download' ? (
            <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-lg">download</span>
          )}
        </button>
        
        {showPrint && (
          <button
            onClick={handlePrint}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Print Report"
          >
            {loading && action === 'print' ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-lg">print</span>
            )}
          </button>
        )}
        
        {showShare && (
          <button
            onClick={handleShare}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Share Report"
          >
            {loading && action === 'share' ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-lg">share</span>
            )}
          </button>
        )}
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-primary">description</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 mb-1">Download Health Report</h3>
            <p className="text-sm text-slate-500 mb-4">
              Get a professional PDF report of your AI health analysis.
            </p>
            
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDownload}
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && action === 'download' ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">download</span>
                    Download PDF
                  </>
                )}
              </button>
              
              {showPrint && (
                <button
                  onClick={handlePrint}
                  disabled={loading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && action === 'print' ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">print</span>
                      Print
                    </>
                  )}
                </button>
              )}
              
              {showShare && (
                <button
                  onClick={handleShare}
                  disabled={loading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && action === 'share' ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Preparing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">share</span>
                      Share
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <div className={`inline-flex flex-wrap gap-2 ${className}`}>
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 ${sizeClasses[size]}`}
      >
        {loading && action === 'download' ? (
          <>
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Generating...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">download</span>
            Download Report
          </>
        )}
      </button>
      
      {showPrint && (
        <button
          onClick={handlePrint}
          disabled={loading}
          className={`border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2 ${sizeClasses[size]}`}
        >
          {loading && action === 'print' ? (
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined">print</span>
          )}
          Print
        </button>
      )}
      
      {showShare && (
        <button
          onClick={handleShare}
          disabled={loading}
          className={`border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2 ${sizeClasses[size]}`}
        >
          {loading && action === 'share' ? (
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined">share</span>
          )}
          Share
        </button>
      )}
      
      {error && (
        <div className="w-full mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
