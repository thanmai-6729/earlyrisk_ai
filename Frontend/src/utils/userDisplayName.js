export function usernameFromUser(user) {
  const meta = user?.user_metadata || {};

  const fullName = meta.full_name || meta.fullName || meta.name || meta.username;
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim();

  const email = user?.email;
  if (typeof email === 'string' && email.includes('@')) return email.split('@')[0];

  return 'User';
}
