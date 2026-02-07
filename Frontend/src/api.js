const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/**
 * Download a health report PDF for a specific analysis
 * 
 * @param {string} analysisId - UUID of the analysis record
 * @param {string} accessToken - Supabase access token for authentication
 * @param {Object} options - Download options
 * @param {boolean} [options.preview=false] - If true, opens PDF in browser instead of downloading
 * @returns {Promise<Blob>} - PDF blob for download/preview
 */
export async function downloadReport(analysisId, accessToken, { preview = false } = {}) {
  const endpoint = preview ? 'preview' : '';
  const url = `${API_BASE}/report/${encodeURIComponent(analysisId)}${endpoint ? `/${endpoint}` : ''}`;
  
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(errorText || `HTTP ${resp.status}`);
  }
  
  return await resp.blob();
}

/**
 * Download a health report PDF from the latest patient analysis
 * This endpoint works without Supabase analysis history - uses local CSV data
 * 
 * @param {string} patientId - Patient/User ID
 * @param {string} accessToken - Supabase access token for authentication
 * @param {Object} options - Download options
 * @param {boolean} [options.preview=false] - If true, opens PDF in browser instead of downloading
 * @returns {Promise<Blob>} - PDF blob for download/preview
 */
export async function downloadLatestReport(patientId, accessToken, { preview = false } = {}) {
  const endpoint = preview ? '/preview' : '';
  const url = `${API_BASE}/report/latest/${encodeURIComponent(patientId)}${endpoint}`;
  
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(errorText || `HTTP ${resp.status}`);
  }
  
  return await resp.blob();
}

/**
 * Get list of user's analysis history for report selection
 * 
 * @param {string} accessToken - Supabase access token
 * @param {number} [limit=20] - Max number of analyses to return
 * @returns {Promise<Object>} - List of analyses with metadata
 */
export async function getUserAnalyses(accessToken, limit = 20) {
  const resp = await fetch(`${API_BASE}/user/analyses?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(errorText || `HTTP ${resp.status}`);
  }
  
  return await resp.json();
}

/**
 * Helper to trigger browser download of a blob
 * 
 * @param {Blob} blob - File blob to download
 * @param {string} filename - Suggested filename
 */
export function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Helper to open blob in new tab for preview/print
 * 
 * @param {Blob} blob - File blob to preview
 */
export function openInNewTab(blob) {
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Note: URL will be revoked when tab is closed
}

export async function analyzeHealth(payload, { persist = true } = {}) {
  const resp = await fetch(`${API_BASE}/analyze-health?persist=${persist ? 'true' : 'false'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return await resp.json();
}

export async function uploadReport({ file, payload }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('payload_json', JSON.stringify(payload));

  const resp = await fetch(`${API_BASE}/upload-report`, {
    method: 'POST',
    body: fd,
  });
  if (!resp.ok) throw new Error(await resp.text());
  return await resp.json();
}

export async function getPatientHistory(patientId) {
  const resp = await fetch(`${API_BASE}/patient-history/${encodeURIComponent(patientId)}`);
  if (!resp.ok) throw new Error(await resp.text());
  return await resp.json();
}

export async function getPatientLatest(patientId) {
  const resp = await fetch(`${API_BASE}/patient-latest/${encodeURIComponent(patientId)}`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(await resp.text());
  return await resp.json();
}

/**
 * Scan a medical document via Supabase Storage URL
 * This is the main document scanning endpoint that:
 * 1. Downloads the file from Supabase Storage
 * 2. Extracts health metrics using OCR/parsing
 * 3. Normalizes values
 * 4. Runs AI analysis
 * 
 * @param {Object} payload - Scan request payload
 * @param {string} payload.file_url - Signed URL to the file in Supabase Storage
 * @param {string} payload.file_type - File type: pdf, csv, png, jpg
 * @param {string} payload.user_id - User ID for tracking
 * @param {number} [payload.age] - User age for analysis
 * @param {string} [payload.gender] - User gender
 * @param {number} [payload.height_cm] - Height in cm
 * @param {number} [payload.weight_kg] - Weight in kg
 * @returns {Promise<Object>} - Scan results with extracted values and risk scores
 */
export async function scanDocument(payload) {
  const resp = await fetch(`${API_BASE}/scan-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(errorText || `HTTP ${resp.status}`);
  }
  
  return await resp.json();
}

/**
 * Alternative: Upload and scan a file directly (without Supabase Storage)
 * Useful for testing or when Storage is not available
 * 
 * @param {File} file - The file to scan
 * @param {string} userId - User ID
 * @param {Object} [profile] - Optional user profile data
 * @returns {Promise<Object>} - Scan results
 */
export async function scanDocumentDirect(file, userId, profile = {}) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('user_id', userId);
  
  if (profile.age) fd.append('age', String(profile.age));
  if (profile.gender) fd.append('gender', profile.gender);
  if (profile.height_cm) fd.append('height_cm', String(profile.height_cm));
  if (profile.weight_kg) fd.append('weight_kg', String(profile.weight_kg));

  const resp = await fetch(`${API_BASE}/scan-document-upload`, {
    method: 'POST',
    body: fd,
  });
  
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(errorText || `HTTP ${resp.status}`);
  }
  
  return await resp.json();
}

/**
 * Get list of user's uploaded medical files
 * Note: This queries Supabase directly, not the FastAPI backend
 * Use the functions in supabase.js instead for full Supabase integration
 */
export async function getMedicalFiles(userId) {
  // This would typically call a backend endpoint
  // For now, return empty array - use supabase.js functions
  console.warn('getMedicalFiles: Use getUserMedicalFiles from supabase.js instead');
  return [];
}

/**
 * Sync health profile data with the FastAPI backend
 * This ensures the backend has the latest user health data for analysis
 * 
 * @param {Object} profileData - User health profile
 * @param {string} profileData.patient_id - User/patient ID
 * @param {number} profileData.age - Age in years
 * @param {string} profileData.gender - Gender
 * @param {number} profileData.height_cm - Height in cm
 * @param {number} profileData.weight_kg - Weight in kg
 * @param {number} [profileData.sleep_hours] - Hours of sleep per day
 * @param {number} [profileData.exercise_mins_per_week] - Exercise minutes per week
 * @param {number} [profileData.stress_level] - Stress level 1-10
 * @param {number} [profileData.family_history] - Family history flag (0 or 1)
 * @returns {Promise<Object>} - Sync result
 */
export async function syncHealthProfile(profileData) {
  // Use analyze-health endpoint with persist=true to store the profile
  // This creates a baseline record for the user
  const payload = {
    patient_id: profileData.patient_id,
    patient_name: profileData.full_name || 'User',
    age: profileData.age || 30,
    gender: profileData.gender || 'other',
    height_cm: profileData.height_cm || 170,
    weight_kg: profileData.weight_kg || 70,
    sleep_hours: profileData.sleep_hours || 7,
    exercise_mins_per_week: profileData.exercise_mins_per_week || 120,
    stress_level: profileData.stress_level || 5,
    family_history: profileData.family_history || 0,
    // Default health metrics - can be overridden by document scans
    bp_systolic: 120,
    bp_diastolic: 80,
    sugar_mgdl: 100,
    hba1c_pct: 5.5,
    cholesterol_mgdl: 180,
  };

  const resp = await fetch(`${API_BASE}/analyze-health?persist=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(errorText || `HTTP ${resp.status}`);
  }

  return await resp.json();
}

