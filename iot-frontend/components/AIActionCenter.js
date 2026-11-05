import { CheckCircle2, Circle, Loader2, XCircle, Zap } from 'lucide-react';

const stages = ['pending', 'approved', 'executed', 'verified'];

const statusLabel = status => status === 'pending' ? 'Proposed' : (
  status.charAt(0).toUpperCase() + status.slice(1)
);

export default function AIActionCenter({
  proposals,
  onApprove,
  onReject,
  busyId,
  error,
}) {
  return (
    <section className="mb-8 rounded-xl border border-purple-500/30 bg-slate-800/50 p-5 shadow-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-purple-500/20 p-2">
          <Zap className="h-5 w-5 text-purple-300" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">AI Action Center</h2>
          <p className="text-xs text-slate-400">Review proposed actions before they execute</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      {proposals.length === 0 ? (
        <p className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-500">
          No AI proposals for this device.
        </p>
      ) : (
        <div className="space-y-4">
          {proposals.map(proposal => {
            const anomaly = proposal.anomalyId && typeof proposal.anomalyId === 'object'
              ? proposal.anomalyId
              : null;
            const busy = busyId === proposal._id;
            const isTerminal = ['rejected', 'verified', 'failed', 'expired'].includes(proposal.status);
            const currentStage = stages.indexOf(proposal.status);
            return (
              <article key={proposal._id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-cyan-300">
                      {anomaly?.key || 'Anomaly'}: {anomaly?.value !== undefined ? Number(anomaly.value).toFixed(2) : '—'}
                    </p>
                    <p className="mt-1 text-white">{proposal.diagnosis}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    proposal.source === 'gemini'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {proposal.source === 'gemini' ? 'Gemini' : 'Rules'}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>Confidence</span><span>{Math.round(proposal.confidence * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700">
                    <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${Math.round(proposal.confidence * 100)}%` }} />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {proposal.actions?.map(action => (
                    <div key={`${proposal._id}-${action.target}`} className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 text-sm">
                      <p className="font-medium text-cyan-200">Set {action.target} → {String(action.value)}</p>
                      <p className="mt-1 text-slate-400">{action.reason}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {stages.map((stage, index) => {
                    const complete = currentStage >= index && proposal.status !== 'failed';
                    return (
                      <div key={stage} className={`flex items-center gap-1 text-xs ${complete ? 'text-cyan-300' : 'text-slate-600'}`}>
                        {complete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        {statusLabel(stage)}
                      </div>
                    );
                  })}
                  {proposal.status === 'failed' && <span className="flex items-center gap-1 text-xs text-red-300"><XCircle className="h-4 w-4" /> Failed</span>}
                  {proposal.status === 'rejected' && <span className="flex items-center gap-1 text-xs text-red-300"><XCircle className="h-4 w-4" /> Rejected</span>}
                  {proposal.status === 'expired' && <span className="text-xs text-amber-300">Expired</span>}
                </div>

                {!isTerminal && proposal.status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onApprove(proposal._id)}
                      className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onReject(proposal._id)}
                      className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {proposal.valueAfter !== undefined && (
                  <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm">
                    <p className="text-slate-300">Before: <span className="text-white">{Number(proposal.baselineBefore).toFixed(2)}</span> · After: <span className="text-cyan-300">{Number(proposal.valueAfter).toFixed(2)}</span></p>
                    {proposal.outcomeSummary && <p className="mt-1 text-slate-400">{proposal.outcomeSummary}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
