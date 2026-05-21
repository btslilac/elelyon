'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { restructureLoan } from '@/lib/actions/loan.actions';
import { Loader2, X, RefreshCw } from 'lucide-react';

interface RestructureModalProps {
  loan: any;
  onClose: () => void;
}

export default function RestructureModal({ loan, onClose }: RestructureModalProps) {
  const router = useRouter();
  const [principalAmount, setPrincipalAmount] = useState(loan.balance || loan.principalAmount);
  const [interestRate, setInterestRate] = useState(loan.interestRate);
  const [durationInMonths, setDurationInMonths] = useState(loan.durationInMonths);
  const [interestType, setInterestType] = useState<"Flat" | "Reducing">(loan.interestType || "Flat");
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const isValid = principalAmount > 0 && interestRate >= 0 && durationInMonths > 0 && reason.trim().length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError('Please provide valid terms and a reason (min 10 characters) for the restructure.');
      return;
    }

    startTransition(async () => {
      try {
        await restructureLoan(loan.$id, {
          principalAmount: Number(principalAmount),
          interestRate: Number(interestRate),
          durationInMonths: Number(durationInMonths),
          interestType,
          reason,
        });
        router.refresh();
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to restructure loan.');
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
              background: '#EFF6FF', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <RefreshCw size={14} style={{ color: '#2563EB' }} />
            </div>
            <h2 className="modal-title">Restructure Loan</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-field">
              <label className="form-label">New Principal Amount (KES)</label>
              <input
                type="number"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                className="form-input"
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">New Interest Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="form-input"
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">New Duration (Months)</label>
              <input
                type="number"
                value={durationInMonths}
                onChange={(e) => setDurationInMonths(Number(e.target.value))}
                className="form-input"
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">Interest Type</label>
              <select
                value={interestType}
                onChange={(e) => setInterestType(e.target.value as "Flat" | "Reducing")}
                className="form-select"
              >
                <option value="Flat">Flat Rate</option>
                <option value="Reducing">Reducing Balance</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Reason for Restructuring (Minimum 10 characters)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="form-input"
                style={{ minHeight: '80px', resize: 'vertical' }}
                placeholder="Provide detailed justification for auditing..."
                required
              />
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
              className="action-btn action-btn-primary"
            >
              {isPending ? (
                <><Loader2 size={15} className="auth-spinner" /><span>Processing…</span></>
              ) : (
                <><RefreshCw size={15} /><span>Apply Restructure</span></>
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
