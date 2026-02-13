
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const colors = ["#06b6d4", "#8b5cf6", "#f97316", "#3b82f6", "#10b981", "#ef4444"];

export default function ComparativeChart({ data, keys }) {
  if (!data || data.length === 0) return <div className="text-center text-slate-500">No data available</div>;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
          {keys.map((keyObj, index) => (
            <Line 
              key={keyObj.raw_key}
              type="monotone" 
              dataKey={keyObj.raw_key} 
              name={keyObj.alias}
              stroke={colors[index % colors.length]} 
              strokeWidth={2} 
              dot={false}
              activeDot={{r: 6}}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
