import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PrivateLayout from '../components/PrivateLayout.jsx';
import { useAuth, getUserInitials } from '../auth/AuthContext.jsx';

/**
 * Profile Page - Read-only view of user's profile
 */
export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, profileLoading, displayName, avatarUrl } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileLoading) {
      setLoading(false);
    }
  }, [profileLoading]);

  const initials = getUserInitials(displayName);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getGenderLabel = (gender) => {
    const labels = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      prefer_not_to_say: 'Prefer not to say',
    };
    return labels[gender] || gender || 'Not specified';
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-slate-800 mb-2">My Profile</h1>
          <p className="text-slate-500">View your account information and health profile</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
              {/* Avatar */}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-24 h-24 rounded-2xl mx-auto mb-4 object-cover ring-4 ring-slate-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-slate-100">
                  {initials}
                </div>
              )}

              {/* Name */}
              <h2 className="text-xl font-bold text-slate-800 mb-1">{displayName}</h2>
              
              {/* Username */}
              {profile?.username && (
                <p className="text-slate-500 text-sm mb-2">@{profile.username}</p>
              )}

              {/* Email */}
              <p className="text-slate-400 text-sm">{user?.email}</p>

              {/* Edit Button */}
              <button
                onClick={() => navigate('/settings')}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit Profile
              </button>
            </div>

            {/* Account Info */}
            <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">badge</span>
                Account Info
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-500 text-sm">Member Since</dt>
                  <dd className="text-slate-800 text-sm font-medium">
                    {formatDate(user?.created_at || profile?.created_at)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 text-sm">Last Updated</dt>
                  <dd className="text-slate-800 text-sm font-medium">
                    {formatDate(profile?.updated_at)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 text-sm">Email Verified</dt>
                  <dd className="text-sm font-medium">
                    {user?.email_confirmed_at ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Verified
                      </span>
                    ) : (
                      <span className="text-amber-600">Pending</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-slate-800 font-semibold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Personal Information
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <InfoField label="Full Name" value={profile?.full_name || 'Not set'} />
                <InfoField label="Username" value={profile?.username ? `@${profile.username}` : 'Not set'} />
                <InfoField label="Email" value={user?.email || 'Not set'} />
                <InfoField label="Gender" value={getGenderLabel(profile?.gender)} />
                <InfoField label="Age" value={profile?.age ? `${profile.age} years` : 'Not set'} />
              </div>
            </div>

            {/* Health Information */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-slate-800 font-semibold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">favorite</span>
                Health Information
              </h3>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <HealthMetric
                  icon="height"
                  label="Height"
                  value={profile?.height_cm ? `${profile.height_cm} cm` : 'Not set'}
                />
                <HealthMetric
                  icon="monitor_weight"
                  label="Weight"
                  value={profile?.weight_kg ? `${profile.weight_kg} kg` : 'Not set'}
                />
                <HealthMetric
                  icon="calculate"
                  label="BMI"
                  value={
                    profile?.height_cm && profile?.weight_kg
                      ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
                      : 'N/A'
                  }
                />
                <HealthMetric
                  icon="bedtime"
                  label="Sleep"
                  value={profile?.sleep_hours ? `${profile.sleep_hours} hrs/day` : '7 hrs/day'}
                />
                <HealthMetric
                  icon="fitness_center"
                  label="Exercise"
                  value={profile?.exercise_mins_per_week ? `${profile.exercise_mins_per_week} min/week` : '120 min/week'}
                />
                <HealthMetric
                  icon="psychology"
                  label="Stress Level"
                  value={profile?.stress_level ? `${profile.stress_level}/10` : '5/10'}
                />
                <HealthMetric
                  icon="family_restroom"
                  label="Family History"
                  value={profile?.family_history ? 'Yes' : 'No'}
                  className="md:col-span-2 lg:col-span-1"
                />
              </div>

              {/* Health Data Notice */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
                  <div>
                    <p className="text-blue-700 text-sm font-medium">Health Profile Usage</p>
                    <p className="text-blue-600 text-sm mt-1">
                      Your health information is used to personalize AI risk assessments and provide 
                      more accurate health recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-slate-800 font-semibold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">notifications</span>
                Notification Preferences
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-500">email</span>
                    <span className="text-slate-700">Email Notifications</span>
                  </div>
                  <span className={`text-sm font-medium ${profile?.notification_email !== false ? 'text-green-600' : 'text-slate-400'}`}>
                    {profile?.notification_email !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-500">notifications_active</span>
                    <span className="text-slate-700">Push Notifications</span>
                  </div>
                  <span className={`text-sm font-medium ${profile?.notification_push !== false ? 'text-green-600' : 'text-slate-400'}`}>
                    {profile?.notification_push !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </PrivateLayout>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <dt className="text-slate-500 text-sm mb-1">{label}</dt>
      <dd className="text-slate-800 font-medium">{value}</dd>
    </div>
  );
}

function HealthMetric({ icon, label, value, className = '' }) {
  return (
    <div className={`p-4 bg-slate-50 rounded-xl ${className}`}>
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        <span className="material-symbols-outlined text-lg">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-slate-800 font-semibold text-lg">{value}</div>
    </div>
  );
}
