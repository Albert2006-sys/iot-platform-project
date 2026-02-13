// components/Modal.js
export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg p-6 border bg-slate-900 border-slate-700 rounded-lg shadow-2xl shadow-cyan-500/10">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <h3 className="text-2xl font-semibold text-cyan-400">{title}</h3>
          <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-slate-300 transition-colors">&times;</button>
        </div>
        <div className="mt-4 text-slate-300">
          {children}
        </div>
      </div>
    </div>
  );
}
