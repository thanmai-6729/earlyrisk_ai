import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PrivateLayout from '../components/PrivateLayout.jsx';
import { useAuth, getUserInitials } from '../auth/AuthContext.jsx';
import { updateProfile, uploadAvatar } from '../auth/supabase.js';
import { syncHealthProfile } from '../api.js';

/**
 * Settings Page - Editable user profile
 */
export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, profileLoading, displayName, avatarUrl, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    age: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    sleep_hours: '',
    exercise_mins_per_week: '',
    stress_level: '',
    family_history: 0,
    notification_email: true,
    notification_push: true,
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        age: profile.age || '',
        gender: profile.gender || '',
        height_cm: profile.height_cm || '',
        weight_kg: profile.weight_kg || '',
        sleep_hours: profile.sleep_hours || 7,
        exercise_mins_per_week: profile.exercise_mins_per_week || 120,
        stress_level: profile.stress_level || 5,
        family_history: profile.family_history || 0,
        notification_email: profile.notification_email !== false,
        notification_push: profile.notification_push !== false,
      });
    }
  }, [profile]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    try {
      const newUrl = await uploadAvatar(avatarFile);
      await updateProfile({ avatar_url: newUrl });
      await refreshProfile();
      setAvatarFile(null);
      setAvatarPreview(null);
      showToast('Avatar updated successfully!');
    } catch (err) {
      console.error('Avatar upload error:', err);
      showToast(err.message || 'Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare data (excluding notification fields that may not exist in DB)
      const updates = {
        username: formData.username.trim() || null,
        full_name: formData.full_name.trim() || null,
        age: formData.age ? parseInt(formData.age, 10) : null,
        gender: formData.gender || null,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        sleep_hours: formData.sleep_hours ? parseFloat(formData.sleep_hours) : 7,
        exercise_mins_per_week: formData.exercise_mins_per_week ? parseInt(formData.exercise_mins_per_week, 10) : 120,
        stress_level: formData.stress_level ? parseInt(formData.stress_level, 10) : 5,
        family_history: formData.family_history ? 1 : 0,
      };

      // Update profile in Supabase
      await updateProfile(updates);

      // Sync health data with FastAPI
      try {
        await syncHealthProfile({
          patient_id: user.id,
          age: updates.age || 30,
          gender: updates.gender || 'other',
          height_cm: updates.height_cm || 170,
          weight_kg: updates.weight_kg || 70,
          sleep_hours: updates.sleep_hours || 7,
          exercise_mins_per_week: updates.exercise_mins_per_week || 120,
          stress_level: updates.stress_level || 5,
          family_history: updates.family_history || 0,
        });
      } catch (syncErr) {
        console.warn('Could not sync with backend:', syncErr);
      }

      // Refresh context
      await refreshProfile();

      showToast('Settings saved successfully!');
      
      // Navigate to dashboard after successful save
      setTimeout(() => {
        navigate('/app');
      }, 500);
    } catch (err) {
      console.error('Save error:', err);
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initials = getUserInitials(displayName);

  if (profileLoading) {
    return (
      <PrivateLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
        </div>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Settings</h1>
          <p className="text-slate-500">Manage your account settings and health profile</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {[
            { id: 'profile', label: 'Profile', icon: 'person' },
            { id: 'health', label: 'Health Info', icon: 'favorite' },
            { id: 'notifications', label: 'Notifications', icon: 'notifications' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Avatar Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-slate-800 font-semibold mb-4">Profile Picture</h3>

              <div className="text-center">
                {/* Avatar Preview */}
                {avatarPreview || avatarUrl ? (
                  <img
                    src={avatarPreview || avatarUrl}
                    alt={displayName}
                    className="w-32 h-32 rounded-2xl mx-auto mb-4 object-cover ring-4 ring-slate-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-slate-100">
                    {initials}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />

                <div className="space-y-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 px-4 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">photo_camera</span>
                    Choose Photo
                  </button>

                  {avatarFile && (
                    <button
                      onClick={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="w-full py-2 px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {uploadingAvatar ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">cloud_upload</span>
                          Upload
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="text-slate-400 text-xs mt-3">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-2">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
              >
                <h3 className="text-slate-800 font-semibold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Personal Information
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter username"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <p className="text-slate-400 text-xs mt-1">This will be your display name</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-slate-400 text-xs mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="Enter age"
                      min="1"
                      max="120"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Gender
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: 'male', label: 'Male' },
                        { value: 'female', label: 'Female' },
                        { value: 'other', label: 'Other' },
                        { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                            formData.gender === option.value
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value={option.value}
                            checked={formData.gender === option.value}
                            onChange={handleInputChange}
                            className="sr-only"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Health Tab */}
            {activeTab === 'health' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
              >
                <h3 className="text-slate-800 font-semibold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">favorite</span>
                  Health Information
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      name="height_cm"
                      value={formData.height_cm}
                      onChange={handleInputChange}
                      placeholder="e.g., 170"
                      min="50"
                      max="250"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      name="weight_kg"
                      value={formData.weight_kg}
                      onChange={handleInputChange}
                      placeholder="e.g., 70"
                      min="20"
                      max="300"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sleep Hours (per day)
                    </label>
                    <input
                      type="number"
                      name="sleep_hours"
                      value={formData.sleep_hours}
                      onChange={handleInputChange}
                      placeholder="e.g., 7"
                      min="1"
                      max="24"
                      step="0.5"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Exercise (minutes/week)
                    </label>
                    <input
                      type="number"
                      name="exercise_mins_per_week"
                      value={formData.exercise_mins_per_week}
                      onChange={handleInputChange}
                      placeholder="e.g., 120"
                      min="0"
                      max="1200"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Stress Level (1-10)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        name="stress_level"
                        value={formData.stress_level}
                        onChange={handleInputChange}
                        min="1"
                        max="10"
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="w-8 text-center font-medium text-slate-700">
                        {formData.stress_level}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="family_history"
                        checked={!!formData.family_history}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            family_history: e.target.checked ? 1 : 0,
                          }))
                        }
                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="text-slate-700">
                        Family history of chronic diseases (diabetes, heart disease, etc.)
                      </span>
                    </label>
                  </div>
                </div>

                {/* BMI Display */}
                {formData.height_cm && formData.weight_kg && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Calculated BMI</span>
                      <span className="text-xl font-bold text-slate-800">
                        {(
                          parseFloat(formData.weight_kg) /
                          Math.pow(parseFloat(formData.height_cm) / 100, 2)
                        ).toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
              >
                <h3 className="text-slate-800 font-semibold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">notifications</span>
                  Notification Preferences
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-500">email</span>
                      <div>
                        <span className="font-medium text-slate-700 block">Email Notifications</span>
                        <span className="text-slate-400 text-sm">Receive health alerts via email</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      name="notification_email"
                      checked={formData.notification_email}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-500">notifications_active</span>
                      <div>
                        <span className="font-medium text-slate-700 block">Push Notifications</span>
                        <span className="text-slate-400 text-sm">Receive browser push notifications</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      name="notification_push"
                      checked={formData.notification_push}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </label>
                </div>
              </motion.div>
            )}

            {/* Save Button */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => navigate('/profile')}
                className="px-6 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${
              toast.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-green-500 text-white'
            }`}
          >
            <span className="material-symbols-outlined">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            {toast.message}
            <button
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </PrivateLayout>
  );
}
