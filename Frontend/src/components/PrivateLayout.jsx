import PrivateNavbar from './PrivateNavbar.jsx';
import PageTransition from './PageTransition.jsx';

/**
 * Layout for authenticated/private pages
 * Clean, professional, medical system feel
 */
export default function PrivateLayout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <PrivateNavbar />
      <PageTransition>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </PageTransition>
    </div>
  );
}
