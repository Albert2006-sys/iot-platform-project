// components/SliderControl.js
import { useState } from 'react';

export default function SliderControl({ control, onCommand }) {
  // Use the control's min value as the initial state, or 0
  const [value, setValue] = useState(control.min || 0);

  const handleSliderChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    setValue(newValue);
    // Send the command with the key and new value
    onCommand(control.commandKey, newValue);
  };

  return (
    <div className="py-2">
      <label className="block mb-2 text-sm font-bold text-gray-700">{control.label}</label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={control.min}
          max={control.max}
          value={value}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="font-semibold text-gray-800 w-14">{value}</span>
      </div>
    </div>
  );
}