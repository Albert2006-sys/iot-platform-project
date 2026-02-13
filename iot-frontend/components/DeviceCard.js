// components/DeviceCard.js
import Link from 'next/link';

export default function DeviceCard({ device, onDelete }) {
  const isOnline = device.status === 'online';

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent navigating to the detail page
    e.preventDefault();
    onDelete(device.deviceId);
  };

  return (
    <Link href={`/device/${device.deviceId}`} className="relative block p-4 text-left">
        <div className="flex items-start justify-between mb-2">
            <div>
                <h3 className="text-lg font-bold text-slate-200">{device.deviceType}</h3>
                <p className="mt-1 text-xs font-mono text-slate-500 break-all">{device.deviceId}</p>
            </div>
            <span 
              className={`px-2 py-1 text-xs font-semibold rounded-full ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}
            >
              {device.status}
            </span>
        </div>

        {/* Delete Button */}
        <button 
          onClick={handleDeleteClick} 
          className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors rounded-full opacity-50 hover:opacity-100"
          aria-label="Delete device"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
    </Link>
  );
}