'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { waiveLoanBalance } from '@/lib/actions/loan.actions';
import { formatAmount } from '@/lib/utils';
import { Loader2, X, Percent, AlertTriangle, ShieldCheck } from 'lucide-react';

interface WaiveModalProps {
  loanId: string;
  currentUser: User;
  loan: {
    remainingPrincipal: number;
    remainingInterest: number;
    remainingPenalties: number;
  };
  onClose: () => void;
}

export default function WaiveModal({ loanId, currentUser, loan, onClose }: WaiveModalProps) {
  const router = useRouter();
  const [waiverType, setWaiverType] = useState<'Principal' | 'Interest' | 'Penalty'>('Interest');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Determine current available balance for the selected category
  const availableBalance =
    waiverType === 'Principal'
      ? loan.remainingPrincipal
      : waiverType === 'Interest'
      ? loan.remainingInterest
      : loan.remainingPenalties;

  // Clear amount if type changes
  useEffect(() => {
    setAmount('');
    setError('');
  }, [waiverType]);

  const numAmount = Number(amount);
  const isValid =
    reason.trim().length >= 10 &&
    numAmount > 0 &&
    numAmount <= availableBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (numAmount <= 0) {
      setError('Waiver amount must be greater than zero.');
      return;
    }

    if (numAmount > availableBalance) {
      setError(
        `Waiver amount cannot exceed the outstanding ${waiverType.toLowerCase()} balance of ${formatAmount(
          availableBalance
        )}.`
      );
      return;
    }

    if (reason.trim().length < 10) {
      setError('Please provide a detailed reason for audit compliance (min. 10 characters).');
      return;
    }

    startTransition(async () => {
      try {
        await waiveLoanBalance(loanId, waiverType, numAmount, reason.trim());
        router.refresh();
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to apply waiver. Only Admins or Managers can execute this.');
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="waive-modal-title">
        
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.5rem',
              background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Percent size={14} style={{ color: '#D97706' }} />
            </div>
            <h2 className="modal-title" id="waive-modal-title">Waive Balance</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Informative pill */}
        <div style={{
          margin: '0.75rem 1.5rem 0',
          padding: '0.875rem 1rem',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '0.625rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}>
          <ShieldCheck size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: '0.125rem' }} />
          <div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#92400E', marginBottom: '0.25rem' }}>
              Authorized Credit Adjustment
            </p>
            <p style={{ fontSize: '0.75rem', color: '#B45309', lineHeight: 1.4 }}>
              This waiver will immediately adjust the outstanding loan statement balances in the backend. 
              The adjusted amounts will be logged under standard compliance audit parameters.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Waiver Category Selection */}
            <div className="form-field">
              <label className="form-label" htmlFor="waive-type">
                Category to Waive <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                id="waive-type"
                value={waiverType}
                onChange={(e) => setWaiverType(e.target.value as any)}
                className="form-input"
                style={{ width: '100%' }}
                required
              >
                <option value="Interest">Accrued Interest (Outstanding: {formatAmount(loan.remainingInterest)})</option>
                <option value="Penalty">Accumulated Penalties (Outstanding: {formatAmount(loan.remainingPenalties)})</option>
                <option value="Principal">Borrowed Principal (Outstanding: {formatAmount(loan.remainingPrincipal)})</option>
              </select>
            </div>

            {/* Waiver Amount */}
            <div className="form-field">
              <label className="form-label" htmlFor="waive-amount">
                Waiver Amount (KES) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="waive-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={availableBalance}
                  placeholder={`Max: ${availableBalance.toFixed(2)}`}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  className="form-input"
                  style={{ width: '100%' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(availableBalance.toString())}
                  style={{
                    position: 'absolute',
                    right: '0.625rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#FEF3C7',
                    border: 'none',
                    borderRadius: '0.25rem',
                    color: '#D97706',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                  }}
                  title="Waive maximum available balance"
                >
                  Waive Max
                </button>
              </div>
              <span className="form-hint" style={{ color: '#9CA3AF' }}>
                Current outstanding {waiverType.toLowerCase()} balance: {formatAmount(availableBalance)}
              </span>
            </div>

            {/* Reason */}
            <div className="form-field">
              <label className="form-label" htmlFor="waive-reason">
                Justification / Reason <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                id="waive-reason"
                placeholder="Provide a thorough justification for waiving this balance (e.g. good-faith borrower settlement, negotiated relief, COVID-19 concessions)..."
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(''); }}
                className="form-textarea"
                rows={4}
                required
              />
              <span className="form-hint">
                Minimum 10 characters required. Operator: {currentUser.firstName} {currentUser.lastName} ({currentUser.role}).
              </span>
            </div>

            {/* Error display */}
            {error && (
              <div className="modal-error" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="submit"
              disabled={isPending || !isValid}
              className="action-btn"
              style={{
                background: isValid ? '#D97706' : '#FCD34D',
                color: '#FFF',
                opacity: isPending ? 0.7 : 1,
                cursor: isPending || !isValid ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? (
                <><Loader2 size={15} className="auth-spinner" /><span>Applying Waiver…</span></>
              ) : (
                <><Percent size={15} /><span>Apply Waiver</span></>
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
