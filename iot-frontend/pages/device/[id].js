import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Thermometer, 
  Droplets, 
  Cpu, 
  Battery, 
  Power, 
  RefreshCw, 
  Activity,
  ArrowLeft,
  Settings,
  Zap,
  Download,
  FileText,
  BrainCircuit,
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import api from '../../services/api';
import ProtectedRoute from '../../components/ProtectedRoute';

function DeviceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Device State
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Telemetry State
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [latestReadings, setLatestReadings] = useState({
    temperature: 0,
    humidity: 0,
    cpuUsage: 0,
    batteryLevel: 0,
    power: 0,
    voltage: 0
  });

  // Controls State
  const [controls, setControls] = useState({
    power: false,
    brightness: 50,
    motorSpeed: 0
  });
  const [isRebooting, setIsRebooting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch initial device data
  useEffect(() => {
    if (id) {
      api.get(`/devices/${id}`)
        .then(res => {
          setDevice(res.data);
          if (res.data.state) {
            setControls(prev => ({ ...prev, ...res.data.state }));
          }
        })
        .catch(err => {
          console.error("Failed to fetch device", err);
          setError("Failed to load device configuration");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Real Data Polling
  const fetchRealData = useCallback(async () => {
    if (!device?.deviceId) return;

    try {
      // Fetch latest telemetry
      // Note: In a production app, you'd want a specific endpoint for 'latest' 
      // to avoid fetching large arrays. Here we fetch the history and take the first item.
      const res = await api.get(`/telemetry/${device.deviceId}?limit=1`);
      
      if (res.data && res.data.length > 0) {
        const latest = res.data[0];
        const payload = latest.payload || {};
        const timestamp = new Date(latest.timestamp).toLocaleTimeString();

        // Map API response to state
        const newReadings = {
          temperature: payload.temperature || 0,
          humidity: payload.humidity || 0,
          cpuUsage: payload.cpuUsage || 0,
          batteryLevel: payload.batteryLevel || 0,
          power: payload.power || 0,
          voltage: payload.voltage || 0
        };

        setLatestReadings(newReadings);
        setError(null);

        // Update history
        setTelemetryHistory(prev => {
          const newPoint = {
            time: timestamp,
            ...newReadings
          };
          
          // Avoid duplicate timestamps if polling is faster than data generation
          if (prev.length > 0 && prev[prev.length - 1].time === timestamp) {
            return prev;
          }

          const newHistory = [...prev, newPoint];
          return newHistory.slice(-20); // Keep last 20 points
        });
      }
    } catch (err) {
      console.error("Polling error:", err);
      // Don't block the UI, just show a small indicator
      setError("Connection lost - Retrying...");
    }
  }, [device?.deviceId]);

  // Polling Effect
  useEffect(() => {
    if (!device) return;

    // Initial fetch
    fetchRealData();

    const interval = setInterval(fetchRealData, 2000);
    return () => clearInterval(interval);
  }, [device, fetchRealData]);

  // Control Handlers
  const handlePowerToggle = () => {
    const newState = !controls.power;
    setControls(prev => ({ ...prev, power: newState }));
    console.log(`[COMMAND] Power set to: ${newState ? 'ON' : 'OFF'}`);
    // api.post(`/devices/${id}/command`, { command: 'power', value: newState });
  };

  const handleBrightnessChange = (e) => {
    const value = parseInt(e.target.value);
    setControls(prev => ({ ...prev, brightness: value }));
    console.log(`[COMMAND] Brightness set to: ${value}%`);
  };

  const handleReboot = () => {
    if (isRebooting) return;
    setIsRebooting(true);
    console.log(`[COMMAND] Reboot sequence initiated...`);
    setTimeout(() => {
      setIsRebooting(false);
      console.log(`[COMMAND] Device rebooted successfully.`);
    }, 3000);
  };

  // Export Functions
  const downloadCSV = () => {
    const headers = ['Time', 'Temperature', 'Humidity', 'CPU Usage', 'Power', 'Voltage'];
    const csvContent = [
      headers.join(','),
      ...telemetryHistory.map(row => 
        [row.time, row.temperature, row.humidity, row.cpuUsage, row.power, row.voltage].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `device_telemetry_${id}.csv`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(`Device Report: ${device?.name || id}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    const tableColumn = ["Time", "Temp (°C)", "Humidity (%)", "CPU (%)", "Power (W)", "Voltage (V)"];
    const tableRows = telemetryHistory.map(row => [
      row.time,
      row.temperature,
      row.humidity,
      row.cpuUsage,
      row.power,
      row.voltage
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save(`device_report_${id}.pdf`);
  };

  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    setTimeout(() => {
      setIsGeneratingReport(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="w-12 h-12 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 transition-colors rounded-lg bg-slate-800 hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{device?.name || 'Device Monitor'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${device?.status === 'online' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-red-500'}`}></span>
                <span className="text-sm text-slate-400 capitalize">{device?.status || 'Unknown'} • ID: {id}</span>
                {error && (
                  <span className="flex items-center gap-1 px-2 py-0.5 ml-2 text-xs font-medium text-red-400 border border-red-900 rounded-full bg-red-900/20">
                    <AlertTriangle className="w-3 h-3" /> {error}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={downloadCSV}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-slate-300 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white"
            >
              <FileText className="w-4 h-4" /> Export CSV
            </button>
            <button 
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-slate-300 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white"
            >
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)]">
              <Settings className="w-4 h-4" /> Configure
            </button>
          </div>
        </div>

        {/* 1. Live Telemetry Dashboard (Grid of Cards) */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Temperature Card */}
          <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Thermometer className="w-6 h-6 text-orange-500" />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${latestReadings.temperature > 28 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {latestReadings.temperature > 28 ? 'High' : 'Normal'}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-400">Temperature</h3>
            <p className="mt-1 text-2xl font-bold text-white">{latestReadings.temperature}°C</p>
          </div>

          {/* Humidity Card */}
          <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <Droplets className="w-6 h-6 text-cyan-500" />
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full text-cyan-400 bg-cyan-500/20">
                Optimal
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-400">Humidity</h3>
            <p className="mt-1 text-2xl font-bold text-white">{latestReadings.humidity}%</p>
          </div>

          {/* CPU Usage Card */}
          <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Cpu className="w-6 h-6 text-purple-500" />
              </div>
              <span className="px-2 py-1 text-xs font-medium text-purple-400 rounded-full bg-purple-500/20">
                {latestReadings.cpuUsage}% Load
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-400">CPU Usage</h3>
            <p className="mt-1 text-2xl font-bold text-white">{latestReadings.cpuUsage}%</p>
          </div>

          {/* Battery Level Card */}
          <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Battery className="w-6 h-6 text-emerald-500" />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${latestReadings.batteryLevel < 20 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {latestReadings.batteryLevel < 20 ? 'Low Battery' : 'Healthy'}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-400">Battery Level</h3>
            <p className="mt-1 text-2xl font-bold text-white">{latestReadings.batteryLevel}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {/* Chart 1: Power Analysis (Area Chart) */}
            <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Power Analysis</h2>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Activity className="w-4 h-4 text-cyan-500" /> Live
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryHistory}>
                    <defs>
                      <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorVoltage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis 
                      dataKey="time" 
                      tick={{fontSize: 12, fill: '#94a3b8'}} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{fontSize: 12, fill: '#94a3b8'}} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f1f5f9'}}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="power" 
                      name="Power (W)"
                      stroke="#06b6d4" 
                      fillOpacity={1} 
                      fill="url(#colorPower)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="voltage" 
                      name="Voltage (V)"
                      stroke="#8b5cf6" 
                      fillOpacity={1} 
                      fill="url(#colorVoltage)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Environment (Line Chart) */}
            <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Environmental Data</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetryHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis 
                      dataKey="time" 
                      tick={{fontSize: 12, fill: '#94a3b8'}} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{fontSize: 12, fill: '#94a3b8'}} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f1f5f9'}}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      name="Temperature (°C)"
                      stroke="#f97316" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{r: 6}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="humidity" 
                      name="Humidity (%)"
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{r: 6}}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* 3. AI Analysis Panel */}
            <div className="relative p-6 overflow-hidden border shadow-lg bg-slate-800 border-slate-700 rounded-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-full blur-2xl"></div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <BrainCircuit className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-lg font-bold text-white">AI Insights</h2>
              </div>
              
              <div className="p-4 mb-6 border rounded-lg bg-slate-900/50 border-slate-700">
                <p className="text-sm leading-relaxed text-slate-300">
                  <span className="font-bold text-yellow-400">Anomaly Detected:</span> Power spike correlated with voltage drop at 14:00. This pattern suggests potential motor strain. Recommended maintenance check within 48 hours.
                </p>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="w-full py-3 text-sm font-medium text-white transition-all rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isGeneratingReport ? 'Analyzing Data...' : 'Generate New Report'}
              </button>
            </div>

            {/* 2. Interactive Device Controls */}
            <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl">
              <h2 className="mb-6 text-lg font-bold text-white">Device Controls</h2>
              
              <div className="space-y-8">
                {/* Power Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${controls.power ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                      <Power className={`w-5 h-5 ${controls.power ? 'text-emerald-400' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">Power Status</p>
                      <p className="text-xs text-slate-500">{controls.power ? 'Device is ON' : 'Device is OFF'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handlePowerToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${controls.power ? 'bg-cyan-500' : 'bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${controls.power ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Brightness Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-slate-300">Intensity / Speed</span>
                    </div>
                    <span className="text-sm font-bold text-white">{controls.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={controls.brightness}
                    onChange={handleBrightnessChange}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-cyan-500"
                  />
                </div>

                {/* Reboot Button */}
                <div className="pt-4 border-t border-slate-700">
                  <button
                    onClick={handleReboot}
                    disabled={isRebooting}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white transition-all rounded-lg ${
                      isRebooting 
                        ? 'bg-slate-600 cursor-not-allowed' 
                        : 'bg-slate-700 hover:bg-slate-600 active:scale-[0.98] border border-slate-600'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${isRebooting ? 'animate-spin' : ''}`} />
                    {isRebooting ? 'Rebooting System...' : 'Reboot Device'}
                  </button>
                </div>
              </div>
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