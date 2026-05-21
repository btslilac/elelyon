'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, CreditCard, Filter } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown} from 'lucide-react';
import { Button, buttonVariants} from './ui/button';

interface Loan {
  $id: string;
  clientName: string;
  clientId: string;
  loanType: string;
  principalAmount: number;
  status: string;
}

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableResponsiveGrid,
  TableResponsiveCard,
  TableResponsiveCardHeader,
  TableResponsiveCardContent,
} from '@/components/ui/table';

const STATUS_FILTERS = ['All', 'Active', 'Pending', 'Overdue', 'Completed', 'Defaulted', 'Denied'] as const;

export default function LoansTable({ loans }: { loans: Loan[] }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);


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
          All Loans
          <span className="ml-2 text-14 font-normal text-gray-400">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status filter pills */}
          <div className="status-filter-group">
            {STATUS_FILTERS.map((s) => (
              <Button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn('status-filter-pill', s === statusFilter && 'status-filter-pill-active')}
              >
                {s}
              </Button>
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
              <Button
                onClick={() => setQuery('')}
                className="search-clear"
                aria-label="Clear search"
              >
                ✕
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="data-table-wrap lg:block hidden">
        <div className="data-table-scroll">
          <Table className="data-table">
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="data-table-head-row">
                <TableHead className="data-th text-left">Loan ID</TableHead>
                <TableHead className="data-th text-left">Client</TableHead>
                <TableHead className="data-th text-left">Type</TableHead>
                <TableHead className="data-th text-right">Principal</TableHead>
                <TableHead className="data-th text-left">Status</TableHead>
                <TableHead className="data-th text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((loan) => (
                <TableRow key={loan.$id} className="data-table-row">
                  <TableCell className="data-td">
                    <span className="mono-pill">{loan.$id.slice(-8).toUpperCase()}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <span className="client-name">{loan.clientName || loan.clientId}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <span className="text-14 text-gray-600 font-medium">{loan.loanType}</span>
                  </TableCell>
                  <TableCell className="data-td text-right">
                    <span className="amount-text">{formatAmount(loan.principalAmount || 0)}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <span className={cn('badge', {
                      'badge-success': loan.status === 'Active',
                      'badge-pending': loan.status === 'Pending',
                      'badge-error': loan.status === 'Overdue' || loan.status === 'Denied' || loan.status === 'Defaulted',
                      'badge-completed': loan.status === 'Completed',
                    })}>
                      {loan.status}
                    </span>
                  </TableCell>
                  <TableCell className="data-td text-right">
                    <Link href={`/loans/${loan.$id}`} className="btn-secondary">
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="data-empty-cell">
                    <div className="data-empty">
                      <CreditCard className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">
                        {query || statusFilter !== 'All' ? 'No loans match your filters' : 'No originations found'}
                      </p>
                      <p className="text-12 text-gray-400">
                        {query || statusFilter !== 'All' ? 'Try adjusting your search or status filter.' : 'Originated loans will appear here.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    
    
    {/* Mobile + Tablet Responsive Cards (Visible on md/sm, hidden on lg) */}
      <TableResponsiveGrid
  className="
    lg:hidden
    mt-8
    mb-10
    gap-5
    p-6
  "
>
  {filtered.map((loan: any) => {
    const isOpen = expandedId === loan.$id;

    return (
      <TableResponsiveCard
        key={loan.$id}
        className="
          overflow-hidden
          rounded-3xl
          border border-slate-200/70
          bg-white
          shadow-sm
          transition-all duration-300
          hover:shadow-lg
          hover:shadow-slate-200/50
          p-5
          cursor-pointer
        "
      >
        {/* Header */}
        <TableResponsiveCardHeader
          onClick={() => setExpandedId(isOpen ? null : loan.$id)}
          className="
            p-5
            cursor-pointer
            flex
            items-start
            justify-between
          "
        >
          <div className="flex gap-4 min-w-0">
            
            {/* Avatar */}
            <div
              className="
                flex
                items-center
                justify-center
                shrink-0
                h-12
                w-12
                rounded-full
                bg-gradient-to-br
                from-slate-100
                to-slate-200
                text-slate-700
                font-bold
                shadow-sm
                translate-x-3
                translate-y-[20%]
              "
            >
              {loan.clientName?.[0] || "?"}
            </div>

            {/* Client Info */}
            <div className="min-w-0 translate-x-2 translate-y-[20%]">
              <h3 className="font-semibold text-[15px] text-slate-900 truncate">
                {loan.clientName || "Unknown Client"}
              </h3>

              <p className="text-sm text-slate-500 truncate mt-0.5">
                {loan.clientEmail || "No email provided"}
              </p>

              <div className="mt-3">
                <span
                  className={cn(
                    "badge inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
                    {
                      "bg-green-50 text-green-700":
                        loan.status === "Active",

                      "bg-amber-50 text-amber-700":
                        loan.status === "Pending",

                      "bg-red-50 text-red-700":
                        loan.status === "Overdue" ||
                        loan.status === "Denied" ||
                        loan.status === "Defaulted",

                      "bg-blue-50 text-blue-700":
                        loan.status === "Completed",
                    }
                  )}
                >
                  {loan.status}
                </span>
              </div>
            </div>
          </div>

          {/* Expand Icon */}
          <div
            className="
              shrink-0
              mt-1
              text-slate-400
              transition-transform
              duration-200
              ease-out
              data-[state=open]:rotate-180
              translate-y-1
              -translate-x-3
            "
          >
            {isOpen ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </div>
        </TableResponsiveCardHeader>

        {/* Expandable Content */}
        <TableResponsiveCardContent isOpen={isOpen}>
          <div className="px-5 pb-5">

            {/* Summary Box */}
            <div
              className="
                rounded-2xl
                bg-slate-50
                p-4
                grid
                gap-4
              "
            >
              <div className="flex justify-between items-center scroll-px-2.5">
                <span className="text-sm text-slate-500 translate-x-3 translate-y-1.5">
                  Loan ID
                </span>

                <span
                  className="
                    badge
                    rounded-lg
                    bg-slate-100
                    px-2.5
                    py-1
                    text-xs
                    font-mono
                    border
                    text-slate-700
                    -translate-x-3
                    translate-y-1.5
                  "
                >
                  {loan.$id.slice(-8).toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 translate-x-3 -translate-y-1.5">
                  Principal
                </span>

                <span className="font-bold text-slate-900 -translate-x-3 -translate-y-1.5">
                  {formatAmount(
                    loan.principalAmount || 0
                  )}
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-5">
              <Button
                asChild
                className="
                  w-full
                  h-11
                  rounded-2xl
                  font-semibold
                  bg-slate-900
                  hover:bg-slate-800
                  transition-all
                  active:scale-[0.98]
                "
              >
                <Link href={`/loans/${loan.$id}`}>
                  View Loan Details
                </Link>
              </Button>
            </div>

          </div>
        </TableResponsiveCardContent>
      </TableResponsiveCard>
    );
  })}

  {filtered.length === 0 && (
    <div
      className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-10
        text-center
        shadow-sm
        mx-auto
        mt-10
      "
    >
      <CreditCard className="size-10 mx-auto mb-3 text-slate-300 translate-3" />

      <h3 className="font-semibold text-slate-700">
        No Loans Found
      </h3>

      <p className="text-sm text-slate-400 mt-1">
        Originated loans will appear here
      </p>
      <br/><br/>
      
    </div>
  )}
</TableResponsiveGrid>
    </div>
    
    
  );
}
