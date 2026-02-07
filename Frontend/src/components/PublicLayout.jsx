import PublicNavbar from './PublicNavbar.jsx';
import PageTransition from './PageTransition.jsx';

/**
 * Layout for public/marketing pages
 * Light, welcoming, startup feel
 */
export default function PublicLayout({ children, showNav = true }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {showNav && <PublicNavbar />}
      <PageTransition>
        <main>{children}</main>
      </PageTransition>
    </div>
  );
}
