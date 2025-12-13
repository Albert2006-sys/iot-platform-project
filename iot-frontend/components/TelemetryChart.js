// components/TelemetryChart.js
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TelemetryChart({ data, dataKeys }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400 bg-gray-50 rounded">No telemetry data to display.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" stroke="#888888" />
        <YAxis stroke="#888888" />
        <Tooltip />
        <Legend />
        {dataKeys.map((key, index) => (
          <Line key={key} type="monotone" dataKey={key} stroke={['#8884d8', '#82ca9d', '#ffc658'][index % 3]} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}