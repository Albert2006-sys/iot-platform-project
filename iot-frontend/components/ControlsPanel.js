// components/ControlsPanel.js
import SliderControl from './SliderControl';

export default function ControlsPanel({ device, socket }) {
  const handleCommand = (commandKey, value) => {
    if (socket && socket.connected) {
      const payload = { [commandKey]: value };
      socket.emit('device-command', {
        deviceId: device.deviceId,
        payload: payload
      });
    } else {
      console.error("Socket not connected. Cannot send command.");
    }
  };

  return (
    <div className="space-y-4">
      {device.controls.map(control => {
        switch (control.type) {
          case 'slider':
            return <SliderControl key={control._id} control={control} onCommand={handleCommand} />;
          // Add cases for 'button', 'switch', etc. in the future
          default:
            return <p key={control._id}>Unsupported control type: {control.type}</p>;
        }
      })}
      {device.controls.length === 0 && (
        <div className="flex items-center justify-center h-32 text-gray-400 bg-gray-50 rounded">
          No controls configured for this device.
        </div>
      )}
    </div>
  );
}