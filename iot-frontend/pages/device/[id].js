import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import io from 'socket.io-client';
import { useAuth } from '../../services/context/AuthContext';
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
  FileSpreadsheet,
  BrainCircuit,
  AlertTriangle,
  Edit,
  Save,
  Plus,
  Lightbulb,
  Wrench
} from 'lucide-react';
import DynamicWidget from '../../components/DynamicWidget';
import ComparativeChart from '../../components/ComparativeChart';
import ConnectionWizard from '../../components/ConnectionWizard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import AIActionCenter from '../../components/AIActionCenter';
import Modal from '../../components/Modal'; // Assuming Modal component exists
import { motion } from 'framer-motion';

function DeviceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();

  // Device State
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dynamic Data State
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [latestReadings, setLatestReadings] = useState({});
  const [dataMap, setDataMap] = useState([]);
  const [availableKeys, setAvailableKeys] = useState([]);
  const [customCharts, setCustomCharts] = useState([]);

  // UI State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isCommandBuilderOpen, setIsCommandBuilderOpen] = useState(false);
  const [isChartCreatorOpen, setIsChartCreatorOpen] = useState(false);
  const [newControl, setNewControl] = useState({ label: '', command_key: '', payload: '', type: 'button', min: 0, max: 100 });
  const [newChartConfig, setNewChartConfig] = useState({ type: 'line', keys: [], title: '' });

  // Controls State
  const [controls, setControls] = useState({});
  const [isRebooting, setIsRebooting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [proposalBusyId, setProposalBusyId] = useState(null);
  const [proposalError, setProposalError] = useState('');
  const debouncedSendRef = useRef(null);

  const mergeProposal = useCallback(proposal => {
    if (!proposal?._id) return;
    setProposals(prev => {
      const index = prev.findIndex(item => item._id === proposal._id);
      if (index === -1) return [proposal, ...prev];
      const next = [...prev];
      next[index] = { ...next[index], ...proposal };
      return next;
    });
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (id) {
      api.get(`/devices/${id}`)
        .then(res => {
          setDevice(res.data);
          setDataMap(res.data.data_map || []);
          // Initialize controls if they exist in DB (not implemented in this snippet but good practice)
        })
        .catch(err => {
          console.error("Failed to fetch device", err);
          setError("Failed to load device configuration");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const socketRef = useRef(null);

  // Socket.io Real-time Connection
  useEffect(() => {
    if (!device?.deviceId || !token) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      auth: { token },
      transports: ['websocket']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      setError(null);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err);
      setError('Real-time connection failed');
    });

    // Listen for live telemetry
    socket.on('live-telemetry', (message) => {
      if (message.deviceId !== device.deviceId) return;
      setDevice(prev => ({ ...prev, status: 'online' }));

      const payload = message.payload || {};
      const timestamp = new Date(message.timestamp || Date.now()).toLocaleTimeString();

      setLatestReadings(payload);

      setTelemetryHistory(prev => {
        const newPoint = { time: timestamp, ...payload };
        // Keep last 50 points
        const newHistory = [...prev, newPoint];
        return newHistory.slice(-50);
      });
    });

    socket.on('device-status', (message) => {
      if (message.deviceId === device.deviceId) {
        setDevice(prev => ({ ...prev, status: message.status }));
      }
    });

    socket.on('new-alert', (alert) => {
      setLiveAlerts(prev => {
        const withoutExisting = prev.filter(item => item.anomalyId !== alert.anomalyId);
        return [alert, ...withoutExisting].slice(0, 5);
      });
    });

    socket.on('ai-proposal', mergeProposal);
    socket.on('proposal-update', mergeProposal);

    return () => {
      socket.disconnect();
    };
  }, [device?.deviceId, token, mergeProposal]);

  useEffect(() => {
    if (!device?.deviceId) return;
    api.get(`/devices/${device.deviceId}/proposals`)
      .then(res => res.data.forEach(mergeProposal))
      .catch(() => setProposalError('Failed to load AI proposals.'));
  }, [device?.deviceId, mergeProposal]);

  const handleProposalAction = async (proposalId, action) => {
    setProposalBusyId(proposalId);
    setProposalError('');
    try {
      const response = await api.post(`/proposals/${proposalId}/${action}`);
      mergeProposal(response.data);
    } catch (requestError) {
      setProposalError(requestError.response?.data?.message || `Failed to ${action} proposal.`);
    } finally {
      setProposalBusyId(null);
    }
  };

  // Fetch historical telemetry
  useEffect(() => {
    if (device?.deviceId) {
      api.get(`/telemetry/${device.deviceId}?limit=50`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            const sorted = res.data.reverse().map(item => {
              // Handle 'values' map from backend which might come as object
              const vals = item.values || item.payload || {};
              return {
                time: new Date(item.timestamp).toLocaleTimeString(),
                ...vals
              };
            });
            setTelemetryHistory(sorted);

            if (sorted.length > 0) {
              const last = sorted[sorted.length - 1];
              // Remove 'time' key for readings
              const { time, ...readings } = last;
              setLatestReadings(readings);
            }
          }
        })
        .catch(err => console.error("Initial fetch failed", err));
    }
  }, [device?.deviceId]);

  useEffect(() => {
    if (!device?.deviceId) return;
    api.get(`/devices/${device.deviceId}/anomalies?status=open`)
      .then(res => {
        const alerts = res.data.map(anomaly => ({
          id: anomaly._id,
          anomalyId: anomaly._id,
          type: anomaly.severity === 'critical' ? 'danger' : 'warning',
          title: `${anomaly.severity === 'critical' ? 'Critical' : 'Warning'} anomaly on ${anomaly.deviceId}`,
          message: `${anomaly.key} is ${Number(anomaly.value).toFixed(2)} (z-score ${Number(anomaly.zScore).toFixed(2)})`,
          timestamp: anomaly.createdAt,
          status: anomaly.status,
          severity: anomaly.severity,
          key: anomaly.key,
          value: anomaly.value,
        }));
        setLiveAlerts(prev => {
          const merged = [...alerts, ...prev];
          return merged.filter((alert, index, list) => (
            list.findIndex(item => item.anomalyId === alert.anomalyId) === index
          )).slice(0, 5);
        });
      })
      .catch(error => console.error('Failed to load open anomalies:', error));
  }, [device?.deviceId]);

  useEffect(() => {
    if (Object.keys(latestReadings).length > 0) {
      const keys = Object.keys(latestReadings).filter(k => k !== 'time');
      setAvailableKeys(prev => Array.from(new Set([...prev, ...keys])));
    }
  }, [latestReadings]);

  const handleSaveSchema = async () => {
    try {
      await api.patch(`/devices/${device._id}/schema`, { data_map: dataMap });
      // Also save controls if we modified them
      setIsEditMode(false);
    } catch (e) {
      console.error("Failed to save schema", e);
      alert("Failed to save changes");
    }
  };

  const handleAddControl = async () => {
    try {
      // Replace with real API call
      await api.post(`/devices/${device.deviceId}/controls`, newControl);

      const updatedControls = [...(device.controls || []), newControl];
      setDevice({ ...device, controls: updatedControls });
      setIsCommandBuilderOpen(false);
      setNewControl({ label: '', command_key: '', payload: '', type: 'button', min: 0, max: 100 });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddChart = () => {
    setCustomCharts(prev => [...prev, { ...newChartConfig, id: Date.now() }]);
    setIsChartCreatorOpen(false);
    setNewChartConfig({ type: 'line', keys: [], title: '' });
  };

  const sendCommand = (target, value) => {
    setIsSyncing(true);
    if (debouncedSendRef.current) {
      clearTimeout(debouncedSendRef.current);
    }

    debouncedSendRef.current = setTimeout(() => {
      console.log(`Sending command: ${target} = ${value}`);
      if (socketRef.current) {
        // New Payload Format: {"target": "field_name", "value": numeric_value}
        socketRef.current.emit('device-command', {
          deviceId: device.deviceId,
          payload: { target, value }
        });
      }
      setIsSyncing(false);
    }, 500); // 500ms debounce

    // Optimistic updat for controls state
    setControls(prev => ({ ...prev, [target]: value }));
  };



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
  const exportToCSV = () => {
    if (!telemetryHistory || telemetryHistory.length === 0) {
      alert('No telemetry data available to export.');
      return;
    }

    // Dynamic headers from the first item in the array
    const headers = Object.keys(telemetryHistory[0]);

    // Escape values that contain commas or quotes
    const escapeCSVValue = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Map through history to create CSV rows
    const csvContent = [
      headers.join(','),
      ...telemetryHistory.map(row =>
        headers.map(header => escapeCSVValue(row[header])).join(',')
      )
    ].join('\n');

    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `device_telemetry_${device?.deviceId || id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    try {
      if (!telemetryHistory || telemetryHistory.length === 0) {
        alert('No telemetry data available to export.');
        return;
      }

      const doc = new jsPDF();

      // Title and metadata
      doc.setFontSize(18);
      doc.setTextColor(6, 182, 212); // Cyan color
      doc.text(`LumenLink Telemetry Report: ${device?.name || id}`, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // Slate-400 color
      doc.text(`Device ID: ${device?.deviceId || id}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
      doc.text(`Status: ${device?.status || 'Unknown'}`, 14, 40);

      // Dynamic column headers from telemetry keys
      // Put 'time' as 'Timestamp' first if it exists, then other keys
      const allKeys = Object.keys(telemetryHistory[0]);
      const timeIndex = allKeys.indexOf('time');
      let orderedKeys = [...allKeys];
      if (timeIndex > -1) {
        orderedKeys.splice(timeIndex, 1);
        orderedKeys.unshift('time');
      }

      // Create header row with capitalized names
      const tableColumns = orderedKeys.map(key =>
        key === 'time' ? 'Timestamp' : key.charAt(0).toUpperCase() + key.slice(1)
      );

      // Create data rows
      const tableRows = telemetryHistory.map(row =>
        orderedKeys.map(key => {
          const value = row[key];
          if (value === null || value === undefined) return '-';
          if (typeof value === 'number') return value.toFixed(2);
          return String(value);
        })
      );

      // Use standalone autoTable function to avoid TypeError
      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 48,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [241, 245, 249], // slate-100
          fillColor: [30, 41, 59], // slate-800
        },
        headStyles: {
          fillColor: [15, 23, 42], // slate-900 (dark slate for cyberpunk theme)
          textColor: [6, 182, 212], // cyan-500
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [51, 65, 85], // slate-700
        },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`device_report_${device?.deviceId || id}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await api.get(`/telemetry/${device.deviceId}/insights`);
      // Handle both new categorized format and legacy string format
      const data = res.data.insights;
      if (typeof data === 'object' && (data.critical || data.optimization || data.maintenance)) {
        setAiInsights(data);
      } else {
        // Legacy fallback
        setAiInsights({
          critical: [],
          optimization: [typeof data === 'string' ? data : 'Analysis complete.'],
          maintenance: []
        });
      }
    } catch (e) {
      console.error("Failed to get AI insights", e);
      setAiInsights({
        critical: [],
        optimization: ["Failed to generate insights. Service might be unavailable."],
        maintenance: []
      });
    } finally {
      setIsGeneratingReport(false);
    }
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 transition-colors rounded-lg bg-slate-800 hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{device?.name || 'Device Monitor'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${device?.status === 'online' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-red-500'}`}></span>
                <span className="text-sm text-slate-400 capitalize">{device?.status || 'Unknown'} • ID: {id}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-lg bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500"
              title="Export as CSV"
            >
              <FileSpreadsheet className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-lg bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500"
              title="Export as PDF"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => setIsChartCreatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-lg bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            >
              <Plus className="w-4 h-4" /> Add Chart
            </button>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-lg ${isEditMode ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
            >
              <Edit className="w-4 h-4" /> {isEditMode ? 'Done Editing' : 'Edit Dashboard'}
            </button>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)]">
              <Settings className="w-4 h-4" /> Configure
            </button>
          </div>
        </motion.div>

        {/* AI Insights Bar - Global Alert & Insight Center */}
        {liveAlerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {liveAlerts.map(alert => (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 shadow-lg ${
                  alert.severity === 'critical'
                    ? 'border-red-500/50 bg-red-950/40'
                    : 'border-amber-500/50 bg-amber-950/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`mt-0.5 h-5 w-5 ${
                    alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                  }`} />
                  <div>
                    <p className="font-semibold text-white">{alert.title}</p>
                    <p className="text-sm text-slate-300">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <AIActionCenter
          proposals={proposals}
          onApprove={proposalId => handleProposalAction(proposalId, 'approve')}
          onReject={proposalId => handleProposalAction(proposalId, 'reject')}
          busyId={proposalBusyId}
          error={proposalError}
        />
        <div className="relative mb-8 p-5 overflow-hidden border shadow-lg bg-slate-800/50 border-cyan-500/30 rounded-xl backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-bl-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-tr-full blur-3xl"></div>

          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <BrainCircuit className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">AI Insights</h2>
                <p className="text-xs text-slate-400">Real-time intelligence feed</p>
              </div>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
              {isGeneratingReport ? 'Analyzing...' : 'Generate Report'}
            </button>
          </div>

          {/* Insights Content - Fixed Height to Prevent Layout Shift */}
          <div className="min-h-[100px]">
            {isGeneratingReport ? (
              /* Loading Skeleton */
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700 animate-pulse">
                    <div className="h-4 w-20 bg-slate-700 rounded mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-700 rounded w-full"></div>
                      <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : aiInsights ? (
              /* Categorized Insights Display */
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Critical Section */}
                <div className="p-4 rounded-lg bg-slate-900/50 border border-red-500/30 transition-all hover:border-red-500/50">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold text-red-400">Critical</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {aiInsights.critical && aiInsights.critical.length > 0 ? (
                      aiInsights.critical.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <span className="text-red-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500 italic">No critical alerts</li>
                    )}
                  </ul>
                </div>

                {/* Optimization Section */}
                <div className="p-4 rounded-lg bg-slate-900/50 border border-cyan-500/30 transition-all hover:border-cyan-500/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-cyan-400">Optimization</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {aiInsights.optimization && aiInsights.optimization.length > 0 ? (
                      aiInsights.optimization.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <span className="text-cyan-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500 italic">No tips available</li>
                    )}
                  </ul>
                </div>

                {/* Maintenance Section */}
                <div className="p-4 rounded-lg bg-slate-900/50 border border-amber-500/30 transition-all hover:border-amber-500/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">Maintenance</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {aiInsights.maintenance && aiInsights.maintenance.length > 0 ? (
                      aiInsights.maintenance.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <span className="text-amber-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500 italic">No maintenance alerts</li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              /* Initial State - No Insights Yet */
              <div className="flex items-center justify-center p-6 rounded-lg bg-slate-900/30 border border-slate-700 border-dashed">
                <div className="text-center">
                  <BrainCircuit className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Click &quot;Generate Report&quot; to analyze telemetry data</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Telemetry Grid */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          {availableKeys.map((key) => {
            const value = latestReadings[key];
            const isNumber = typeof value === 'number';
            const isBoolean = typeof value === 'boolean' || (typeof value === 'string' && ['ON', 'OFF', 'TRUE', 'FALSE'].includes(value.toUpperCase()));

            // Auto-detect mapping type for the widget
            const autoMapping = {
              raw_key: key,
              alias: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize
              type: isNumber ? 'number' : 'string',
              unit: ''
            };

            return (
              <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <DynamicWidget
                key={key}
                mapping={autoMapping}
                value={value}
                history={telemetryHistory}
              />
              </motion.div>
            );
          })}

          {availableKeys.length === 0 && (
            <div className="col-span-full p-8 text-center bg-slate-800 rounded-xl border border-slate-700 border-dashed">
              <p className="text-slate-400">Waiting for telemetry...</p>
              <div className="mt-4 animate-pulse flex justify-center">
                <Activity className="w-6 h-6 text-cyan-500" />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {customCharts.map(chart => (
              <div key={chart.id} className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl relative">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">{chart.title || 'Custom Chart'}</h2>
                  <button
                    onClick={() => setCustomCharts(prev => prev.filter(c => c.id !== chart.id))}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.type === 'line' && (
                      <LineChart data={telemetryHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                        <Legend />
                        {chart.keys.map((key, i) => (
                          <Line key={key} type="monotone" dataKey={key} stroke={['#06b6d4', '#8b5cf6', '#f97316'][i % 3]} dot={false} />
                        ))}
                      </LineChart>
                    )}
                    {chart.type === 'bar' && (
                      <BarChart data={telemetryHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                        <Legend />
                        {chart.keys.map((key, i) => (
                          <Bar key={key} dataKey={key} fill={['#06b6d4', '#8b5cf6', '#f97316'][i % 3]} />
                        ))}
                      </BarChart>
                    )}
                    {chart.type === 'pie' && (
                      <PieChart>
                        <Pie
                          data={chart.keys.map(k => ({ name: k, value: latestReadings[k] || 0 }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {chart.keys.map((k, i) => <Cell key={k} fill={['#06b6d4', '#8b5cf6', '#f97316'][i % 3]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                        <Legend />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}

            {/* Comparative Chart */}
            <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Data Analysis</h2>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Activity className="w-4 h-4 text-cyan-500" /> Live
                </div>
              </div>
              <ComparativeChart data={telemetryHistory} keys={dataMap.filter(d => d.type === 'number')} />
            </div>
          </div>

          <div className="space-y-8">
            {/* Controls */}
            <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white">Device Controls</h2>
                  {isSyncing && <span className="text-xs text-cyan-400 animate-pulse">Syncing...</span>}
                </div>
                {isEditMode && (
                  <button onClick={() => setIsCommandBuilderOpen(true)} className="text-xs bg-cyan-600 px-2 py-1 rounded text-white flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Control
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {/* Dynamic Sliders from Telemetry */}
                {availableKeys.map(key => {
                  const value = latestReadings[key];
                  if (typeof value !== 'number') return null;

                  return (
                    <div key={key} className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-200 capitalize">{key}</span>
                        <span className="text-xs font-mono text-cyan-400">{controls[key] !== undefined ? controls[key] : value}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100} // Default range, could be smarter or configured
                        step={1}
                        value={controls[key] !== undefined ? controls[key] : value}
                        onChange={(e) => {
                          const newVal = Number(e.target.value);
                          setControls(prev => ({ ...prev, [key]: newVal })); // Immediate UI update
                          sendCommand(key, newVal); // Debounced send
                        }}
                        className="w-full accent-cyan-500 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  );
                })}

                {/* Manual Controls */}
                {(device?.controls || []).map((ctrl, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-sm font-medium text-slate-200">{ctrl.label}</span>

                    {ctrl.type === 'slider' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={ctrl.min || 0}
                          max={ctrl.max || 100}
                          onMouseUp={(e) => sendCommand(ctrl.command_key, Number(e.target.value))}
                          className="w-24 accent-cyan-500"
                        />
                      </div>
                    )}

                    {ctrl.type === 'switch' && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          onChange={(e) => sendCommand(ctrl.command_key, e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                      </label>
                    )}

                    {(ctrl.type === 'button' || !ctrl.type) && (
                      <button
                        onClick={() => sendCommand(ctrl.command_key, ctrl.payload)}
                        className="px-3 py-1 text-xs font-bold text-white bg-cyan-600 rounded hover:bg-cyan-500"
                      >
                        SEND
                      </button>
                    )}
                  </div>
                ))}
                {(device?.controls || []).length === 0 && <p className="text-slate-500 text-sm text-center">No controls configured</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Creator Modal */}
        {isChartCreatorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Add Custom Chart</h3>

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Chart Title</label>
                <input
                  className="w-full p-2 rounded bg-slate-900 border border-slate-600 text-white"
                  value={newChartConfig.title}
                  onChange={e => setNewChartConfig({ ...newChartConfig, title: e.target.value })}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Visualization Type</label>
                <div className="flex gap-2">
                  {['line', 'bar', 'pie'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewChartConfig({ ...newChartConfig, type })}
                      className={`px-3 py-1 rounded capitalize ${newChartConfig.type === type ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Select Data Keys</label>
                <div className="max-h-40 overflow-y-auto bg-slate-900 p-2 rounded border border-slate-600">
                  {availableKeys.length === 0 && <p className="text-xs text-slate-500">No keys detected yet.</p>}
                  {availableKeys.map(key => (
                    <label key={key} className="flex items-center gap-2 mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newChartConfig.keys.includes(key)}
                        onChange={e => {
                          if (e.target.checked) setNewChartConfig(prev => ({ ...prev, keys: [...prev.keys, key] }));
                          else setNewChartConfig(prev => ({ ...prev, keys: prev.keys.filter(k => k !== key) }));
                        }}
                        className="rounded border-slate-600 bg-slate-800 text-cyan-600"
                      />
                      <span className="text-sm text-slate-300">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setIsChartCreatorOpen(false)} className="px-3 py-1 text-slate-400 hover:text-white">Cancel</button>
                <button
                  onClick={handleAddChart}
                  disabled={newChartConfig.keys.length === 0}
                  className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-500 disabled:opacity-50"
                >
                  Create Chart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Command Builder Modal */}
        {isCommandBuilderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Add Control</h3>
              <input
                className="w-full mb-3 p-2 rounded bg-slate-900 border border-slate-600 text-white"
                placeholder="Label"
                value={newControl.label}
                onChange={e => setNewControl({ ...newControl, label: e.target.value })}
              />
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                className="w-full mb-3 p-2 rounded bg-slate-900 border border-slate-600 text-white"
                value={newControl.type}
                onChange={e => setNewControl({ ...newControl, type: e.target.value })}
              >
                <option value="button">Button</option>
                <option value="switch">Switch</option>
                <option value="slider">Slider</option>
              </select>
              <input
                className="w-full mb-3 p-2 rounded bg-slate-900 border border-slate-600 text-white"
                placeholder="Command Key (e.g. led_state)"
                value={newControl.command_key}
                onChange={e => setNewControl({ ...newControl, command_key: e.target.value })}
              />
              {newControl.type !== 'slider' && (
                <input
                  className="w-full mb-3 p-2 rounded bg-slate-900 border border-slate-600 text-white"
                  placeholder="Payload (e.g. ON)"
                  value={newControl.payload}
                  onChange={e => setNewControl({ ...newControl, payload: e.target.value })}
                />
              )}
              {newControl.type === 'slider' && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="number"
                    className="w-1/2 p-2 rounded bg-slate-900 border border-slate-600 text-white"
                    placeholder="Min"
                    value={newControl.min}
                    onChange={e => setNewControl({ ...newControl, min: parseInt(e.target.value) })}
                  />
                  <input
                    type="number"
                    className="w-1/2 p-2 rounded bg-slate-900 border border-slate-600 text-white"
                    placeholder="Max"
                    value={newControl.max}
                    onChange={e => setNewControl({ ...newControl, max: parseInt(e.target.value) })}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setIsCommandBuilderOpen(false)} className="px-3 py-1 text-slate-400 hover:text-white">Cancel</button>
                <button onClick={handleAddControl} className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-500">Add</button>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Modal */}
        {isConfigOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-4xl shadow-2xl m-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Device Configuration</h2>
                <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-white">Close</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">Connection Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Broker Address</label>
                      <input className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-slate-400 font-mono text-sm" value={device?.broker_url || ''} readOnly />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Port</label>
                      <input className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-slate-400 font-mono text-sm" value={device?.broker_port || ''} readOnly />
                    </div>
                  </div>

                  <div className="mt-6">
                    <ConnectionWizard device={device} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Device Name</label>
                      <input className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white" value={device?.deviceType || device?.name || ''} readOnly />
                      <p className="text-xs text-slate-500 mt-1">Syncs with Dashboard Name</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
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
