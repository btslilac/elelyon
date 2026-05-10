'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPenalty } from '@/lib/actions/penalty.actions';
import { formatAmount } from '@/lib/utils';
import { Loader2, X, AlertTriangle } from 'lucide-react';

const PENALTY_TYPES: PenaltyType[] = [
  'Late Payment',
  'Missed Installment',
  'Daily Overdue Interest',
  'Manual Administrative Charge',
  'Restructuring Fee',
  'Recovery Fee',
  'Legal Fee',
  'Custom Penalty',
];

export default function PenaltyModal({
  loanId,
  clientId,
  loanBalance,
  currentUser,
  onClose,
}: PenaltyModalProps) {
  const router = useRouter();
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('Late Payment');
  const [calcMode, setCalcMode] = useState<'fixed' | 'percentage'>('fixed');
  const [rawValue, setRawValue] = useState('');
  const [comment, setComment] = useState('');
  const [dateApplied, setDateApplied] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Derived penalty amount
  const parsedValue = parseFloat(rawValue) || 0;
  const penaltyAmount = calcMode === 'fixed'
    ? parsedValue
    : (loanBalance * parsedValue) / 100;

  const isValid = penaltyAmount > 0 && parsedValue > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError('Please enter a valid penalty value greater than zero.');
      return;
    }
    if (!comment.trim()) {
      setError('A reason/comment is required for audit purposes.');
      return;
    }

    startTransition(async () => {
      try {
        await createPenalty({
          loanId,
          clientId,
          amount: parseFloat(penaltyAmount.toFixed(2)),
          penaltyType,
          comment: comment.trim(),
          appliedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System',
          dateApplied: new Date(dateApplied).toISOString(),
        });
        router.refresh();
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to apply penalty. Please try again.');
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="penalty-modal-title">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.5rem',
              background: '#FEF2F2', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={14} style={{ color: '#B91C1C' }} />
            </div>
            <h2 className="modal-title" id="penalty-modal-title">Apply Penalty</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Penalty Type */}
            <div className="form-field">
              <label className="form-label" htmlFor="penalty-type">Penalty Type</label>
              <select
                id="penalty-type"
                value={penaltyType}
                onChange={(e) => setPenaltyType(e.target.value as PenaltyType)}
                className="form-select"
              >
                {PENALTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Amount mode toggle */}
            <div className="form-field">
              <label className="form-label">Calculation Method</label>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn${calcMode === 'fixed' ? ' toggle-btn-active' : ''}`}
                  onClick={() => { setCalcMode('fixed'); setRawValue(''); }}
                >
                  Fixed Amount (KES)
                </button>
                <button
                  type="button"
                  className={`toggle-btn${calcMode === 'percentage' ? ' toggle-btn-active' : ''}`}
                  onClick={() => { setCalcMode('percentage'); setRawValue(''); }}
                >
                  % of Balance
                </button>
              </div>
            </div>

            {/* Value input */}
            <div className="form-field">
              <label className="form-label" htmlFor="penalty-value">
                {calcMode === 'fixed' ? 'Amount (KES)' : `Percentage of ${formatAmount(loanBalance)}`}
              </label>
              <input
                id="penalty-value"
                type="number"
                step="0.01"
                min="0.01"
                max={calcMode === 'percentage' ? 100 : undefined}
                placeholder={calcMode === 'fixed' ? '0.00' : '0.00%'}
                value={rawValue}
                onChange={(e) => { setRawValue(e.target.value); setError(''); }}
                className={`form-input${rawValue && !isValid ? ' form-input-error' : ''}`}
                required
                autoFocus
              />
            </div>

            {/* Preview */}
            {isValid && (
              <div className={`preview-box${calcMode === 'percentage' ? ' preview-box-danger' : ''}`}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                  Penalty to be applied
                </span>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#B91C1C', fontVariantNumeric: 'tabular-nums' }}>
                  +{formatAmount(penaltyAmount)}
                </span>
              </div>
            )}

            {/* Date */}
            <div className="form-field">
              <label className="form-label" htmlFor="penalty-date">Date Applied</label>
              <input
                id="penalty-date"
                type="date"
                value={dateApplied}
                onChange={(e) => setDateApplied(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Comment */}
            <div className="form-field">
              <label className="form-label" htmlFor="penalty-comment">Reason / Comment <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea
                id="penalty-comment"
                placeholder="Provide a clear reason for this penalty (required for audit trail)..."
                value={comment}
                onChange={(e) => { setComment(e.target.value); setError(''); }}
                className="form-textarea"
                required
              />
              <span className="form-hint">Required for audit compliance.</span>
            </div>

            {/* Applied by (read-only) */}
            <div className="form-field">
              <label className="form-label">Applied By</label>
              <input
                type="text"
                value={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown User'}
                readOnly
                className="form-input"
                style={{ color: '#6B7280', cursor: 'default' }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="modal-error">
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="submit"
              disabled={isPending || !isValid}
              className="action-btn action-btn-danger-soft"
              style={{
                opacity: isPending || !isValid ? 0.6 : 1,
                cursor: isPending || !isValid ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? (
                <><Loader2 size={15} className="auth-spinner" /><span>Applying…</span></>
              ) : (
                <><AlertTriangle size={15} /><span>Apply Penalty{isValid ? ` — ${formatAmount(penaltyAmount)}` : ''}</span></>
              )}
            </button>
            <button type="button" className="action-btn action-btn-outline" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
