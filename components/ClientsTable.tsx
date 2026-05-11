'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, UsersRound } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Client {
  $id: string;
  firstName: string;
  lastName: string;
  email: string;
  nationalId: string;
  phone: string;
  totalBorrowed: number;
  outstandingBalance: number;
}

export default function ClientsTable({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.nationalId?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  }, [clients, query]);

  return (
    <div className="flex flex-col gap-5 mt-6">
      {/* Table Header Row */}
      <div className="table-toolbar">
        <h2 className="text-18 font-semibold text-gray-900 tracking-tight">
          Client List
          <span className="ml-2 text-14 font-normal text-gray-400">({filtered.length})</span>
        </h2>
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, ID, email, phone..."
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

      <div className="data-table-wrap">
        <div className="data-table-scroll">
          <table className="data-table">
            <colgroup>
              <col style={{ width: '35%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
              <tr className="data-table-head-row">
                <th className="data-th text-left">Client</th>
                <th className="data-th text-left">ID / Phone</th>
                <th className="data-th text-right">Disbursed</th>
                <th className="data-th text-right">Balance</th>
                <th className="data-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.$id} className="data-table-row">
                  <td className="data-td">
                    <div className="flex items-center gap-3">
                      <div className="client-avatar">
                        {client.firstName?.[0]}{client.lastName?.[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="client-name">{client.firstName} {client.lastName}</span>
                        <span className="client-email">{client.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="data-td">
                    <div className="flex flex-col gap-1">
                      <span className="mono-pill">{client.nationalId}</span>
                      <span className="text-12 text-gray-500">{client.phone}</span>
                    </div>
                  </td>
                  <td className="data-td text-right">
                    <span className="amount-text">{formatAmount(client.totalBorrowed || 0)}</span>
                  </td>
                  <td className="data-td text-right">
                    <span className={cn('amount-text', (client.outstandingBalance || 0) > 0 ? 'text-red-600' : 'text-gray-900')}>
                      {formatAmount(client.outstandingBalance || 0)}
                    </span>
                  </td>
                  <td className="data-td text-right">
                    <Link href={`/clients/${client.$id}/edit`} className="btn-secondary">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="data-empty-cell">
                    <div className="data-empty">
                      <UsersRound className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">
                        {query ? `No clients match "${query}"` : 'No borrower records found'}
                      </p>
                      <p className="text-12 text-gray-400">
                        {query ? 'Try a different name, ID, or phone number.' : 'Add clients to see them in the registry.'}
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
