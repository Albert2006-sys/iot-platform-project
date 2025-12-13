// components/ProtectedRoute.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../services/context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [token, loading, router]);

  if (loading || !token) {
    // You can show a loading spinner here
    return <div>Loading...</div>;
  }

  return children;
}