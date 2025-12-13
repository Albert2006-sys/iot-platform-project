// components/AddGroupForm.js
import { useState } from 'react';
import api from '../services/api';

export default function AddGroupForm({ onGroupAdded, onClose }) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
        await api.post('/groups', { name });
        onGroupAdded(); // This was the line with the typo
    } catch (err) {
        setError('Failed to create group. Please try again.');
        setLoading(false);
    }
};

    return (
        <form onSubmit={handleSubmit} className="text-slate-300">
            {error && <p className="mb-4 text-red-400">{error}</p>}
            <div className="mb-4">
                <label htmlFor="groupName" className="block mb-2 text-sm font-semibold text-slate-400">Group Name</label>
                <input
                    type="text"
                    id="groupName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-slate-200 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="e.g., Living Room Sector"
                    required
                />
            </div>
            <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={onClose} className="px-4 py-2 font-bold bg-slate-600 rounded-md hover:bg-slate-500">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 font-bold text-slate-900 bg-cyan-400 rounded-md hover:bg-cyan-300 disabled:bg-slate-500"
                >
                    {loading ? 'Creating...' : 'Establish Group'}
                </button>
            </div>
        </form>
    );
}