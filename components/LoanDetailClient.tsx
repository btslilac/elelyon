'use client';

import { useState } from 'react';
import { reversePenalty } from '@/lib/actions/penalty.actions';
import { formatAmount, cn } from '@/lib/utils';
import RepaymentModal from './RepaymentModal';
import PenaltyModal from './PenaltyModal';
import RestructureModal from './RestructureModal';
import RolloverModal from './RolloverModal';
import WriteOffModal from './WriteOffModal';
import WaiveModal from './WaiveModal';
import InstallmentsTable from './InstallmentsTable';
import {
  DollarSign, AlertTriangle, FileText, ChevronDown,
  CheckCircle, RotateCcw, ArrowUpRight, ShieldCheck,
  RefreshCw, FastForward, Ban, Calendar, LayoutList,
  ArrowDownUp, ChevronRight, Layers, BadgeAlert, Percent,
} from 'lucide-react';
import Link from 'next/link';

// ─── Audit dot config ─────────────────────────────────────────────────────────
interface AuditDot { action: AuditAction; className: string; symbol: string; }
const AUDIT_DOT_MAP: Record<string, AuditDot> = {
  REPAYMENT_CREATED:  { action: 'REPAYMENT_CREATED',  className: 'timeline-dot-repayment', symbol: '↓' },
  REPAYMENT_REVERSED: { action: 'REPAYMENT_REVERSED', className: 'timeline-dot-penalty',   symbol: '↺' },
  PENALTY_ADDED:      { action: 'PENALTY_ADDED',      className: 'timeline-dot-penalty',   symbol: '!' },
  PENALTY_REVERSED:   { action: 'PENALTY_REVERSED',   className: 'timeline-dot-system',    symbol: '↺' },
  LOAN_APPROVED:      { action: 'LOAN_APPROVED',      className: 'timeline-dot-loan',      symbol: '✓' },
  LOAN_DENIED:        { action: 'LOAN_DENIED',        className: 'timeline-dot-penalty',   symbol: '✗' },
  LOAN_UPDATED:       { action: 'LOAN_UPDATED',       className: 'timeline-dot-system',    symbol: '✎' },
  STATUS_CHANGED:     { action: 'STATUS_CHANGED',     className: 'timeline-dot-loan',      symbol: '⇄' },
  STATEMENT_GENERATED:{ action: 'STATEMENT_GENERATED',className: 'timeline-dot-system',    symbol: '⬇' },
};
function humanizeAction(a: string) {
  return a.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Transaction type styling ─────────────────────────────────────────────────
const TX_TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  'Repayment':             { bg: '#ECFDF5', color: '#047857', label: 'Repayment' },
  'Disbursement':          { bg: '#EFF6FF', color: '#1D4ED8', label: 'Disbursement' },
  'Manual Penalty':        { bg: '#FEF2F2', color: '#B91C1C', label: 'Penalty' },
  'Restructure Adjustment':{ bg: '#F5F3FF', color: '#7C3AED', label: 'Restructure' },
  'Waiver':                { bg: '#FEF3C7', color: '#D97706', label: 'Waiver' },
};

