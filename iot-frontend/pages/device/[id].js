import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import Link from 'next/link';
import io from 'socket.io-client';
import TelemetryChart from '../../components/TelemetryChart';
import ControlsPanel from '../../components/ControlsPanel';

function DeviceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [device, setDevice] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      setLoading(true);
      let newSocket;

      // Fetch initial data
      api.get(`/devices/${id}`)
        .then(deviceRes => {
          const fetchedDevice = deviceRes.data;
          setDevice(fetchedDevice);
          return api.get(`/telemetry/${fetchedDevice.deviceId}?range=24h`);
        })
        .then(telemetryRes => {
          const formattedTelemetry = telemetryRes.data.map(t => ({
            ...t.payload,
            time: new Date(t.timestamp).toLocaleTimeString(),
          })).reverse();
          setTelemetry(formattedTelemetry);
        })
        .catch(err => {
          console.error("Failed to fetch data", err);
          setError('Could not load device data.');
        })
        .finally(() => setLoading(false));

      // --- WebSocket Connection with Debugging ---
      const token = localStorage.getItem('token');
      console.log("DEBUG: Token from localStorage:", token); // Log the token

      newSocket = io('http://localhost:5000', {
        auth: { token }
      });
      setSocket(newSocket);

      // Add listeners to debug the connection
      newSocket.on("connect", () => {
        console.log("✅ WebSocket connected to server:", newSocket.id);
      });

      newSocket.on("connect_error", (err) => {
        console.error("❌ WebSocket connection error:", err.message);
      });

      newSocket.on('live-telemetry', (liveData) => {
        setDevice(currentDevice => {
          if (currentDevice && liveData.deviceId === currentDevice.deviceId) {
            const newDataPoint = { ...liveData.data[0], time: new Date().toLocaleTimeString() };
            setTelemetry(prevData => [...prevData, newDataPoint].slice(-50));
          }
          return currentDevice;
        });
      });

      // Cleanup function to disconnect socket
      return () => {
        if (newSocket) newSocket.disconnect();
      };
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (!device) {
    return <div className="p-8 text-center">Device not found.</div>;
  }

  const isOnline = device.status === 'online';

  return (
    <div className="container p-6 mx-auto md:p-8">
      <div className="mb-6 text-sm">
        <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">{device.deviceType}</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">{device.deviceType}</h1>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isOnline ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
            {device.status}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="p-6 bg-white rounded-lg shadow-md lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Live Telemetry</h2>
          <TelemetryChart data={telemetry} dataKeys={device.schema.map(s => s.key)} />
        </div>
        
        <div className="space-y-8">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="mb-4 text-xl font-semibold">Controls</h2>
            <ControlsPanel device={device} socket={socket} />
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="mb-4 text-xl font-semibold">Device Info</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Device ID:</strong> <span className="font-mono text-gray-800">{device.deviceId}</span></p>
              <p><strong>Telemetry Topic:</strong> <span className="font-mono text-gray-800">{device.telemetryTopic}</span></p>
              <p><strong>Command Topic:</strong> <span className="font-mono text-gray-800">{device.commandTopic}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedDeviceDetailPage() {
  return (
    <ProtectedRoute>
      <DeviceDetailPage />
    </ProtectedRoute>
  );
}