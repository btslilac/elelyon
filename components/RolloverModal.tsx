'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rolloverLoan } from '@/lib/actions/loan.actions';
import { formatAmount } from '@/lib/utils';
import { Loader2, X, FastForward, Calendar } from 'lucide-react';

interface RolloverModalProps {
  loan: any;
  onClose: () => void;
}

/** Returns today's date as YYYY-MM-DD in the LOCAL timezone (not UTC) */
const todayLocal = () => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function RolloverModal({ loan, onClose }: RolloverModalProps) {
  const router = useRouter();
  const [extensionMonths, setExtensionMonths] = useState(1);
  const [rolloverFeePercentage, setRolloverFeePercentage] = useState(10);
  const [rolloverDate, setRolloverDate] = useState(todayLocal());
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const outstandingPrincipal = loan.remainingPrincipal || loan.balance || loan.principalAmount;
  const rolloverFeeAmount = outstandingPrincipal * (rolloverFeePercentage / 100);
  const isBackdated = rolloverDate < todayLocal();
  const isValid = extensionMonths > 0 && rolloverFeePercentage >= 0 && !!rolloverDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError('Please provide valid rollover terms.');
      return;
    }

    startTransition(async () => {
      try {
        await rolloverLoan(loan.$id, Number(extensionMonths), Number(rolloverFeePercentage), rolloverDate);
        router.refresh();
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to rollover loan.');
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.5rem',
              background: '#F5F3FF', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FastForward size={14} style={{ color: '#7C3AED' }} />
            </div>
            <h2 className="modal-title">Rollover Loan</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-field">
              <label className="form-label">Extension Duration (Months)</label>
              <input
                type="number"
                min="1"
                value={extensionMonths}
                onChange={(e) => setExtensionMonths(Number(e.target.value))}
                className="form-input"
                required
              />
            </div>

            {/* ── Rollover Date (backdating support) ── */}
            <div className="form-field">
              <label
                className="form-label"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Calendar size={11} />
                Rollover Date
                {isBackdated && (
                  <span style={{
                    marginLeft: '0.25rem',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    color: '#B45309',
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    borderRadius: '0.25rem',
                    padding: '0.0625rem 0.375rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Backdated
                  </span>
                )}
              </label>
              <input
                type="date"
                value={rolloverDate}
                max={todayLocal()}
                onChange={(e) => setRolloverDate(e.target.value)}
                className="form-input"
                required
              />
              {isBackdated && (
                <span className="form-hint" style={{ color: '#B45309' }}>
                  Rolling over backdated to{' '}
                  {new Date(rolloverDate + 'T12:00:00').toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Rollover Fee Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={rolloverFeePercentage}
                onChange={(e) => setRolloverFeePercentage(Number(e.target.value))}
                className="form-input"
                required
              />
              <span className="form-hint">% of outstanding principal (KES {formatAmount(outstandingPrincipal)})</span>
            </div>

            <div className="preview-box">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                  Estimated Rollover Fee
                </span>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                  Based on outstanding principal: {formatAmount(outstandingPrincipal)}
                </span>
              </div>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#7C3AED', fontVariantNumeric: 'tabular-nums' }}>
                +{formatAmount(rolloverFeeAmount)}
              </span>
            </div>

            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="submit"
              disabled={isPending || !isValid}
              className="action-btn"
              style={{ background: '#7C3AED', color: '#FFF' }}
            >
              {isPending ? (
                <><Loader2 size={15} className="auth-spinner" /><span>Processing…</span></>
              ) : (
                <><FastForward size={15} /><span>{isBackdated ? 'Apply Backdated Rollover' : 'Apply Rollover'}</span></>
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
