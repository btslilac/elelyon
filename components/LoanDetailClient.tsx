'use client';

import { useState } from 'react';
import { reversePenalty } from '@/lib/actions/penalty.actions';
import { formatAmount, cn } from '@/lib/utils';
import RepaymentModal from './RepaymentModal';
import PenaltyModal from './PenaltyModal';
import {
  DollarSign, AlertTriangle, FileText, ChevronDown,
  CheckCircle, RotateCcw, ArrowUpRight, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

interface AuditDot {
  action: AuditAction;
  className: string;
  symbol: string;
}

const AUDIT_DOT_MAP: Record<string, AuditDot> = {
  REPAYMENT_CREATED: { action: 'REPAYMENT_CREATED', className: 'timeline-dot-repayment', symbol: '↓' },
  REPAYMENT_REVERSED: { action: 'REPAYMENT_REVERSED', className: 'timeline-dot-penalty', symbol: '↺' },
  PENALTY_ADDED: { action: 'PENALTY_ADDED', className: 'timeline-dot-penalty', symbol: '!' },
  PENALTY_REVERSED: { action: 'PENALTY_REVERSED', className: 'timeline-dot-system', symbol: '↺' },
  LOAN_APPROVED: { action: 'LOAN_APPROVED', className: 'timeline-dot-loan', symbol: '✓' },
  LOAN_DENIED: { action: 'LOAN_DENIED', className: 'timeline-dot-penalty', symbol: '✗' },
  LOAN_UPDATED: { action: 'LOAN_UPDATED', className: 'timeline-dot-system', symbol: '✎' },
  STATUS_CHANGED: { action: 'STATUS_CHANGED', className: 'timeline-dot-loan', symbol: '⇄' },
  STATEMENT_GENERATED: { action: 'STATEMENT_GENERATED', className: 'timeline-dot-system', symbol: '⬇' },
};

function humanizeAction(action: string) {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  loan: Loan & { $id: string };
  client: LMSClient;
  repayments: Repayment[];
  penalties: Penalty[];
  auditLogs: AuditLog[];
  currentUser: User;
  totalPaid: number;
  progressPercent: number;
}

export default function LoanDetailClient({
  loan,
  client,
  repayments,
  penalties,
  auditLogs,
  currentUser,
  totalPaid,
  progressPercent,
}: Props) {
  const [showRepayment, setShowRepayment] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);

  const isActionable = loan.status === 'Active' || loan.status === 'Overdue';
  const activePenalties = penalties.filter((p) => p.status === 'Active');
  const totalPenalties = activePenalties.reduce((s, p) => s + p.amount, 0);

  const handleReversepenalty = async (penaltyId: string) => {
    if (!confirm('Reverse this penalty? This will restore the loan balance.')) return;
    setReversingId(penaltyId);
    try {
      await reversePenalty(penaltyId, loan.$id);
    } catch {
      alert('Failed to reverse penalty.');
    } finally {
      setReversingId(null);
    }
  };

  return (
    <>
      {/* ── KPI Financial Strip ── */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-label">Total Payable</span>
          <span className="kpi-value">{formatAmount(loan.totalPayable || 0)}</span>
          <span className="kpi-sub">Principal + interest</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Collected</span>
          <span className={cn('kpi-value', totalPaid > 0 ? 'kpi-value-success' : '')}>
            {formatAmount(totalPaid)}
          </span>
          <span className="kpi-sub">{progressPercent.toFixed(1)}% recovered</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Outstanding Balance</span>
          <span className={cn('kpi-value', loan.balance > 0 ? 'kpi-value-danger' : 'kpi-value-success')}>
            {formatAmount(loan.balance || 0)}
          </span>
          <span className="kpi-sub">Current liability</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Penalties Accrued</span>
          <span className={cn('kpi-value', (loan.penaltyAccrued || 0) > 0 ? 'kpi-value-warning' : '')}>
            {formatAmount(loan.penaltyAccrued || 0)}
          </span>
          <span className="kpi-sub">{activePenalties.length} active penalties</span>
        </div>
      </div>

      {/* ── Main 2-col layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}
          className="loan-detail-grid">
          {/* LEFT: Financial Terms */}
          <div className="card-premium" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#111113', borderRadius: '0.875rem 0.875rem 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-heading" style={{ marginBottom: 0 }}>Financial Terms</h2>
              {loan.status === 'Pending' && (
                <Link href={`/loans/${loan.$id}/edit`} className="btn-accent" style={{ fontSize: '0.75rem' }}>
                  Revise Terms
                </Link>
              )}
            </div>

            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">Principal</span>
                <span className="detail-value detail-value-lg">{formatAmount(loan.principalAmount || 0)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Interest Rate</span>
                <span className="detail-value detail-value-lg">{loan.interestRate}%<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9CA3AF' }}>/mo</span></span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Tenure</span>
                <span className="detail-value detail-value-lg">{loan.durationInMonths}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9CA3AF' }}> mo</span></span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Interest Type</span>
                <span className="detail-value">{loan.interestType}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Total Interest</span>
                <span className="detail-value">{formatAmount(loan.totalInterest || 0)}</span>
              </div>
              {loan.installmentAmount && (
                <div className="detail-field">
                  <span className="detail-label">Expected Installment</span>
                  <span className="detail-value">{formatAmount(loan.installmentAmount)} /mo</span>
                </div>
              )}
              <div className="detail-field">
                <span className="detail-label">Loan Type</span>
                <span className="detail-value">{loan.loanType || '—'}</span>
              </div>
              {loan.startDate && (
                <div className="detail-field">
                  <span className="detail-label">Disbursed</span>
                  <span className="detail-value">{new Date(loan.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {loan.dueDate && (
                <div className="detail-field">
                  <span className="detail-label">Due Date</span>
                  <span className="detail-value">{new Date(loan.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            {/* Risk & Security */}
            {(loan.securities || loan.guarantorName || loan.documentUrl) && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #F3F4F6' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} className="text-gray-500" /> Risk Mitigation & Security
                </h3>

                {loan.securities && (
                  <div style={{ marginBottom: '1rem' }}>
                    <span className="detail-label">Securities / Collateral</span>
                    <p style={{ fontSize: '0.8125rem', color: '#374151', marginTop: '0.25rem', backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                      {loan.securities}
                    </p>
                  </div>
                )}

                {loan.guarantorName && (
                  <div>
                    <span className="detail-label">Guarantor Information</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '0.25rem', backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.6875rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#111827' }}>{loan.guarantorName}</span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.6875rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#111827' }}>{loan.guarantorPhone || '—'}</span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.6875rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#111827' }}>{loan.guarantorId || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {loan.documentUrl && (
                  <div style={{ marginTop: '1rem' }}>
                    <span className="detail-label">Attached Physical Document</span>
                    <a
                      href={loan.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-2 w-fit px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-12 font-medium text-primary"
                    >
                      <FileText className="size-4" />
                      View Uploaded Document
                      <ArrowUpRight className="size-3 opacity-70" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            <div className="progress-wrap">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="detail-label">Amortization Progress</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: progressPercent >= 100 ? '#047857' : '#111113', fontVariantNumeric: 'tabular-nums' }}>
                  {progressPercent.toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar-track">
                <div
                  className={cn('progress-bar-fill', progressPercent >= 100 ? 'progress-bar-fill-success' : '')}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                  Collected: {formatAmount(totalPaid)}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9CA3AF', fontVariantNumeric: 'tabular-nums' }}>
                  Target: {formatAmount(loan.totalPayable)}
                </span>
              </div>
            </div>

            {/* Approve/Deny note — actual server forms rendered in the page's right column */}
            {loan.status === 'Pending' && (
              <div style={{ padding: '1rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.625rem', marginTop: '1.5rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400E' }}>⚡ Pending approval — use the Actions panel to approve or decline.</p>
              </div>
            )}
          </div>

          {/* Repayment History */}
          <div>
            <h2 className="section-heading">Repayment History</h2>
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table" style={{ minWidth: '600px' }}>
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '25%' }} />
                  </colgroup>
                  <thead>
                    <tr className="data-table-head-row">
                      <th className="data-th text-left">Date</th>
                      <th className="data-th text-right">Amount</th>
                      <th className="data-th text-left">Channel</th>
                      <th className="data-th text-left">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repayments.map((rep) => (
                      <tr key={rep.$id} className="data-table-row">
                        <td className="data-td" style={{ fontSize: '0.8125rem', color: '#6B7280', fontWeight: 500 }}>
                          {new Date(rep.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, color: '#047857', fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}>
                          +{formatAmount(rep.amount || 0)}
                        </td>
                        <td className="data-td">
                          <span className="badge" style={{ background: '#F3F4F6', color: '#374151', border: 'none', fontSize: '0.6875rem' }}>
                            {rep.paymentMethod}
                          </span>
                        </td>
                        <td className="data-td" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: '#9CA3AF' }}>
                          {rep.referenceId || '—'}
                        </td>
                      </tr>
                    ))}
                    {repayments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="data-empty-cell">
                          <div className="data-empty">
                            <DollarSign size={28} style={{ color: '#D1D5DB', marginBottom: '0.5rem' }} />
                            <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontWeight: 500 }}>No repayments recorded</p>
                            <p style={{ fontSize: '0.75rem', color: '#D1D5DB' }}>Submitted repayments will appear here.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Penalty History */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="section-heading" style={{ marginBottom: 0 }}>Penalty History</h2>
              {totalPenalties > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.375rem', padding: '0.125rem 0.5rem' }}>
                  {formatAmount(totalPenalties)} active
                </span>
              )}
            </div>
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table" style={{ minWidth: '760px' }}>
                  <colgroup>
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead>
                    <tr className="data-table-head-row">
                      <th className="data-th text-left">Date</th>
                      <th className="data-th text-left">Type</th>
                      <th className="data-th text-right">Amount</th>
                      <th className="data-th text-left">Reason</th>
                      <th className="data-th text-left">Status</th>
                      <th className="data-th text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {penalties.map((pen) => (
                      <tr key={pen.$id} className="data-table-row" style={{ opacity: pen.status === 'Reversed' ? 0.5 : 1 }}>
                        <td className="data-td" style={{ fontSize: '0.8125rem', color: '#6B7280', fontWeight: 500 }}>
                          {new Date(pen.dateApplied).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="data-td" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                          {pen.penaltyType}
                        </td>
                        <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, color: '#B91C1C', fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}>
                          +{formatAmount(pen.amount)}
                        </td>
                        <td className="data-td" style={{ fontSize: '0.8125rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pen.comment || '—'}
                        </td>
                        <td className="data-td">
                          <span className={cn('badge', pen.status === 'Active' ? 'badge-error' : 'badge-pending')}>
                            {pen.status}
                          </span>
                        </td>
                        <td className="data-td" style={{ textAlign: 'right' }}>
                          {pen.status === 'Active' && isActionable && (
                            <button
                              className="btn-secondary row-action-btn"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                              onClick={() => handleReversepenalty(pen.$id)}
                              disabled={reversingId === pen.$id}
                              title="Reverse penalty"
                            >
                              {reversingId === pen.$id ? '...' : <RotateCcw size={12} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {penalties.length === 0 && (
                      <tr>
                        <td colSpan={6} className="data-empty-cell">
                          <div className="data-empty">
                            <CheckCircle size={28} style={{ color: '#D1D5DB', marginBottom: '0.5rem' }} />
                            <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontWeight: 500 }}>No penalties applied</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Audit Timeline — collapsible */}
          {auditLogs.length > 0 && (
            <div className="card-premium">
              <div
                className="collapsible-header"
                onClick={() => setAuditOpen(!auditOpen)}
                style={{ padding: 0 }}
              >
                <h2 className="section-heading" style={{ marginBottom: 0 }}>
                  Audit Trail <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9CA3AF', marginLeft: '0.375rem' }}>({auditLogs.length} events)</span>
                </h2>
                <ChevronDown className={cn('collapsible-chevron', auditOpen ? 'collapsible-chevron-open' : '')} />
              </div>

              {auditOpen && (
                <div className="timeline" style={{ marginTop: '1.25rem' }}>
                  {auditLogs.map((log) => {
                    const dot = AUDIT_DOT_MAP[log.action] || AUDIT_DOT_MAP.LOAN_UPDATED;
                    return (
                      <div key={log.$id} className="timeline-item">
                        <div className={cn('timeline-dot', dot.className)}>{dot.symbol}</div>
                        <div className="timeline-content">
                          <p className="timeline-action">{humanizeAction(log.action)}</p>
                          <p className="timeline-desc">{log.description}</p>
                          <p className="timeline-meta">
                            By {log.performedBy} · {new Date(log.timestamp).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showRepayment && (
        <RepaymentModal
          loanId={loan.$id}
          maxAmount={loan.balance}
          onClose={() => setShowRepayment(false)}
        />
      )}
      {showPenalty && (
        <PenaltyModal
          loanId={loan.$id}
          clientId={loan.clientId}
          loanBalance={loan.balance}
          currentUser={currentUser}
          onClose={() => setShowPenalty(false)}
        />
      )}

      {/* Floating Action Panel — exported as JSX elements for the server page to embed */}
      {/* Note: The action panel is rendered here as a portal-less div since the server
          page will position it in the right column via the exported ActionPanel component. */}
      <div id="__loan-action-panel-anchor" style={{ display: 'none' }} />
    </>
  );
}

/* ─── Standalone Action Panel component for the right column ─── */
interface ActionPanelProps {
  loan: Loan & { $id: string };
  client: LMSClient;
  currentUser: User;
  repayments: Repayment[];
  penalties: Penalty[];
}

export function ActionPanel({ loan, client, currentUser }: ActionPanelProps) {
  const [showRepayment, setShowRepayment] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const isActionable = loan.status === 'Active' || loan.status === 'Overdue';

  return (
    <>
      {/* Actions Card */}
      <div className="info-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span className="section-heading" style={{ marginBottom: 0, fontSize: '0.875rem' }}>Actions</span>
          <span className={cn('badge', {
            'badge-success': loan.status === 'Active',
            'badge-pending': loan.status === 'Pending',
            'badge-error': loan.status === 'Overdue' || loan.status === 'Denied' || loan.status === 'Defaulted',
            'badge-completed': loan.status === 'Completed',
          })}>
            {loan.status}
          </span>
        </div>
        <div className="action-btn-row">
          {isActionable && (
            <>
              <button
                className="action-btn action-btn-primary"
                onClick={() => setShowRepayment(true)}
              >
                <DollarSign size={15} />
                Log Repayment
              </button>
              <button
                className="action-btn action-btn-danger-soft"
                onClick={() => currentUser && setShowPenalty(true)}
                disabled={!currentUser}
                title={!currentUser ? 'Session unavailable — please refresh the page' : undefined}
                style={{ opacity: currentUser ? 1 : 0.5, cursor: currentUser ? 'pointer' : 'not-allowed' }}
              >
                <AlertTriangle size={15} />
                Apply Penalty
              </button>
            </>
          )}
          <Link
            href={`/loans/${loan.$id}/statement`}
            className="action-btn action-btn-outline"
            style={{ display: 'flex' }}
          >
            <FileText size={15} />
            View Statement
          </Link>
          <Link
            href={`/loans/${loan.$id}/edit`}
            className="action-btn action-btn-outline"
            style={{ display: 'flex' }}
          >
            <ArrowUpRight size={15} />
            Edit Loan
          </Link>
        </div>
      </div>

      {/* Client Info Card */}
      <div className="info-card">
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
          Borrower
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.875rem', borderBottom: '1px solid #F3F4F6' }}>
          <div className="client-avatar" style={{ width: '2.5rem', height: '2.5rem', fontSize: '0.875rem' }}>
            {client?.firstName?.[0] || '?'}
          </div>
          <div>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111113', letterSpacing: '-0.01em' }}>
              {client?.firstName} {client?.lastName}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 500 }}>Borrower</p>
          </div>
        </div>

        {[
          { label: 'Email', value: client?.email || '—' },
          { label: 'Phone', value: client?.phone || '—' },
          { label: 'National ID', value: client?.nationalId || '—' },
          { label: 'Total Borrowed', value: client?.totalBorrowed ? `KES ${client.totalBorrowed.toLocaleString()}` : '—' },
        ].map((row) => (
          <div key={row.label} className="info-card-row">
            <span className="info-key">{row.label}</span>
            <span className="info-value">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showRepayment && (
        <RepaymentModal
          loanId={loan.$id}
          maxAmount={loan.balance}
          onClose={() => setShowRepayment(false)}
        />
      )}
      {showPenalty && currentUser && (
        <PenaltyModal
          loanId={loan.$id}
          clientId={loan.clientId}
          loanBalance={loan.balance}
          currentUser={currentUser}
          onClose={() => setShowPenalty(false)}
        />
      )}
    </>
  );
}
