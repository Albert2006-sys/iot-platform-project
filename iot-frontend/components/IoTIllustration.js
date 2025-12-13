// components/IoTIllustration.js
import React from 'react';

const IoTIllustration = () => {
  return (
    <div className="relative w-full max-w-lg h-auto aspect-[16/9] md:aspect-auto" style={{ paddingTop: '56.25%', position: 'relative' }}>
      <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 800 450" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background Gradient Effect */}
        <defs>
          <linearGradient id="consoleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2e3a50" />
            <stop offset="100%" stopColor="#1a202c" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main Console Base */}
        <rect x="250" y="150" width="300" height="250" rx="20" fill="url(#consoleGradient)" stroke="#4a5568" strokeWidth="2" />
        <rect x="260" y="160" width="280" height="180" rx="15" fill="#0f172a" stroke="#2d3748" strokeWidth="1" /> {/* Screen area */}

        {/* Screen Content - Graphs */}
        <path d="M280 200 L320 180 L360 210 L400 190 L440 220 L480 200 L520 230" stroke="#38bdf8" strokeWidth="3" fill="none" />
        <path d="M280 230 L310 210 L340 240 L370 220 L400 250 L430 230 L460 260 L490 240 L520 270" stroke="#a78bfa" strokeWidth="2" fill="none" />

        {/* Temperature Display */}
        <rect x="440" y="165" width="90" height="40" rx="8" fill="#1e293b" />
        <text x="450" y="193" fontFamily="JetBrains Mono, monospace" fontSize="24" fill="#38bdf8">24°C</text>

        {/* Buttons/Indicators below screen */}
        <circle cx="300" cy="360" r="10" fill="#f56565" />
        <circle cx="330" cy="360" r="10" fill="#ecc94b" />
        <circle cx="360" cy="360" r="10" fill="#48bb78" />
        <rect x="400" y="350" width="100" height="20" rx="5" fill="#2d3748" />
        <text x="410" y="365" fontFamily="Arial, sans-serif" fontSize="14" fill="#a0aec0">Status</text>

        {/* Person Figure (Simplified, standing by console) */}
        <rect x="150" y="150" width="40" height="150" fill="#a78bfa" rx="10" /> {/* Body */}
        <rect x="140" y="300" width="60" height="100" fill="#667eea" rx="10" /> {/* Legs */}
        <rect x="160" y="100" width="20" height="50" fill="#a78bfa" rx="5" /> {/* Neck */}
        <circle cx="170" cy="90" r="30" fill="#fbd38d" /> {/* Head */}
        <rect x="180" y="200" width="20" height="80" fill="#a78bfa" rx="5" transform="rotate(20 180 200)" /> {/* Arm (reaching towards screen) */}
        <circle cx="195" cy="275" r="15" fill="#fbd38d" /> {/* Hand */}

        {/* Floating IoT Icons with Animation */}
        {/* Lightbulb */}
        <g className="animate-float" style={{ animationDelay: '0s' }}>
          <circle cx="200" cy="80" r="25" fill="#fcd34d" filter="url(#glow)" />
          <path d="M195 70 L205 70 L205 85 Q200 95 195 85 Z" fill="#fff" />
          <rect x="198" y="87" width="4" height="8" fill="#fff" />
        </g>

        {/* Wifi Symbol */}
        <g className="animate-float" style={{ animationDelay: '1s' }}>
          <circle cx="600" cy="100" r="25" fill="#38bdf8" filter="url(#glow)" />
          <path d="M595 110 A5 5 0 0 1 605 110 A15 15 0 0 1 600 95 A25 25 0 0 1 590 85" stroke="#fff" strokeWidth="2" fill="none" />
        </g>

        {/* Progress/Gear Icon */}
        <g className="animate-float" style={{ animationDelay: '2s' }}>
          <circle cx="650" cy="300" r="25" fill="#a78bfa" filter="url(#glow)" />
          <path d="M640 300 A10 10 0 0 1 660 300 A10 10 0 0 1 640 300" stroke="#fff" strokeWidth="2" fill="none" />
          <rect x="645" y="295" width="10" height="10" fill="#fff" transform="rotate(45 650 300)" />
        </g>

      </svg>
      {/* Tailwind CSS keyframe for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default IoTIllustration;