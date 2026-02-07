import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, getProfile, getDisplayNameFromProfile, getHealthDataFromProfile } from './supabase.js';

const AuthContext = createContext(null);

/**
 * Get user initials for avatar
 */
export function getUserInitials(displayName) {
  if (!displayName || displayName === 'User') return 'U';
  const parts = displayName.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch profile from database
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return null;
    }
    
    setProfileLoading(true);
    try {
      const profileData = await getProfile();
      setProfile(profileData);
      return profileData;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // Initialize session
  useEffect(() => {
    let alive = true;

    async function initSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth init error:', error);
        }
        if (!alive) return;
        const s = data?.session ?? null;
        setSession(s);
        setUser(s?.user ?? null);
      } catch (err) {
        console.error('Auth init exception:', err);
        if (!alive) return;
        setSession(null);
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      if (!nextSession) {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      alive = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signup = useCallback(async (email, password, metadata = {}) => {
    // Get the base URL for redirect (works for both localhost and production)
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: metadata,
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  // Refresh profile after updates
  const refreshProfile = useCallback(async () => {
    return await fetchProfile();
  }, [fetchProfile]);

  // Computed display name - prioritize profile.username
  const displayName = useMemo(() => {
    return getDisplayNameFromProfile(profile, user);
  }, [profile, user]);

  const initials = useMemo(() => getUserInitials(displayName), [displayName]);

  // Avatar URL from profile
  const avatarUrl = useMemo(() => profile?.avatar_url || null, [profile]);

  // Health data for API calls
  const healthData = useMemo(() => getHealthDataFromProfile(profile), [profile]);

  const value = useMemo(
    () => ({
      loading,
      profileLoading,
      session,
      user,
      profile,
      isAuthenticated: !!session,
      displayName,
      initials,
      avatarUrl,
      healthData,
      login,
      signup,
      logout,
      refreshProfile,
    }),
    [loading, profileLoading, session, user, profile, displayName, initials, avatarUrl, healthData, login, signup, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
