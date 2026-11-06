// components/Modal.js
import { AnimatePresence, motion } from 'framer-motion';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }} className="w-full max-w-lg p-6 border bg-slate-900 border-slate-700 rounded-lg shadow-2xl shadow-cyan-500/10">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <h3 className="text-2xl font-semibold text-cyan-400">{title}</h3>
          <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-slate-300 transition-colors">&times;</button>
        </div>
        <div className="mt-4 text-slate-300">
          {children}
        </div>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  );
}
