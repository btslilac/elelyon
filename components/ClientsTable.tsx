'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, UsersRound, Phone, MessageSquare, PlusCircle, Download, ListChecks, AlertTriangle, UserCog, Eye } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { cn } from '@/lib/utils';
import ClientAvatar from '@/components/ClientAvatar';

interface Client {
  $id: string;
  firstName: string;
  lastName: string;
  email: string;
  nationalId: string;
  phone: string;
  totalBorrowed: number;
  outstandingBalance: number;
  profilePhotoUrl?: string;
}

export default function ClientsTable({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'arrears'>('all');

  const filtered = useMemo(() => {
    let result = clients;

    // Tab filtering
    if (activeTab === 'active') {
      result = clients.filter(c => (c.totalBorrowed || 0) > 0 && (c.outstandingBalance || 0) > 0);
    } else if (activeTab === 'arrears') {
      result = clients.filter(c => (c.outstandingBalance || 0) > 0);
    }

    // Search query filtering
    if (!query.trim()) return result;
    const q = query.toLowerCase();
    return result.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.nationalId?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  }, [clients, query, activeTab]);

  const exportToCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'National ID', 'Phone', 'Total Borrowed', 'Outstanding Balance'];
    const rows = filtered.map(c => [
      c.firstName,
      c.lastName,
      c.email,
      c.nationalId,
      c.phone,
      c.totalBorrowed,
      c.outstandingBalance
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-5 mt-6">
      {/* Table Toolbar Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Tabs */}
        <div className="status-filter-group w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={cn('status-filter-pill', activeTab === 'all' && 'status-filter-pill-active')}
          >
            <div className="flex items-center gap-2">
              <UsersRound className="size-3.5" />
              <span>All Clients</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={cn('status-filter-pill', activeTab === 'active' && 'status-filter-pill-active')}
          >
            <div className="flex items-center gap-2">
              <ListChecks className="size-3.5" />
              <span>Active Loans</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('arrears')}
            className={cn('status-filter-pill', activeTab === 'arrears' && 'status-filter-pill-active')}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              <span>In Arrears</span>
            </div>
          </button>
        </div>

        {/* Right Side: Search & Export */}
        <div className="flex items-center gap-3">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search clients..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={exportToCSV} className="btn-secondary px-3 py-2 h-auto" title="Export to CSV">
            <Download className="size-4" />
          </button>
        </div>
      </div>

      <div className="data-table-wrap">
        <div className="data-table-scroll">
          <table className="data-table">
            <colgroup>
              <col style={{ width: '32%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr className="data-table-head-row">
                <th className="data-th text-left">Client</th>
                <th className="data-th text-left">ID / Phone</th>
                <th className="data-th text-left">Status</th>
                <th className="data-th text-right">Disbursed</th>
                <th className="data-th text-right">Balance</th>
                <th className="data-th text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const isArrears = (client.outstandingBalance || 0) > 0;
                const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}`;

                return (
                  <tr key={client.$id} className="data-table-row group/row">
                    <td className="data-td">
                      <div className="flex items-center gap-3">
                        <ClientAvatar
                          firstName={client.firstName}
                          lastName={client.lastName}
                          photoUrl={client.profilePhotoUrl}
                          size="md"
                        />
                        <div className="flex flex-col min-w-0">
                          <Link
                            href={`/clients/${client.$id}`}
                            className="client-name hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {client.firstName} {client.lastName}
                          </Link>
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
                    <td className="data-td">
                      {isArrears ? (
                        <span className="badge badge-error">Arrears</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                    <td className="data-td text-right">
                      <span className="amount-text">{formatAmount(client.totalBorrowed || 0)}</span>
                    </td>
                    <td className="data-td text-right">
                      <span className={cn('amount-text', isArrears ? 'text-red-600' : 'text-gray-900')}>
                        {formatAmount(client.outstandingBalance || 0)}
                      </span>
                    </td>
                    <td className="data-td text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <Link href={`/clients/${client.$id}`} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="View Profile">
                          <Eye className="size-4" />
                        </Link>
                        <a href={`tel:${client.phone}`} className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors" title="Call">
                          <Phone className="size-4" />
                        </a>
                        <Link href={`/loans/create?clientId=${client.$id}`} className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors" title="New Loan">
                          <PlusCircle className="size-4" />
                        </Link>
                        <Link href={`/clients/${client.$id}/edit`} className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors" title="Edit Profile">
                          <UserCog className="size-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="data-empty-cell">
                    <div className="data-empty">
                      <UsersRound className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">
                        {query ? `No clients match "${query}"` : 'No borrower records found'}
                      </p>
                      <p className="text-12 text-gray-400">
                        {query ? 'Try a different search term or check filters.' : 'Add clients to see them in the registry.'}
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


