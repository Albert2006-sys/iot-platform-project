import { useEffect, useState } from 'react';
import io from 'socket.io-client'; // Import Socket.io client
import ProtectedRoute from '../components/ProtectedRoute';
import api from '../services/api';
import { useAuth } from '../services/context/AuthContext'; // Import AuthContext
import DeviceCard from '../components/DeviceCard';
import Modal from '../components/Modal';
import AddDeviceForm from '../components/AddDeviceForm';
import AddGroupForm from '../components/AddGroupForm';

function DashboardPage() {
    const { token } = useAuth(); // Get auth token for socket
    const [user, setUser] = useState(null);
    const [groups, setGroups] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    const fetchData = () => {
        Promise.all([
            api.get('/users/me'),
            api.get('/groups'),
            api.get('/devices')
        ]).then(([userResponse, groupsResponse, devicesResponse]) => {
            setUser(userResponse.data);
            setGroups(groupsResponse.data);
            setDevices(devicesResponse.data);
        }).catch(error => {
            console.error("Failed to fetch dashboard data", error);
            setError('Could not load dashboard data. Please try again later.');
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, []);

    // Real-time status updates via Socket.io
    useEffect(() => {
        if (!token) return;

        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log('Dashboard connected to WebSocket');
        });

        socket.on('device-status', ({ deviceId, status }) => {
            console.log(`Received status update for ${deviceId}: ${status}`);
            setDevices(prevDevices => 
                prevDevices.map(device => 
                    device.deviceId === deviceId ? { ...device, status } : device
                )
            );
        });

        // Also listen for live-telemetry to set device online if data arrives
        socket.on('live-telemetry', ({ deviceId }) => {
             setDevices(prevDevices => 
                prevDevices.map(device => 
                    device.deviceId === deviceId ? { ...device, status: 'online' } : device
                )
            );
        });

        return () => {
            socket.disconnect();
        };
    }, [token]);

    const handleDeviceAdded = () => {
        fetchData();
    };

    const handleGroupAdded = () => {
        setIsGroupModalOpen(false);
        fetchData();
    };

    const handleDeviceDelete = async (deviceId) => {
        // A custom confirmation modal would fit the theme better than window.confirm
        if (confirm('Are you sure you want to decommission this device?')) {
            try {
                await api.delete(`/devices/${deviceId}`);
                setDevices(currentDevices => currentDevices.filter(device => device.deviceId !== deviceId));
            } catch (err) {
                console.error("Failed to delete device", err);
                setError('Could not decommission the device. Please try again.');
                fetchData();
            }
        }
    };

    // Sci-fi themed loading spinner
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <div className="w-20 h-20 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
            </div>
        );
    }

    const devicesByGroup = devices.reduce((acc, device) => {
        const groupId = device.group?._id || 'ungrouped';
        if (!acc[groupId]) {
            acc[groupId] = {
                name: device.group?.name || 'Unassigned Units',
                devices: [],
            };
        }
        acc[groupId].devices.push(device);
        return acc;
    }, {});
    
    const sortedGroupKeys = Object.keys(devicesByGroup).sort((a, b) => {
        if (a === 'ungrouped') return 1;
        if (b === 'ungrouped') return -1;
        return devicesByGroup[a].name.localeCompare(devicesByGroup[b].name);
    });

    return (
        <>
            {/* Injecting global styles for the sci-fi theme */}
            <style jsx global>{`
                body {
                    background-color: #020617; /* slate-950 */
                }
            `}</style>
            
            {/* Modals for adding devices and groups */}
            <Modal isOpen={isDeviceModalOpen} onClose={() => setIsDeviceModalOpen(false)} title="Register New Unit">
                <AddDeviceForm groups={groups} onDeviceAdded={handleDeviceAdded} onClose={() => setIsDeviceModalOpen(false)} />
            </Modal>
            <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title="Establish New Group">
                <AddGroupForm onGroupAdded={handleGroupAdded} onClose={() => setIsGroupModalOpen(false)} />
            </Modal>

            {/* Main dashboard container */}
            <div className="min-h-screen bg-slate-900 text-slate-300 font-sans p-4 sm:p-6 lg:p-8">
                <div className="container mx-auto">
                    {error && (
                        <div className="p-4 mb-6 text-sm text-red-300 bg-red-900/50 border border-red-500/30 rounded-lg" role="alert">
                            {error}
                        </div>
                    )}
                    {/* Dashboard Header */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-10 pb-4 border-b border-slate-700/50">
                        <div>
                            <h1 className="text-3xl font-bold text-cyan-400" style={{textShadow: '0 0 8px rgba(56, 189, 248, 0.5)'}}>
                                Welcome, {user ? user.username : 'Operator'}
                            </h1>
                            <p className="mt-1 text-lg text-slate-400">System Status: All devices at a glance.</p>
                        </div>
                        <div className="flex gap-3">
                            {/* Sci-fi styled buttons with icons */}
                            <button onClick={() => setIsGroupModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-800/70 border border-slate-600 text-slate-300 rounded-md hover:border-teal-400 hover:text-teal-400 transition-all duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                                Add Group
                            </button>
                            <button onClick={() => setIsDeviceModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-cyan-500/10 border border-cyan-500 text-cyan-400 rounded-md hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(56,189,248,0.4)] transition-all duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                Add Device
                            </button>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    {devices.length > 0 ? (
                        <div className="space-y-12">
                            {sortedGroupKeys.map(groupId => (
                                <div key={groupId}>
                                    <h2 className="text-xl font-light tracking-widest uppercase text-teal-400 mb-4 pb-2 border-b border-slate-800">{devicesByGroup[groupId].name}</h2>
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {devicesByGroup[groupId].devices.map(device => (
                                            // Applying a sci-fi wrapper to the existing DeviceCard component
                                            <div key={device._id} className="bg-slate-800/50 border border-slate-700 rounded-lg backdrop-blur-sm hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all duration-300">
                                                <DeviceCard
                                                    device={device}
                                                    onDelete={handleDeviceDelete}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Sci-fi themed "No Devices" message
                        <div className="py-24 text-center bg-slate-800/50 border border-dashed border-slate-700 rounded-lg">
                            <h3 className="text-xl font-semibold text-cyan-400">NO UNITS DETECTED</h3>
                            <p className="mt-2 text-slate-400 font-mono">Register a new unit to begin system monitoring.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function ProtectedDashboard() {
    return (
        <ProtectedRoute>
            <DashboardPage />
        </ProtectedRoute>
    );
}
