import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Throwing here makes misconfig obvious during dev.
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Storage bucket names
export const MEDICAL_UPLOADS_BUCKET = 'medical-uploads';
export const AVATARS_BUCKET = 'avatars';

// ============================================
// Profile Functions
// ============================================

/**
 * Get current user's profile from the profiles table
 * @returns {Promise<Object|null>} Profile data or null
 */
export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
}

/**
 * Get a user's profile by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Profile data or null
 */
export async function getProfileById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
}

/**
 * Create or update user profile
 * @param {Object} profileData - Profile fields to upsert
 * @returns {Promise<Object>} Updated profile
 */
export async function upsertProfile(profileData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      ...profileData,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting profile:', error);
    throw error;
  }

  return data;
}

/**
 * Update specific profile fields
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated profile
 */
export async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}

/**
 * Upload avatar to Supabase Storage
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} Public URL of the avatar
 */
export async function uploadAvatar(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // Delete old avatar if exists
  try {
    const { data: files } = await supabase.storage
      .from(AVATARS_BUCKET)
      .list(user.id);
    
    if (files && files.length > 0) {
      const filesToRemove = files.map(f => `${user.id}/${f.name}`);
      await supabase.storage.from(AVATARS_BUCKET).remove(filesToRemove);
    }
  } catch (e) {
    console.warn('Could not clean old avatars:', e);
  }

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Avatar upload error:', uploadError);
    throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  }

  // Get public URL
  const { data } = supabase.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/**
 * Get the display name from profile or user metadata
 * Priority: profile.username > profile.full_name > user_metadata > email
 * @param {Object} profile - Profile from database
 * @param {Object} user - Auth user object
 * @returns {string} Display name
 */
export function getDisplayNameFromProfile(profile, user) {
  if (profile?.username) return profile.username;
  if (profile?.full_name) return profile.full_name;
  
  if (user?.user_metadata) {
    const meta = user.user_metadata;
    if (meta.username) return meta.username;
    if (meta.full_name) return meta.full_name;
    if (meta.name) return meta.name;
  }
  
  // Never return email as display name - use 'User' instead
  return 'User';
}

/**
 * Get health profile data formatted for FastAPI
 * @param {Object} profile - Profile from database
 * @returns {Object} Health data for analysis
 */
export function getHealthDataFromProfile(profile) {
  if (!profile) return {};
  
  return {
    age: profile.age || 30,
    gender: profile.gender || 'other',
    height_cm: profile.height_cm || 170,
    weight_kg: profile.weight_kg || 70,
    sleep_hours: profile.sleep_hours || 7,
    exercise_mins_per_week: profile.exercise_mins_per_week || 120,
    stress_level: profile.stress_level || 5,
    family_history: profile.family_history || 0,
  };
}

/**
 * Upload a medical file to Supabase Storage
 * Files are stored in user-specific folders for security
 * 
 * @param {File} file - The file to upload
 * @param {string} userId - User ID for folder isolation
 * @returns {Promise<{url: string, path: string}>} - Public URL and storage path
 */
export async function uploadMedicalFile(file, userId) {
  if (!file || !userId) {
    throw new Error('File and userId are required');
  }

  // Generate unique filename to avoid collisions
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${timestamp}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(MEDICAL_UPLOADS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get signed URL for the uploaded file (valid for 1 hour)
  const { data: urlData, error: urlError } = await supabase.storage
    .from(MEDICAL_UPLOADS_BUCKET)
    .createSignedUrl(filePath, 3600);

  if (urlError) {
    console.error('URL generation error:', urlError);
    throw new Error(`Failed to generate file URL: ${urlError.message}`);
  }

  return {
    url: urlData.signedUrl,
    path: filePath,
  };
}

/**
 * Save medical file metadata to the database
 * 
 * @param {Object} metadata - File metadata
 * @returns {Promise<Object>} - Inserted record
 */
export async function saveMedicalFileMetadata({
  userId,
  fileName,
  fileUrl,
  fileType,
  extractedData = {},
  analysisResult = null,
  status = 'pending',
}) {
  const { data, error } = await supabase
    .from('medical_files')
    .insert({
      user_id: userId,
      file_name: fileName,
      file_url: fileUrl,
      file_type: fileType,
      extracted_data: extractedData,
      analysis_result: analysisResult,
      status: status,
    })
    .select()
    .single();

  if (error) {
    console.error('Database insert error:', error);
    throw new Error(`Failed to save file metadata: ${error.message}`);
  }

  return data;
}

/**
 * Update medical file record with analysis results
 * 
 * @param {string} fileId - UUID of the file record
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated record
 */
export async function updateMedicalFile(fileId, updates) {
  const { data, error } = await supabase
    .from('medical_files')
    .update(updates)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    console.error('Database update error:', error);
    throw new Error(`Failed to update file record: ${error.message}`);
  }

  return data;
}

/**
 * Get all medical files for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of file records
 */
