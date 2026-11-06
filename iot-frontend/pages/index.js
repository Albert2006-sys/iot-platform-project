// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import IoTIllustration from '../components/IoTIllustration'; // Import the new illustration component
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>LumenLink - Illuminate the Invisible</title>
        <meta name="description" content="A cloud-based platform for seamless IoT device connectivity and management." />
      </Head>
      <div className="min-h-screen font-sans text-white bg-slate-950">
        {/* Header */}
        <header className="container p-6 mx-auto">
          <nav className="flex items-center justify-between">
            <div className="text-3xl font-bold text-cyan-400">LumenLink</div>
            <Link
              href="/login"
              className="px-6 py-2 text-md font-semibold border border-slate-700 rounded-md 
                         bg-slate-800 hover:bg-slate-700 transition-colors duration-300 shadow-lg 
                         hover:shadow-cyan-500/20"
            >
              Login
            </Link>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="container flex flex-col items-center px-6 py-20 mx-auto text-center md:flex-row md:py-24 md:text-left gap-12">
          {/* Left Column (Text Content) */}
          <div className="md:w-1/2 animate-fade-in-left">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-5xl font-extrabold leading-tight md:text-6xl text-slate-50"
                style={{ textShadow: '0 0 15px rgba(56, 189, 248, 0.3)' }}>
                Welcome to <span className="text-cyan-400">LumenLink</span>
              </h1>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <p className="mt-6 text-xl text-slate-400 leading-relaxed">
                A cloud-based platform that provides seamless connectivity and management of IoT devices with ease. Monitor, control, and automate your smart world.
              </p>
            </motion.div>
            <div className="flex flex-col justify-center mt-10 md:justify-start space-y-6">
              <div className="flex space-x-4 justify-center md:justify-start">
                <Link
                  href="/register"
                  className="px-9 py-4 text-lg font-bold text-slate-950 transition-all duration-300 
                             transform bg-cyan-400 rounded-full shadow-xl hover:bg-cyan-300 hover:scale-105 
                             focus:outline-none focus:ring-4 focus:ring-cyan-500 focus:ring-opacity-50"
                >
                  Get Started
                </Link>
                <Link
                  href="/login"
                  className="px-9 py-4 text-lg font-bold bg-slate-700 rounded-full hover:bg-slate-600 
                             transition-all duration-300 shadow-xl hover:shadow-slate-500/20 
                             focus:outline-none focus:ring-4 focus:ring-slate-500 focus:ring-opacity-50"
                >
                  Login
                </Link>
              </div>
              {/* Tagline */}
              <p className="text-xl font-light italic tracking-widest text-center md:text-left">
                <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  Illuminate the invisible. Link the impossible.
                </span>
              </p>
            </div>
          </div>

          {/* Right Column (Illustration) */}
          <div className="md:w-1/2 flex justify-center items-center relative min-h-[400px]">
            <IoTIllustration />
          </div>
        </main>
      </div>
    </>
  );
}