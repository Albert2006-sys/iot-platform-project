// components/Layout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../services/context/AuthContext';

export default function Layout({ children }) {
  const { token, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Don't show the layout on login/register pages
  if (router.pathname === '/login' || router.pathname === '/register' || router.pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <nav className="bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="container px-6 py-3 mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
              LumenLink
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                {token ? 'Connected' : 'Guest'}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 font-bold text-white transition-colors bg-red-600 rounded hover:bg-red-700 hover:shadow-[0_0_10px_rgba(220,38,38,0.5)]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}