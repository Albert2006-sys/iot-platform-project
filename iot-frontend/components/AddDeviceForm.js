// components/AddDeviceForm.js
import { useState } from 'react';
import api from '../services/api';

// The component now accepts 'groups' as a prop
export default function AddDeviceForm({ groups, onDeviceAdded, onClose }) {
  const [deviceType, setDeviceType] = useState('');
  const [groupId, setGroupId] = useState(''); // New state for selected group
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newDeviceCredentials, setNewDeviceCredentials] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Send the selected groupId to the backend
      const response = await api.post('/devices', { deviceType, groupId: groupId || null });
      setNewDeviceCredentials(response.data.credentials);
      onDeviceAdded(response.data);
    } catch (err) {
      setError('Failed to add device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (newDeviceCredentials) {
    // ... (this part remains the same)
    return (
      <div>
        <h4 className="mb-2 font-bold text-green-700">Device Created Successfully!</h4>
        <p className="mb-4 text-sm">Please save these credentials. You will not be able to see the secret again.</p>
        <div className="p-3 mb-4 text-sm font-mono bg-gray-100 border rounded">
          <p><strong>Username (Device ID):</strong> {newDeviceCredentials.username}</p>
          <p><strong>Password (Secret):</strong> {newDeviceCredentials.secret}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="mb-4 text-red-500">{error}</p>}
      <div className="mb-4">
        <label htmlFor="deviceType" className="block mb-2 font-bold text-gray-700">Device Type</label>
        <input
          type="text"
          id="deviceType"
          value={deviceType}
          onChange={(e) => setDeviceType(e.target.value)}
          className="w-full px-3 py-2 leading-tight text-gray-700 border rounded"
          placeholder="e.g., Living Room Thermostat"
          required
        />
      </div>

      {/* --- NEW DROPDOWN FOR GROUPS --- */}
      <div className="mb-6">
        <label htmlFor="group" className="block mb-2 font-bold text-gray-700">Assign to Group (Optional)</label>
        <select
          id="group"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="w-full px-3 py-2 leading-tight text-gray-700 border rounded"
        >
          <option value="">No Group</option>
          {groups.map(group => (
            <option key={group._id} value={group._id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
      {/* --- END OF NEW DROPDOWN --- */}

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 mr-2 font-bold text-gray-700 bg-gray-200 rounded hover:bg-gray-300">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Creating...' : 'Create Device'}
        </button>
      </div>
    </form>
  );
}