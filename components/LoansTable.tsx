'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, CreditCard, Filter } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Loan {
  $id: string;
  clientName: string;
  clientId: string;
  loanType: string;
  principalAmount: number;
  status: string;
}

const STATUS_FILTERS = ['All', 'Active', 'Pending', 'Overdue', 'Completed', 'Defaulted', 'Denied'] as const;

export default function LoansTable({ loans }: { loans: Loan[] }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filtered = useMemo(() => {
    return loans.filter((loan) => {
      const matchesStatus = statusFilter === 'All' || loan.status === statusFilter;
      if (!query.trim()) return matchesStatus;
      const q = query.toLowerCase();
      const matchesQuery =
        loan.clientName?.toLowerCase().includes(q) ||
        loan.loanType?.toLowerCase().includes(q) ||
        loan.$id?.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [loans, query, statusFilter]);

  return (
    <div className="flex flex-col gap-5 mt-6">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <h2 className="text-18 font-semibold text-gray-900 tracking-tight">
          All Originations
          <span className="ml-2 text-14 font-normal text-gray-400">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status filter pills */}
          <div className="status-filter-group">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn('status-filter-pill', s === statusFilter && 'status-filter-pill-active')}
              >
                {s}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search loans..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="search-clear"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="data-table-wrap">
        <div className="data-table-scroll">
          <table className="data-table">
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr className="data-table-head-row">
                <th className="data-th text-left">Loan ID</th>
                <th className="data-th text-left">Client</th>
                <th className="data-th text-left">Type</th>
                <th className="data-th text-right">Principal</th>
                <th className="data-th text-left">Status</th>
                <th className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((loan) => (
                <tr key={loan.$id} className="data-table-row">
                  <td className="data-td">
                    <span className="mono-pill">{loan.$id.slice(-8).toUpperCase()}</span>
                  </td>
                  <td className="data-td">
                    <span className="client-name">{loan.clientName || loan.clientId}</span>
                  </td>
                  <td className="data-td">
                    <span className="text-14 text-gray-600 font-medium">{loan.loanType}</span>
                  </td>
                  <td className="data-td text-right">
                    <span className="amount-text">{formatAmount(loan.principalAmount || 0)}</span>
                  </td>
                  <td className="data-td">
                    <span className={cn('badge', {
                      'badge-success': loan.status === 'Active',
                      'badge-pending': loan.status === 'Pending',
                      'badge-error': loan.status === 'Overdue' || loan.status === 'Denied' || loan.status === 'Defaulted',
                      'badge-completed': loan.status === 'Completed',
                    })}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="data-td text-right">
                    <Link href={`/loans/${loan.$id}`} className="btn-secondary">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="data-empty-cell">
                    <div className="data-empty">
                      <CreditCard className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">
                        {query || statusFilter !== 'All' ? 'No loans match your filters' : 'No originations found'}
                      </p>
                      <p className="text-12 text-gray-400">
                        {query || statusFilter !== 'All' ? 'Try adjusting your search or status filter.' : 'Originated loans will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
