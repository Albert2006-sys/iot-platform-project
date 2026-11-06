import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Brain,
  CheckCircle,
  Clock,
  Loader2,
  Shield,
  XCircle,
} from 'lucide-react';
import api from '../services/api';

const terminalStatuses = ['verified', 'failed', 'executed'];
const statusStyles = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  executed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  verified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-300 border-red-500/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
  expired: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};
const stages = ['pending', 'approved', 'executed', 'verified'];

const getDiagnosis = diagnosis => {
  if (typeof diagnosis === 'string') return diagnosis;
  if (diagnosis && typeof diagnosis === 'object') {
    return diagnosis.text || diagnosis.summary || diagnosis.message || JSON.stringify(diagnosis);
  }
  return 'No diagnosis provided.';
};

const getConfidence = confidence => {
  const numeric = Number(confidence);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric)) * 100);
};

const mergeProposal = (items, proposal) => {
  if (!proposal?._id) return items;
  const index = items.findIndex(item => item._id === proposal._id);
  if (index === -1) return [proposal, ...items];
  const next = [...items];
  next[index] = { ...next[index], ...proposal };
  return next;
};

const getErrorMessage = error => (
  error?.response?.data?.message || error?.message || 'Request failed. Please try again.'
);

function StatusTimeline({ status }) {
  const currentIndex = stages.indexOf(status);
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
      {stages.map((stage, index) => {
        const complete = currentIndex >= index && status !== 'failed';
        return (
          <div key={stage} className={`flex items-center gap-1.5 text-xs ${complete ? 'text-cyan-300' : 'text-slate-600'}`}>
            {complete ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {stage === 'pending' ? 'Proposed' : stage[0].toUpperCase() + stage.slice(1)}
          </div>
        );
      })}
      {['failed', 'rejected', 'expired'].includes(status) && (
        <div className="flex items-center gap-1.5 text-xs text-red-300">
          <XCircle className="h-4 w-4" />
          {status[0].toUpperCase() + status.slice(1)}
        </div>
      )}
    </div>
  );
}

export default function AIActionCenter({
  deviceId,
  token,
  socket,
  proposals: suppliedProposals,
  onApprove,
  onReject,
  busyId,
  error: suppliedError,
}) {
  const standalone = Boolean(deviceId);
  const [loadedProposals, setLoadedProposals] = useState([]);
  const [loading, setLoading] = useState(standalone);
  const [loadError, setLoadError] = useState('');
  const [requestId, setRequestId] = useState(null);
  const [cardErrors, setCardErrors] = useState({});

  const proposals = standalone ? loadedProposals : (suppliedProposals || []);
  const requestHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const loadProposals = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get(`/devices/${deviceId}/proposals`, { headers: requestHeaders });
      setLoadedProposals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [deviceId, requestHeaders]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleProposal = proposal => setLoadedProposals(previous => mergeProposal(previous, proposal));
    socket.on('proposal-update', handleProposal);
    socket.on('ai-proposal', handleProposal);
    return () => {
      socket.off('proposal-update', handleProposal);
      socket.off('ai-proposal', handleProposal);
    };
  }, [socket]);

  const performAction = async (proposal, action) => {
    if (standalone) {
      setRequestId(proposal._id);
      setCardErrors(previous => ({ ...previous, [proposal._id]: '' }));
      try {
        const response = await api.post(
          `/proposals/${proposal._id}/${action}`,
          {},
          { headers: requestHeaders },
        );
        if (response.data?._id) {
          setLoadedProposals(previous => mergeProposal(previous, response.data));
        } else {
          await loadProposals();
        }
      } catch (requestError) {
        setCardErrors(previous => ({ ...previous, [proposal._id]: getErrorMessage(requestError) }));
      } finally {
        setRequestId(null);
      }
      return;
    }

    if (action === 'approve') onApprove?.(proposal._id);
    else onReject?.(proposal._id);
  };

  const isBusy = proposal => standalone ? requestId === proposal._id : busyId === proposal._id;

  return (
    <section className="mb-8 rounded-xl border border-purple-500/30 bg-gray-800/60 p-5 shadow-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-purple-500/20 p-2">
          <Brain className="h-5 w-5 text-purple-300" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">AI Action Center</h2>
          <p className="text-xs text-gray-400">Review proposed actions before they execute</p>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-300">
          <span>{loadError}</span>
          <button type="button" onClick={loadProposals} className="rounded-md border border-red-400/40 px-3 py-1 hover:bg-red-500/10">
            Retry
          </button>
        </div>
      )}
      {suppliedError && !standalone && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-300">{suppliedError}</p>
      )}
      {loading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" /> Loading proposals...
        </div>
      ) : proposals.length === 0 ? (
        <p className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-sm text-gray-400">
          No proposals yet. AI proposals appear when an anomaly is detected.
        </p>
      ) : (
        <AnimatePresence>
        <div className="space-y-4">
          {proposals.map(proposal => {
            const anomaly = proposal.anomalyId && typeof proposal.anomalyId === 'object' ? proposal.anomalyId : null;
            const status = proposal.status || 'pending';
            const confidence = getConfidence(proposal.confidence);
            const busy = isBusy(proposal);
            const cardError = cardErrors[proposal._id] || (!standalone && suppliedError);
            return (
              <motion.article key={proposal._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-700 bg-gray-900/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-cyan-300">
                      {anomaly?.key || 'Anomaly'}: {anomaly?.value !== undefined ? Number(anomaly.value).toFixed(2) : '—'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white">{getDiagnosis(proposal.diagnosis)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${proposal.source === 'gemini' ? 'border-purple-400/30 bg-purple-500/15 text-purple-300' : 'border-gray-600 bg-gray-700/50 text-gray-300'}`}>
                      {proposal.source === 'gemini' ? 'Gemini' : 'Rules'}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.expired}`}>
                      {status[0].toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-gray-400">
                    <span>Confidence</span><span>{confidence}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-700">
                    <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${confidence}%` }} />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {(proposal.actions || []).map((action, index) => (
                    <div key={`${proposal._id}-${action.target}-${index}`} className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3">
                      <p className="text-sm font-medium text-cyan-200">Set {action.target} → {String(action.value)}</p>
                      <p className="mt-1 text-xs text-gray-400">{action.reason}</p>
                    </div>
                  ))}
                </div>

                <StatusTimeline status={status} />

                {status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => performAction(proposal, 'approve')} className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />} Approve
                    </button>
                    <button type="button" disabled={busy} onClick={() => performAction(proposal, 'reject')} className="flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-300 hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}

                {terminalStatuses.includes(status) && (proposal.baselineBefore !== undefined || proposal.valueAfter !== undefined || proposal.outcomeSummary) && (
                  <div className="mt-4 rounded-lg border border-gray-700 bg-gray-950/60 p-3 text-sm">
                    {(proposal.baselineBefore !== undefined || proposal.valueAfter !== undefined) && (
                      <p className="text-gray-300">
                        Before: <span className="text-white">{proposal.baselineBefore ?? '—'}</span>
                        {' · '}
                        After: <span className="text-cyan-300">{proposal.valueAfter ?? '—'}</span>
                      </p>
                    )}
                    {proposal.outcomeSummary && <p className="mt-1 text-gray-400">{proposal.outcomeSummary}</p>}
                  </div>
                )}

                {cardError && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-red-300">
                    <AlertTriangle className="h-4 w-4" /> {cardError}
                  </p>
                )}
              </motion.article>
            );
          })}
        </div>
        </AnimatePresence>
      )}
    </section>
  );
}
