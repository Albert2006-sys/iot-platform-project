// pages/_app.js
import { AuthProvider } from '../services/context/AuthContext';
import Layout from '../components/Layout'; // <-- Add this import
import { MotionConfig } from 'framer-motion';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <Layout> {/* <-- Add this wrapper */}
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
    </MotionConfig>
  );
}

export default MyApp;