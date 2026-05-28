'use client'

import { useState } from 'react';
import Link from 'next/link';
import { cn, formatAmount } from '@/lib/utils';
import { ChevronUp, ChevronDown, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface RecentLoansTableProps {
  recentLoans: any[];
}

export default function RecentLoansTable({ recentLoans }: RecentLoansTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="w-full space-y-5">
      {/* Desktop Table (Visible on lg and up) */}
      <div className="data-table-wrap lg:block hidden">
        <div className="data-table-scroll">
          <Table className="data-table">
            <colgroup>
              <col style={{ width: '14%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="data-table-head-row">
                <TableCell className="data-th text-left">Loan ID</TableCell>
                <TableCell className="data-th text-left">Client / Borrower</TableCell>
                <TableCell className="data-th text-right">Principal</TableCell>
                <TableCell className="data-th text-left">Status</TableCell>
                <TableCell className="data-th text-right"></TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLoans.slice(0, 5).map((loan: any) => (
                <tr key={loan.$id} className="data-table-row group">
                  <TableCell className="data-td">
                    <span className="mono-pill">{loan.$id.slice(-8).toUpperCase()}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <div className="flex items-center gap-3">
                      <div className="client-avatar">
                        {loan.clientName?.[0] || '?'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="client-name">{loan.clientName || 'Unknown Client'}</span>
                        <span className="client-email">{loan.clientEmail || 'No email provided'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="data-td text-right">
                    <span className="amount-text">{formatAmount(loan.principalAmount || 0)}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <span className={cn('badge', {
                      'badge-success':   loan.status === 'Active',
                      'badge-pending':   loan.status === 'Pending',
                      'badge-error':     loan.status === 'Overdue' || loan.status === 'Denied' || loan.status === 'Written Off' || loan.status === 'Loss',
                      'badge-completed': loan.status === 'Fully Paid',
                    })}>
                      {loan.status}
                    </span>
                  </TableCell>
                  <TableCell className="data-td text-right">
                    <Link
                      href={`/loans/${loan.$id}`}
                      className="btn-secondary row-action-btn"
                    >
                      View
                    </Link>
                  </TableCell>
                </tr>
              ))}
              {recentLoans.length === 0 && (
                <tr>
                  <TableCell colSpan={5} className="data-empty-cell">
                    <div className="data-empty">
                      <CreditCard className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">No recent Loans</p>
                      <p className="text-12 text-gray-400">Originated loans will appear here.</p>
                    </div>
                  </TableCell>
                </tr>
              )}
            </TableBody>
          </Table>
        </div>
      </div>




      {/* Mobile + Tablet Responsive Cards (Visible on md/sm, hidden on lg) */}
      <TableResponsiveGrid
        className='
        lg:hidden
        p-6
        mt-8
        mb-10
        gap-5'
      >
        {recentLoans.slice(0, 5).map((loan: any) => {
          const isOpen = expandedId === loan.$id;
          return (
            <TableResponsiveCard key={loan.$id}
              className='
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
                      
              
              '
            >
              <TableResponsiveCardHeader
                onClick={() => setExpandedId(isOpen ? null : loan.$id)}
                className='
                   p-5
                   cursor-pointer
                   flex
                   items-start
                   justify-between
                '
              >
                <div className="flex gap-4 min-w-0">
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
                    ">
                    {loan.clientName?.[0] || '?'}
                  </div>
                  {/* Client Info */}
                  <div className="min-w-0 translate-x-2 translate-y-[20%]">
                    <h3 className="font-semibold text-[15px] text-slate-900 truncate">
                      {loan.clientName || 'Unknown Client'}
                    </h3>
                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {loan.clientEmail || 'No email provided'}
                    </p>



                    <div className="mt-3">
                      <span className={cn('badge', {
                        'badge-success':   loan.status === 'Active',
                        'badge-pending':   loan.status === 'Pending',
                        'badge-error':     loan.status === 'Overdue' || loan.status === 'Denied' || loan.status === 'Written Off' || loan.status === 'Loss',
                        'badge-completed': loan.status === 'Fully Paid',
                      })}>
                        {loan.status}
                      </span>

                    </div>
                  </div>

                </div>
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
                    ">
                  {isOpen ? <ChevronUp size={18} className="text-gray-400" />
                    : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </TableResponsiveCardHeader>

              <TableResponsiveCardContent isOpen={isOpen}>
                <div className="px-5 pb-5">
                  {/* summary box */}
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
        {recentLoans.length === 0 && (

          <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-8 text-center flex flex-col items-center justify-center text-slate-400 translate-y-2"><br/>
            <CreditCard className="size-8 mb-2" />
            <p className="text-14 font-semibold text-slate-600">No recent Loans</p>
            <p className="text-12">Originated loans will appear here.</p><br/>
          </div>
        )}
      </TableResponsiveGrid>
    </div>
  );
}
