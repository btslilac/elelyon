'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { processRepayment } from '@/lib/actions/repayment.actions';
import { formatAmount } from '@/lib/utils';
import { Loader2, X, CreditCard, DollarSign, Calendar } from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Mobile Money'] as const;

/** Returns today's date as YYYY-MM-DD in the LOCAL timezone (not UTC) */
const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function RepaymentModal({ loanId, maxAmount, onClose }: RepaymentModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('Cash');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayLocal());
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const parsedAmount = parseFloat(amount) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= maxAmount;
  const today = todayLocal();
  const isBackdated = paymentDate < today;
  const isConnectionError = error.includes('timed out') || error.includes('Appwrite');

  const submit = (overridePayload?: { a: number; m: string; r: string; d: string }) => {
    setError('');
    const a = overridePayload?.a ?? parsedAmount;
    const m = overridePayload?.m ?? method;
    const r = overridePayload?.r ?? reference.trim();
    const d = overridePayload?.d ?? paymentDate;

    startTransition(async () => {
      try {
        const result = await processRepayment({
          loanId,
          amount: a,
          paymentMethod: m,
          referenceId: r,
          paymentDate: new Date(d + 'T12:00:00').toISOString(),
        });
        if (result.success) {
          router.refresh();
          onClose();
        } else {
          setError(result.error || 'Repayment failed. Please try again.');
        }
      } catch (err: any) {
        setError(err?.message || 'Repayment failed. Please try again.');
      }
    });
  };

  // Store last payload so the retry button can re-submit without re-entering data
  const lastPayloadRef = {
    a: parsedAmount, m: method, r: reference.trim(), d: paymentDate,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      setError(`Amount must be between KES 1 and ${formatAmount(maxAmount)}.`);
      return;
    }
    if (!paymentDate) {
      setError('Please select a payment date.');
      return;
    }
    submit();
  };

  return (
    /* Overlay: animation disabled to prevent flicker caused by CSS @keyframes
       re-triggering on every React state update (each keystroke). Only the
       modal-box itself animates on mount, which is stable. */
    <div
      className="modal-overlay"
      style={{ animation: 'none' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="repayment-modal-title">

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.5rem',
              background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CreditCard size={15} style={{ color: '#047857' }} />
            </div>
            <h2 className="modal-title" id="repayment-modal-title">Log Repayment</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Outstanding balance chip */}
        <div style={{
          margin: '0.75rem 1.5rem 0',
          padding: '0.625rem 0.875rem',
          background: '#F9FAFB',
          borderRadius: '0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span className="form-label" style={{ marginBottom: 0 }}>Outstanding Balance</span>
          <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#B91C1C', fontVariantNumeric: 'tabular-nums' }}>
            {formatAmount(maxAmount)}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Amount */}
            <div className="form-field">
              <label className="form-label" htmlFor="repay-amount">Amount (KES)</label>
              <input
                id="repay-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                placeholder="0.00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                className={`form-input${amount && !isAmountValid ? ' form-input-error' : ''}`}
                required
                autoFocus
              />
              {parsedAmount > 0 && (
                <span className="form-hint">
                  Remaining after: {formatAmount(Math.max(0, maxAmount - parsedAmount))}
                </span>
              )}
            </div>

            {/* ── Payment Date (backdating support) ── */}
            <div className="form-field">
              <label
                className="form-label"
                htmlFor="repay-date"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Calendar size={11} />
                Payment Date
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
                id="repay-date"
                type="date"
                value={paymentDate}
                max={today}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="form-input"
                required
              />
              {isBackdated && (
                <span className="form-hint" style={{ color: '#B45309' }}>
                  Recording a payment dated{' '}
                  {new Date(paymentDate + 'T12:00:00').toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {/* Payment Method */}
            <div className="form-field">
              <label className="form-label" htmlFor="repay-method">Payment Method</label>
              <select
                id="repay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="form-select"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Reference */}
            <div className="form-field">
              <label className="form-label" htmlFor="repay-ref">
                Reference ID{' '}
                <span className="form-hint" style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                id="repay-ref"
                type="text"
                placeholder="e.g. MPESA-ABC123"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Error + Retry */}
            {error && (
              <div>
                <div className="modal-error">
                  <X size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
                {isConnectionError && (
                  <button
                    type="button"
                    onClick={() => submit({ ...lastPayloadRef })}
                    disabled={isPending}
                    style={{
                      marginTop: '0.5rem',
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#B45309',
                      background: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      borderRadius: '0.5rem',
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    {isPending
                      ? <><Loader2 size={12} className="auth-spinner" /> Retrying…</>
                      : '↺ Retry Connection'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="submit"
              disabled={isPending || !isAmountValid}
              className="action-btn action-btn-primary"
              style={{
                opacity: isPending || !isAmountValid ? 0.6 : 1,
                cursor: isPending || !isAmountValid ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? (
                <><Loader2 size={15} className="auth-spinner" /><span>Processing…</span></>
              ) : (
                <><DollarSign size={15} /><span>{isBackdated ? 'Submit Backdated Repayment' : 'Submit Repayment'}</span></>
              )}
            </button>
            <button
              type="button"
              className="action-btn action-btn-outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
