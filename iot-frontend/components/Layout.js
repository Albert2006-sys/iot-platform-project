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
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="container px-6 py-3 mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-bold text-gray-800">
              IoT Platform
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}