// ─── Lifecycle badge ──────────────────────────────────────────────────────────
function LifecycleBadge({ state }: { state?: string }) {
  if (!state || state === 'Standard') return null;
  const cfg: Record<string, { bg: string; color: string; border: string }> = {
    Restructured: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    Rollover:     { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  };
  const style = cfg[state] ?? cfg.Restructured;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem',
      borderRadius: '0.375rem', border: `1px solid ${style.border}`,
      background: style.bg, color: style.color, letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      <Layers size={9} />
      {state}
    </span>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ id, label, active, count, icon, onClick }: {
  id: string; label: string; active: boolean;
  count?: number; icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.375rem',
        padding: '0.625rem 1rem',
        fontSize: '0.8125rem', fontWeight: active ? 700 : 500,
        color: active ? '#111113' : '#6B7280',
        borderBottom: active ? '2px solid #111113' : '2px solid transparent',
        background: 'transparent', border: 'none',
        borderBottomWidth: '2px',
        borderBottomStyle: 'solid',
        borderBottomColor: active ? '#111113' : 'transparent',
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s',
      }}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span style={{
          marginLeft: '0.125rem',
          fontSize: '0.625rem', fontWeight: 700,
          padding: '0.0625rem 0.375rem',
          background: active ? '#111113' : '#E5E7EB',
          color: active ? '#FFF' : '#6B7280',
          borderRadius: '1rem', transition: 'all 0.15s',
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main component props ─────────────────────────────────────────────────────
interface Props {
  loan: Loan & { $id: string; lifecycleState?: string; daysPastDue?: number; remainingPrincipal?: number; remainingInterest?: number; remainingPenalties?: number; remainingFees?: number };
  client: LMSClient;
  repayments: Repayment[];
  penalties: Penalty[];
  auditLogs: AuditLog[];
  currentUser: User;
  totalPaid: number;
  progressPercent: number;
  installments: LoanInstallment[];
  transactions: LoanTransaction[];
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function LoanDetailClient({
  loan, client, repayments, penalties, auditLogs,
  currentUser, totalPaid, progressPercent,
  installments, transactions,
}: Props) {
  const [activeTab, setActiveTab] = useState<'installments' | 'transactions' | 'penalties' | 'audit'>('installments');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);

  const isActionable = ['Active', 'Overdue', 'Loss'].includes(loan.status);
  const activePenalties = penalties.filter(p => p.status === 'Active');
  const totalPenaltiesAmt = activePenalties.reduce((s, p) => s + p.amount, 0);
  const dpd = (loan as any).daysPastDue ?? 0;
  const lifecycleState = (loan as any).lifecycleState;
  const remPrincipal = (loan as any).remainingPrincipal ?? 0;
  const remInterest = (loan as any).remainingInterest ?? 0;
  const remPenalties = (loan as any).remainingPenalties ?? 0;
  const remFees = (loan as any).remainingFees ?? 0;

  const handleReversePenalty = async (penaltyId: string) => {
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
      {/* ── KPI Strip ── */}
      <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
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
          <span className="kpi-label">Penalties</span>
          <span className={cn('kpi-value', (remPenalties ?? loan.penaltyAccrued ?? 0) > 0 ? 'kpi-value-warning' : '')}>
            {formatAmount(remPenalties ?? loan.penaltyAccrued ?? 0)}
          </span>
          <span className="kpi-sub">{activePenalties.length} active</span>
        </div>
        {dpd > 0 && (
          <div className="kpi-card" style={{ borderColor: '#FECACA' }}>
            <span className="kpi-label" style={{ color: '#B91C1C' }}>Days Past Due</span>
            <span className="kpi-value" style={{ color: dpd >= 90 ? '#7F1D1D' : '#B91C1C' }}>{dpd}</span>
            <span className="kpi-sub" style={{ color: '#EF4444' }}>{dpd >= 90 ? 'Loss classification' : dpd >= 30 ? 'Substandard' : 'Overdue'}</span>
          </div>
        )}
      </div>

      {/* ── Balance Breakdown ── */}
      {(remPrincipal > 0 || remInterest > 0 || remPenalties > 0 || remFees > 0) && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.625rem', marginBottom: '1.25rem',
        }}>
          {[
            { label: 'Remaining Principal', value: remPrincipal, color: '#1D4ED8' },
            { label: 'Remaining Interest',  value: remInterest,  color: '#D97706' },
            { label: 'Remaining Penalties', value: remPenalties, color: '#DC2626' },
            { label: 'Remaining Fees',      value: remFees,      color: '#7C3AED' },
          ].filter(r => r.value > 0).map(row => (
            <div key={row.label} style={{
              padding: '0.625rem 0.875rem',
              background: '#FAFAFA', border: '1px solid #F3F4F6', borderRadius: '0.625rem',
              borderLeft: `3px solid ${row.color}`,
            }}>
              <span style={{ display: 'block', fontSize: '0.625rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                {row.label}
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: row.color, fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main 2-col layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }} className="loan-detail-grid">

          {/* LEFT: Financial Terms */}
          <div className="card-premium" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#111113', borderRadius: '0.875rem 0.875rem 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <h2 className="section-heading" style={{ marginBottom: 0 }}>Financial Terms</h2>
                <LifecycleBadge state={lifecycleState} />
              </div>
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
              {['Written Off', 'Loss'].includes(loan.status) && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#FEF2F2', borderRadius: '0.375rem', border: '1px solid #FECACA' }}>
                  <p style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, textAlign: 'center' }}>This loan was marked as a credit loss. The remaining balance has been written off.</p>
                </div>
              )}
            </div>

            {loan.status === 'Pending' && (
              <div style={{ padding: '1rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.625rem', marginTop: '1.5rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400E' }}>⚡ Pending approval — use the Actions panel to approve or decline.</p>
              </div>
            )}
          </div>

          {/* ── Tabbed Data Section ── */}
          <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Tab nav */}
            <div style={{
              display: 'flex', borderBottom: '1px solid #F3F4F6',
              overflowX: 'auto', padding: '0 1.25rem',
              scrollbarWidth: 'none',
            }}>
              <Tab
                id="tab-installments"
                label="Installments"
                active={activeTab === 'installments'}
                count={installments.length}
                icon={<Calendar size={13} />}
                onClick={() => setActiveTab('installments')}
              />
              <Tab
                id="tab-transactions"
                label="Transactions"
                active={activeTab === 'transactions'}
                count={transactions.length}
                icon={<ArrowDownUp size={13} />}
                onClick={() => setActiveTab('transactions')}
              />
              <Tab
                id="tab-penalties"
                label="Penalties"
                active={activeTab === 'penalties'}
                count={penalties.length}
                icon={<BadgeAlert size={13} />}
                onClick={() => setActiveTab('penalties')}
              />
              <Tab
                id="tab-audit"
                label="Audit Trail"
                active={activeTab === 'audit'}
                count={auditLogs.length}
                icon={<LayoutList size={13} />}
                onClick={() => setActiveTab('audit')}
              />
            </div>

            <div style={{ padding: '1.25rem' }}>

              {/* ── Installments Tab ── */}
              {activeTab === 'installments' && (
                <InstallmentsTable installments={installments} />
              )}

              {/* ── Transactions Tab ── */}
              {activeTab === 'transactions' && (
                <div>
                  {transactions.length === 0 ? (
                    <div className="data-empty" style={{ padding: '3rem' }}>
                      <DollarSign size={32} style={{ color: '#D1D5DB', marginBottom: '0.75rem' }} />
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6B7280' }}>No transactions recorded</p>
                      <p style={{ fontSize: '0.8125rem', color: '#D1D5DB', marginTop: '0.25rem' }}>Repayments and penalties will appear here.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="data-table-wrap">
                        <div className="data-table-scroll">
                          <table className="data-table" style={{ minWidth: '680px' }}>
                            <colgroup>
                              <col style={{ width: '16%' }} />
                              <col style={{ width: '14%' }} />
                              <col style={{ width: '18%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '18%' }} />
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '4%' }} />
                            </colgroup>
                            <thead>
                              <tr className="data-table-head-row">
                                <th className="data-th text-left">Date</th>
                                <th className="data-th text-left">Type</th>
                                <th className="data-th text-right">Amount</th>
                                <th className="data-th text-left">Method / Note</th>
                                <th className="data-th text-left">Reference</th>
                                <th className="data-th text-left">Status</th>
                                <th className="data-th" />
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((tx) => {
                                const typeStyle = TX_TYPE_STYLE[tx.type] ?? TX_TYPE_STYLE['Repayment'];
                                const isExpanded = expandedTx === tx.$id;
                                const hasAllocation = (tx.type === 'Repayment' || tx.type === 'Waiver') && (
                                  tx.allocatedFees + tx.allocatedPenalties + tx.allocatedOverdueInterest +
                                  tx.allocatedCurrentInterest + tx.allocatedOverduePrincipal +
                                  tx.allocatedCurrentPrincipal + tx.allocatedToWallet
                                ) > 0;

                                return (
                                  <>
                                    <tr
                                      key={tx.$id}
                                      className="data-table-row"
                                      style={{ cursor: hasAllocation ? 'pointer' : 'default', opacity: tx.status === 'Reversed' ? 0.5 : 1 }}
                                      onClick={() => hasAllocation && setExpandedTx(isExpanded ? null : tx.$id)}
                                    >
                                      <td className="data-td" style={{ fontSize: '0.8125rem', color: '#6B7280', fontWeight: 500 }}>
                                        {new Date(tx.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </td>
                                      <td className="data-td">
                                        <span style={{
                                          display: 'inline-block', fontSize: '0.6875rem', fontWeight: 700,
                                          padding: '0.125rem 0.5rem', borderRadius: '0.375rem',
                                          background: typeStyle.bg, color: typeStyle.color,
                                        }}>
                                          {typeStyle.label}
                                        </span>
                                      </td>
                                      <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, color: tx.type === 'Manual Penalty' ? '#B91C1C' : '#047857', fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}>
                                        {tx.type === 'Manual Penalty' ? '+' : ''}{formatAmount(tx.amount)}
                                      </td>
                                      <td className="data-td" style={{ fontSize: '0.8125rem', color: '#374151' }}>
                                        {tx.paymentMethod || tx.comment || '—'}
                                      </td>
                                      <td className="data-td" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: '#9CA3AF' }}>
                                        {tx.referenceId || '—'}
                                      </td>
                                      <td className="data-td">
                                        <span className={cn('badge', tx.status === 'Active' ? 'badge-success' : 'badge-pending')} style={{ fontSize: '0.6875rem' }}>
                                          {tx.status}
                                        </span>
                                      </td>
                                      <td className="data-td" style={{ textAlign: 'center' }}>
                                        {hasAllocation && (
                                          <ChevronRight size={14} style={{
                                            color: '#9CA3AF',
                                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s',
                                          }} />
                                        )}
                                      </td>
                                    </tr>

                                    {/* Allocation Detail Row */}
                                    {isExpanded && hasAllocation && (
                                      <tr key={`${tx.$id}-alloc`}>
                                        <td colSpan={7} style={{ padding: 0, background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                                          <div style={{ padding: '0.875rem 1.5rem' }}>
                                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
                                              {tx.type === 'Waiver' ? 'Waiver Allocation Breakdown' : 'Payment Allocation Breakdown'}
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                              {[
                                                { label: 'Fees', value: tx.allocatedFees, color: '#7C3AED' },
                                                { label: 'Penalties', value: tx.allocatedPenalties, color: '#B91C1C' },
                                                { label: 'Overdue Interest', value: tx.allocatedOverdueInterest, color: '#D97706' },
                                                { label: 'Current Interest', value: tx.allocatedCurrentInterest, color: '#D97706' },
                                                { label: 'Overdue Principal', value: tx.allocatedOverduePrincipal, color: '#1D4ED8' },
                                                { label: 'Current Principal', value: tx.allocatedCurrentPrincipal, color: '#1D4ED8' },
                                                { label: 'Wallet Buffer', value: tx.allocatedToWallet, color: '#6B7280' },
                                              ].filter(a => a.value > 0).map(alloc => (
                                                <div key={alloc.label} style={{
                                                  padding: '0.375rem 0.75rem',
                                                  background: '#FFF', border: `1px solid ${alloc.color}30`,
                                                  borderLeft: `3px solid ${alloc.color}`,
                                                  borderRadius: '0.375rem',
                                                }}>
                                                  <span style={{ display: 'block', fontSize: '0.625rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{alloc.label}</span>
                                                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: alloc.color, fontVariantNumeric: 'tabular-nums' }}>{formatAmount(alloc.value)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Penalties Tab ── */}
              {activeTab === 'penalties' && (
                <div>
                  {totalPenaltiesAmt > 0 && (
                    <div style={{
                      marginBottom: '1rem', padding: '0.625rem 0.875rem',
                      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.625rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#991B1B' }}>Active Penalties</span>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#B91C1C', fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(totalPenaltiesAmt)}
                      </span>
                    </div>
                  )}
                  <div className="data-table-wrap">
                    <div className="data-table-scroll">
                      <table className="data-table" style={{ minWidth: '760px' }}>
                        <colgroup>
                          <col style={{ width: '14%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '18%' }} />
                          <col style={{ width: '26%' }} />
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
                                    onClick={() => handleReversePenalty(pen.$id)}
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
              )}

              {/* ── Audit Tab ── */}
              {activeTab === 'audit' && (
                <div>
                  {auditLogs.length === 0 ? (
                    <div className="data-empty" style={{ padding: '3rem' }}>
                      <LayoutList size={28} style={{ color: '#D1D5DB', marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontWeight: 500 }}>No audit events recorded</p>
                    </div>
                  ) : (
                    <div className="timeline">
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
        </div>
      </div>

      {/* No modals here — all modals live in ActionPanel to avoid duplication */}
    </>
  );
}

// ─── Standalone Action Panel ──────────────────────────────────────────────────
interface ActionPanelProps {
  loan: Loan & { $id: string; lifecycleState?: string; daysPastDue?: number };
  client: LMSClient;
  currentUser: User;
  repayments: Repayment[];
  penalties: Penalty[];
  installments?: LoanInstallment[];
  transactions?: LoanTransaction[];
}

export function ActionPanel({ loan, client, currentUser }: ActionPanelProps) {
  const [showRepayment, setShowRepayment] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showRestructure, setShowRestructure] = useState(false);
  const [showRollover, setShowRollover] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [showWaive, setShowWaive] = useState(false);

  const lifecycleState = (loan as any).lifecycleState;

  const canRepay     = ['Active', 'Overdue', 'Loss'].includes(loan.status);
  const canPenalise  = canRepay;
  const canLifecycle = canRepay;
  const canRenew     = loan.status === 'Fully Paid';
  const canWriteOff  = ['Active', 'Overdue', 'Loss'].includes(loan.status) && currentUser?.role === 'ADMIN';
  const canWaive     = ['Active', 'Overdue', 'Loss'].includes(loan.status) && ['ADMIN', 'MANAGER'].includes(currentUser?.role || '');

  return (
    <>
      {/* ── Payment Actions ── */}
      <div className="info-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span className="section-heading" style={{ marginBottom: 0, fontSize: '0.875rem' }}>Actions</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span className={cn('badge', {
              'badge-success':   loan.status === 'Active',
              'badge-pending':   loan.status === 'Pending',
              'badge-error':     ['Overdue', 'Denied', 'Written Off', 'Loss'].includes(loan.status),
              'badge-completed': loan.status === 'Fully Paid',
            })}>
              {loan.status}
            </span>
            <LifecycleBadge state={lifecycleState} />
          </div>
        </div>
        <div className="action-btn-row">
          {canRepay && (
            <button
              id="btn-log-repayment"
              className="action-btn action-btn-primary"
              onClick={() => setShowRepayment(true)}
              title="Log a repayment against this loan"
            >
              <DollarSign size={15} />
              Log Repayment
            </button>
          )}
          {canPenalise && (
            <button
              id="btn-apply-penalty"
              className="action-btn action-btn-danger-soft"
              onClick={() => currentUser && setShowPenalty(true)}
              disabled={!currentUser}
              title={!currentUser ? 'Session unavailable — please refresh' : 'Apply a manual penalty to this loan'}
              style={{ opacity: currentUser ? 1 : 0.5, cursor: currentUser ? 'pointer' : 'not-allowed' }}
            >
              <AlertTriangle size={15} />
              Apply Penalty
            </button>
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

      {/* ── Lifecycle Operations ── */}
      {(canLifecycle || canRenew) && (
        <div className="info-card" style={{ borderLeft: '3px solid #7C3AED' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
            Lifecycle Operations
          </p>
          <div className="action-btn-row">
            {canLifecycle && (
              <button
                id="btn-restructure-loan"
                className="action-btn action-btn-outline"
                onClick={() => setShowRestructure(true)}
                title="Restructure this loan — change principal, rate, or tenure"
                style={{ borderColor: '#2563EB', color: '#2563EB' }}
              >
                <RefreshCw size={15} />
                Restructure
              </button>
            )}
            {canLifecycle && (
              <button
                id="btn-rollover-loan"
                className="action-btn action-btn-outline"
                onClick={() => setShowRollover(true)}
                title="Rollover this loan — extend the tenure and apply a rollover fee"
                style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
              >
                <FastForward size={15} />
                Rollover
              </button>
            )}
            {canRenew && (
              <Link
                id="btn-renew-loan"
                href={`/loans/create?renewFrom=${loan.$id}`}
                className="action-btn action-btn-primary"
                style={{ display: 'flex' }}
                title="Create a new loan with the same terms for this borrower"
              >
                <RefreshCw size={15} />
                Renew Loan
              </Link>
            )}
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '0.75rem', lineHeight: 1.5 }}>
            {canLifecycle && 'Restructure alters the loan terms. Rollover extends the tenure with a fee. '}
            {canRenew && 'Renewal creates a brand-new loan pre-filled with these terms.'}
          </p>
        </div>
      )}

      {/* ── Credit Administration (ADMIN and MANAGER only) ── */}
      {(canWriteOff || canWaive) && (
        <div className="info-card" style={{ borderLeft: '3px solid #DC2626' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
            Credit Administration
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {canWaive && (
              <button
                id="btn-waive-balance"
                className="action-btn"
                onClick={() => setShowWaive(true)}
                title="Waive loan balance (Principal, Interest, or Penalty)"
                style={{ width: '100%', justifyContent: 'center', background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}
              >
                <Percent size={15} />
                Waive Balance
              </button>
            )}
            {canWriteOff && (
              <button
                id="btn-write-off-loan"
                className="action-btn"
                onClick={() => setShowWriteOff(true)}
                title="Write off this loan — marks the balance as a credit loss (irreversible)"
                style={{ width: '100%', justifyContent: 'center', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                <Ban size={15} />
                Write Off Loan
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '0.5rem', lineHeight: 1.5 }}>
            {canWaive && "Waiver immediately adjusts outstanding balance. Manager/Admin only."}
            {canWaive && canWriteOff && <br />}
            {canWriteOff && "Write Off is irreversible, stops accrual and marks balance as credit loss. Admin only."}
          </p>
        </div>
      )}

      {/* ── Client Info ── */}
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
          { label: 'Email',         value: client?.email || '—' },
          { label: 'Phone',         value: client?.phone || '—' },
          { label: 'National ID',   value: client?.nationalId || '—' },
          { label: 'Total Borrowed',value: client?.totalBorrowed ? `KES ${client.totalBorrowed.toLocaleString()}` : '—' },
        ].map(row => (
          <div key={row.label} className="info-card-row">
            <span className="info-key">{row.label}</span>
            <span className="info-value">{row.value}</span>
          </div>
        ))}
      </div>

      {/* ── Modals ── */}
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
      {showRestructure && (
        <RestructureModal
          loan={loan}
          onClose={() => setShowRestructure(false)}
        />
      )}
      {showRollover && (
        <RolloverModal
          loan={loan}
          onClose={() => setShowRollover(false)}
        />
      )}
      {showWriteOff && currentUser && (
        <WriteOffModal
          loanId={loan.$id}
          currentUser={currentUser}
          loan={{ balance: loan.balance, principalAmount: loan.principalAmount }}
          onClose={() => setShowWriteOff(false)}
        />
      )}
      {showWaive && currentUser && (
        <WaiveModal
          loanId={loan.$id}
          currentUser={currentUser}
          loan={{
            remainingPrincipal: loan.remainingPrincipal ?? 0,
            remainingInterest: loan.remainingInterest ?? 0,
            remainingPenalties: loan.remainingPenalties ?? 0,
          }}
          onClose={() => setShowWaive(false)}
        />
      )}
    </>
  );
}
