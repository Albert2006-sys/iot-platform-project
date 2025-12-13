// pages/_app.js
import { AuthProvider } from '../services/context/AuthContext';
import Layout from '../components/Layout'; // <-- Add this import
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout> {/* <-- Add this wrapper */}
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp;