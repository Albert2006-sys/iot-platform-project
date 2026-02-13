
import { Thermometer, Droplets, Cpu, Battery, Activity, Power, ToggleRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const icons = {
  temperature: Thermometer,
  humidity: Droplets,
  cpu: Cpu,
  battery: Battery,
  power: Power,
  switch: ToggleRight,
  default: Activity
};

export default function DynamicWidget({ mapping, value, history = [] }) {
  // Normalize key to find icon match
  const keyLower = (mapping.raw_key || '').toLowerCase();
  const Icon = icons[keyLower] || (Object.keys(icons).find(k => keyLower.includes(k)) ? icons[Object.keys(icons).find(k => keyLower.includes(k))] : icons.default);
  
  const isNumeric = typeof value === 'number';
  const isBoolean = typeof value === 'boolean' || (typeof value === 'string' && ['ON','OFF','TRUE','FALSE'].includes(value.toUpperCase()));
  
  let statusColor = 'text-slate-400';
  let statusBg = 'bg-slate-700/50';

  if (isBoolean) {
      const distinctVal = String(value).toUpperCase();
      if (['ON', 'TRUE'].includes(distinctVal)) {
          statusColor = 'text-green-400';
          statusBg = 'bg-green-500/20';
      } else {
          statusColor = 'text-slate-400';
          statusBg = 'bg-slate-700/50';
      }
  }

  return (
    <div className="p-6 border shadow-lg bg-slate-800 border-slate-700 rounded-xl flex flex-col justify-between h-[160px] relative overflow-hidden">
      
      <div className="flex items-start justify-between z-10">
        <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{mapping.alias || mapping.raw_key}</h3>
            <div className="flex items-center gap-2 mt-2">
                 <div className={`p-2 rounded-lg ${statusBg}`}>
                    <Icon className={`w-5 h-5 ${isBoolean ? statusColor : 'text-cyan-500'}`} />
                 </div>
                 <span className={`text-3xl font-bold text-white tracking-tight`}>
                    {value !== undefined && value !== null ? value.toString() : '--'}
                    {isNumeric && mapping.unit && <span className="text-sm font-normal text-slate-500 ml-1">{mapping.unit}</span>}
                 </span>
            </div>
        </div>
      </div>

      {/* Render Sparkline for Numeric Values */}
      {isNumeric && history.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                      <Line 
                        type="monotone" 
                        dataKey={mapping.raw_key} 
                        stroke="#06b6d4" 
                        strokeWidth={4} 
                        dot={false} 
                      />
                  </LineChart>
              </ResponsiveContainer>
          </div>
      )}
      
      {/* Visual Indicator for Boolean */}
      {isBoolean && (
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${String(value).toUpperCase() === 'ON' || value === true ? 'bg-green-500' : 'bg-slate-600'}`}></div>
      )}
    </div>
  );
}
