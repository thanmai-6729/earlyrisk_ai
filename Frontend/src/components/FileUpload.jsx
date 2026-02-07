import { useCallback, useRef, useState } from 'react';

export default function FileUpload({
  onUpload,
  accept = '.pdf,.png,.jpg,.jpeg',
  disabled = false,
  label = 'Upload Report',
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const inputRef = useRef(null);

  const handleFileChange = useCallback((e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setStatus(f ? `Selected: ${f.name}` : '');
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || disabled || loading) return;

    setLoading(true);
    setStatus('Uploading & scanning…');

    try {
      await onUpload?.(file);
      setStatus('Upload complete!');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setStatus(`Error: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [file, disabled, loading, onUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      setFile(f);
      setStatus(`Selected: ${f.name}`);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        <span className="material-symbols-outlined align-middle mr-2 text-primary">upload_file</span>
        {label}
      </h3>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500 mb-2">
          cloud_upload
        </span>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Drag & drop or click to select a file
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Supports: PDF, PNG, JPG
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled || loading}
          className="hidden"
        />
      </div>

      {/* Status */}
      {status && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{status}</p>
      )}

      {/* Upload Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleUpload}
          disabled={!file || disabled || loading}
          className="px-4 py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {loading && (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span className="material-symbols-outlined text-lg">upload</span>
          Upload & Analyze
        </button>
      </div>
    </div>
  );
}
