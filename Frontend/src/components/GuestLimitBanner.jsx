import { Link } from 'react-router-dom';

export default function GuestLimitBanner({ attemptsUsed, maxAttempts }) {
  const remaining = Math.max(0, maxAttempts - attemptsUsed);
  const isBlocked = remaining <= 0;

  if (isBlocked) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-red-500 mb-2">block</span>
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
          Demo Limit Reached
        </h3>
        <p className="text-red-600 dark:text-red-300 mb-4">
          You've used all {maxAttempts} free analyses. Create an account to continue using Earlyrisk AI with unlimited access.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/signup"
            className="px-6 py-2 rounded-lg font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Sign Up Free
          </Link>
          <Link
            to="/login"
            className="px-6 py-2 rounded-lg font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-600 dark:text-amber-500">info</span>
        <span className="text-sm text-amber-700 dark:text-amber-400">
          Guest Mode: <strong>{remaining}</strong> of {maxAttempts} analyses remaining
        </span>
      </div>
      <Link
        to="/signup"
        className="text-sm font-medium text-primary hover:underline"
      >
        Upgrade →
      </Link>
    </div>
  );
}
