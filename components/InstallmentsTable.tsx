'use client';

import { formatAmount, cn } from '@/lib/utils';
import { CalendarDays, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Props {
  installments: LoanInstallment[];
}

function getInstallmentStatus(inst: LoanInstallment) {
  if (inst.isSettled) return 'Paid';
  const now = new Date();
  const due = new Date(inst.dueDate);
  if (due < now) return 'Overdue';
  if (inst.amountPaid > 0) return 'Partial';
  return 'Pending';
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Paid:    { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
    Overdue: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
    Partial: { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' },
    Pending: { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' },
  };
  const icons: Record<string, React.ReactNode> = {
    Paid:    <CheckCircle2 size={10} />,
    Overdue: <AlertCircle size={10} />,
    Partial: <Clock size={10} />,
    Pending: <Clock size={10} />,
  };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem',
      borderRadius: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      ...(styles[status] ?? styles.Pending),
    }}>
      {icons[status]}
      {status}
    </span>
  );
}

export default function InstallmentsTable({ installments }: Props) {
  if (installments.length === 0) {
    return (
      <div className="data-empty" style={{ padding: '3rem 1rem' }}>
        <CalendarDays size={32} style={{ color: '#D1D5DB', marginBottom: '0.75rem' }} />
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6B7280' }}>No installments generated yet</p>
        <p style={{ fontSize: '0.8125rem', color: '#D1D5DB', marginTop: '0.25rem' }}>
          The repayment schedule will appear here once the loan is approved and disbursed.
        </p>
      </div>
    );
  }

  const totals = installments.reduce(
    (acc, inst) => ({
      due: acc.due + inst.amountDue,
      paid: acc.paid + inst.amountPaid,
    }),
    { due: 0, paid: 0 }
  );

  return (
    <div>
      {/* Summary strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem',
      }}>
        {[
          { label: 'Total Installments', value: String(installments.length), color: '#111113' },
          { label: 'Settled', value: String(installments.filter(i => i.isSettled).length), color: '#047857' },
          { label: 'Overdue', value: String(installments.filter(i => getInstallmentStatus(i) === 'Overdue').length), color: '#B91C1C' },
          { label: 'Total Scheduled', value: formatAmount(totals.due), color: '#111113' },
          { label: 'Total Collected', value: formatAmount(totals.paid), color: '#047857' },
          { label: 'Outstanding', value: formatAmount(totals.due - totals.paid), color: '#B91C1C' },
        ].map(card => (
          <div key={card.label} style={{
            padding: '0.75rem 1rem',
            background: '#F9FAFB',
            borderRadius: '0.625rem',
            border: '1px solid #F3F4F6',
          }}>
            <span style={{ display: 'block', fontSize: '0.6875rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              {card.label}
            </span>
            <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 800, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <div className="data-table-scroll">
          <table className="data-table" style={{ minWidth: '820px' }}>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr className="data-table-head-row">
                <th className="data-th text-center">#</th>
                <th className="data-th text-left">Due Date</th>
                <th className="data-th text-right">Principal</th>
                <th className="data-th text-right">Interest</th>
                <th className="data-th text-right">Fees</th>
                <th className="data-th text-right">Penalties</th>
                <th className="data-th text-right">Total Due</th>
                <th className="data-th text-right">Total Paid</th>
                <th className="data-th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => {
                const status = getInstallmentStatus(inst);
                const isOverdue = status === 'Overdue';
                const isPaid = status === 'Paid';
                const remaining = inst.amountDue - inst.amountPaid;

                return (
                  <tr
                    key={inst.$id}
                    className="data-table-row"
                    style={{
                      background: isOverdue ? '#FFF8F8' : isPaid ? '#F0FDF4' : 'transparent',
                      opacity: isPaid ? 0.8 : 1,
                    }}
                  >
                    <td className="data-td" style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8125rem', color: '#9CA3AF' }}>
                      {inst.installmentNumber}
                    </td>
                    <td className="data-td" style={{ fontSize: '0.8125rem', color: isOverdue ? '#B91C1C' : '#374151', fontWeight: isOverdue ? 600 : 500 }}>
                      {new Date(inst.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem', color: '#374151' }}>
                      {formatAmount(inst.principalDue)}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem', color: '#374151' }}>
                      {formatAmount(inst.interestDue)}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem', color: inst.feesDue > 0 ? '#92400E' : '#9CA3AF' }}>
                      {inst.feesDue > 0 ? formatAmount(inst.feesDue) : '—'}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem', color: inst.penaltiesDue > 0 ? '#B91C1C' : '#9CA3AF' }}>
                      {inst.penaltiesDue > 0 ? formatAmount(inst.penaltiesDue) : '—'}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem', color: '#111113' }}>
                      {formatAmount(inst.amountDue)}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem', color: '#047857' }}>
                      {inst.amountPaid > 0 ? formatAmount(inst.amountPaid) : '—'}
                    </td>
                    <td className="data-td" style={{ textAlign: 'center' }}>
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer totals row */}
            <tfoot>
              <tr style={{ background: '#F9FAFB', borderTop: '2px solid #E5E7EB' }}>
                <td colSpan={6} style={{ padding: '0.75rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>
                  Totals
                </td>
                <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right', fontWeight: 800, fontSize: '0.875rem', color: '#111113', fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(totals.due)}
                </td>
                <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right', fontWeight: 800, fontSize: '0.875rem', color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(totals.paid)}
                </td>
                <td style={{ padding: '0.75rem 0.875rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B91C1C', fontVariantNumeric: 'tabular-nums' }}>
                    {formatAmount(totals.due - totals.paid)} left
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