export async function getUserMedicalFiles(userId) {
  const { data, error } = await supabase
    .from('medical_files')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Database query error:', error);
    throw new Error(`Failed to fetch medical files: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete a medical file (both storage and database record)
 * 
 * @param {string} fileId - UUID of the file record
 * @param {string} filePath - Storage path of the file
 * @returns {Promise<void>}
 */
export async function deleteMedicalFile(fileId, filePath) {
  // Delete from storage
  if (filePath) {
    const { error: storageError } = await supabase.storage
      .from(MEDICAL_UPLOADS_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.warn('Storage delete warning:', storageError);
    }
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('medical_files')
    .delete()
    .eq('id', fileId);

  if (dbError) {
    throw new Error(`Failed to delete file record: ${dbError.message}`);
  }
}

// ============================================
// Analysis History Functions
// ============================================

/**
 * Save analysis result to history
 * @param {Object} params - Analysis data to save
 * @param {string} params.userId - User ID
 * @param {Object} params.inputData - Input health metrics
 * @param {Object} params.analysisResult - Full analysis result from API
 * @param {string} [params.source='form'] - Source of analysis (form, document_scan)
 * @returns {Promise<Object>} Saved record
 */
export async function saveAnalysisHistory({
  userId,
  inputData,
  analysisResult,
  source = 'form'
}) {
  // Calculate BMI if height and weight available
  const heightM = (inputData.height_cm || 0) / 100;
  const bmi = heightM > 0 ? (inputData.weight_kg || 0) / (heightM * heightM) : null;
  
  // Calculate overall risk as average of main risks
  const diabetesRisk = analysisResult.diabetesRisk || 0;
  const heartRisk = analysisResult.heartRisk || 0;
  const liverRisk = analysisResult.liverRisk || 0;
  const depressionRisk = analysisResult.depressionRisk || 0;
  const overallRisk = (diabetesRisk + heartRisk + liverRisk + depressionRisk) / 4;

  const record = {
    user_id: userId,
    analyzed_at: new Date().toISOString(),
    
    // Input metrics
    age: inputData.age || null,
    gender: inputData.gender || null,
    height_cm: inputData.height_cm || null,
    weight_kg: inputData.weight_kg || null,
    bp_systolic: inputData.bp_systolic || null,
    bp_diastolic: inputData.bp_diastolic || null,
    sugar_mgdl: inputData.sugar_mgdl || null,
    hba1c_pct: inputData.hba1c_pct || null,
    cholesterol_mgdl: inputData.cholesterol_mgdl || null,
    sleep_hours: inputData.sleep_hours || null,
    exercise_mins_per_week: inputData.exercise_mins_per_week || null,
    stress_level: inputData.stress_level || null,
    family_history: inputData.family_history || 0,
    
    // Computed
    bmi: bmi ? Math.round(bmi * 10) / 10 : null,
    
    // Risk scores
    diabetes_risk: diabetesRisk,
    heart_risk: heartRisk,
    liver_risk: liverRisk,
    depression_risk: depressionRisk,
    overall_risk: Math.round(overallRisk * 10) / 10,
    
    // Source and full result
    source,
    full_analysis: analysisResult
  };

  const { data, error } = await supabase
    .from('analysis_history')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Error saving analysis history:', error);
    throw new Error(`Failed to save analysis: ${error.message}`);
  }

  return data;
}

/**
 * Get user's analysis history for risk trends
 * @param {string} userId - User ID
 * @param {number} [limit=12] - Max records to return
 * @returns {Promise<Array>} Analysis history records (oldest first for charting)
 */
export async function getAnalysisHistory(userId, limit = 12) {
  const { data, error } = await supabase
    .from('analysis_history')
    .select(`
      id,
      analyzed_at,
      diabetes_risk,
      heart_risk,
      liver_risk,
      depression_risk,
      overall_risk,
      bmi,
      bp_systolic,
      bp_diastolic,
      sugar_mgdl,
      source
    `)
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching analysis history:', error);
    throw new Error(`Failed to fetch analysis history: ${error.message}`);
  }

  // Return in chronological order (oldest first) for charting
  return (data || []).reverse();
}

/**
 * Get latest analysis for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Latest analysis record or null
 */
export async function getLatestAnalysis(userId) {
  const { data, error } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching latest analysis:', error);
    throw new Error(`Failed to fetch latest analysis: ${error.message}`);
  }

  return data;
}

/**
 * Get risk trend data formatted for the RiskTrends chart
 * @param {string} userId - User ID
 * @param {number} [months=12] - Number of months of data
 * @returns {Promise<Object>} Formatted trend data
 */
export async function getRiskTrendData(userId, months = 12) {
  const history = await getAnalysisHistory(userId, months);
  
  if (!history || history.length === 0) {
    return null;
  }

  // Format for chart consumption
  return {
    timestamps: history.map(h => h.analyzed_at),
    diabetes: history.map(h => (h.diabetes_risk || 0) / 100), // Convert to decimal
    heart: history.map(h => (h.heart_risk || 0) / 100),
    liver: history.map(h => (h.liver_risk || 0) / 100),
    depression: history.map(h => (h.depression_risk || 0) / 100),
    overall: history.map(h => (h.overall_risk || 0) / 100),
    count: history.length
  };
}

