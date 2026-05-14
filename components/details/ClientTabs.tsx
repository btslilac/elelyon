'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, Receipt, AlertCircle, FileText, Activity,
  ExternalLink, CheckCircle, XCircle, Clock, AlertTriangle, Folder, MessageSquare
} from "lucide-react";
import ClientOverview from "./ClientOverview";
import ActivityTimeline from "./ActivityTimeline";
import CommunicationTimeline from "./CommunicationTimeline";
import CommunicationStats from "./CommunicationStats";
import { formatAmount, cn } from "@/lib/utils";

interface ClientTabsProps {
  client: LMSClient;
  loans: any[];
  repayments: any[];
  penalties: any[];
  auditLogs: any[];
  notifications: any[];
}

/* ── helpers ── */
const loanStatusColor: Record<string, string> = {
  Active: "badge-success",
  Completed: "badge-success",
  Pending: "badge-warning",
  Overdue: "badge-error",
  Defaulted: "badge-error",
  Denied: "bg-gray-100 text-gray-500",
};

const loanStatusIcon: Record<string, JSX.Element> = {
  Active: <CheckCircle className="size-3" />,
  Completed: <CheckCircle className="size-3" />,
  Pending: <Clock className="size-3" />,
  Overdue: <AlertTriangle className="size-3" />,
  Defaulted: <XCircle className="size-3" />,
  Denied: <XCircle className="size-3" />,
};

function fmt(d: string) {
  return d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function ClientTabs({ client, loans, repayments, penalties, auditLogs }: ClientTabsProps) {
  const tabClass = "data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none rounded-none text-14 font-semibold text-gray-500 h-12 px-0";

  return (
    <Tabs defaultValue="overview" className="w-full">
      <div className="border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
        <TabsList className="bg-transparent gap-8 h-12 p-0 justify-start w-full min-w-max">
          <TabsTrigger value="overview" className={tabClass}>
            <div className="flex items-center gap-2"><LayoutDashboard className="size-4" />Overview</div>
          </TabsTrigger>
          <TabsTrigger value="loans" className={tabClass}>
            <div className="flex items-center gap-2"><FileText className="size-4" />Loans ({loans.length})</div>
          </TabsTrigger>
          <TabsTrigger value="repayments" className={tabClass}>
            <div className="flex items-center gap-2"><Receipt className="size-4" />Repayments ({repayments.length})</div>
          </TabsTrigger>
          <TabsTrigger value="penalties" className={tabClass}>
            <div className="flex items-center gap-2"><AlertCircle className="size-4" />Penalties ({penalties.length})</div>
          </TabsTrigger>
          <TabsTrigger value="documents" className={tabClass}>
            <div className="flex items-center gap-2"><Folder className="size-4" />Documents</div>
          </TabsTrigger>
          <TabsTrigger value="communications" className={tabClass}>
            <div className="flex items-center gap-2"><MessageSquare className="size-4" />Communications ({notifications.length})</div>
          </TabsTrigger>
          <TabsTrigger value="activity" className={tabClass}>
            <div className="flex items-center gap-2"><Activity className="size-4" />Activity</div>
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ── OVERVIEW ── */}
      <TabsContent value="overview" className="focus-visible:outline-none">
        <div className="flex flex-col gap-10 animate-fade-in">
          <ClientOverview client={client} loans={loans} repayments={repayments} penalties={penalties} />
          <ActivityTimeline logs={auditLogs} />
        </div>
      </TabsContent>

      {/* ── LOANS ── */}
      <TabsContent value="loans" className="focus-visible:outline-none">
        <div className="animate-fade-in">
          {loans.length === 0 ? (
            <EmptyState icon={<FileText />} title="No loans yet" desc="This client has no loan records." />
          ) : (
            <div className="card-premium overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="data-th text-left">Date</th>
                    <th className="data-th text-left">Type</th>
                    <th className="data-th text-right">Principal</th>
                    <th className="data-th text-right">Total Payable</th>
                    <th className="data-th text-right">Balance</th>
                    <th className="data-th text-left">Status</th>
                    <th className="data-th text-right">Due Date</th>
                    <th className="data-th text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id} className="data-table-row">
                      <td className="data-td text-14 text-gray-600">{fmt(loan.created_at)}</td>
                      <td className="data-td">
                        <span className="text-14 font-medium text-gray-700">{loan.loan_type || "—"}</span>
                      </td>
                      <td className="data-td text-right">
                        <span className="amount-text">{formatAmount(loan.principal_amount)}</span>
                      </td>
                      <td className="data-td text-right">
                        <span className="amount-text">{formatAmount(loan.total_payable)}</span>
                      </td>
                      <td className="data-td text-right">
                        <span className={cn("amount-text", loan.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                          {formatAmount(loan.balance)}
                        </span>
                      </td>
                      <td className="data-td">
                        <span className={cn("badge flex items-center gap-1 w-fit", loanStatusColor[loan.status] || "badge-warning")}>
                          {loanStatusIcon[loan.status]}
                          {loan.status}
                        </span>
                      </td>
                      <td className="data-td text-right text-14 text-gray-600">{fmt(loan.due_date)}</td>
                      <td className="data-td text-right">
                        <Link href={`/loans/${loan.id}`} className="inline-flex items-center gap-1 text-12 font-semibold text-blue-600 hover:text-blue-700">
                          View <ExternalLink className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── REPAYMENTS ── */}
      <TabsContent value="repayments" className="focus-visible:outline-none">
        <div className="animate-fade-in">
          {repayments.length === 0 ? (
            <EmptyState icon={<Receipt />} title="No repayments yet" desc="Repayments will appear here after they are logged." />
          ) : (
            <div className="card-premium overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="data-th text-left">Date</th>
                    <th className="data-th text-left">Loan ID</th>
                    <th className="data-th text-right">Amount</th>
                    <th className="data-th text-left">Method</th>
                    <th className="data-th text-left">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {repayments.map((r) => (
                    <tr key={r.id} className="data-table-row">
                      <td className="data-td text-14 text-gray-700">{fmt(r.date)}</td>
                      <td className="data-td">
                        <Link href={`/loans/${r.loan_id}`} className="mono-pill hover:border-blue-300 hover:text-blue-600 transition-colors">
                          {r.loan_id?.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="data-td text-right">
                        <span className="amount-text text-emerald-600">{formatAmount(r.amount)}</span>
                      </td>
                      <td className="data-td text-14 text-gray-600">{r.payment_method}</td>
                      <td className="data-td text-14 text-gray-400 font-mono">{r.reference_id || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── PENALTIES ── */}
      <TabsContent value="penalties" className="focus-visible:outline-none">
        <div className="animate-fade-in">
          {penalties.length === 0 ? (
            <EmptyState icon={<AlertCircle />} title="No penalties" desc="No penalties have been applied to this client." />
          ) : (
            <div className="card-premium overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="data-th text-left">Date Applied</th>
                    <th className="data-th text-left">Type</th>
                    <th className="data-th text-right">Amount</th>
                    <th className="data-th text-left">Status</th>
                    <th className="data-th text-left">Applied By</th>
                    <th className="data-th text-left">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {penalties.map((p) => (
                    <tr key={p.id} className="data-table-row">
                      <td className="data-td text-14 text-gray-600">{fmt(p.date_applied)}</td>
                      <td className="data-td text-14 font-medium text-gray-700">{p.penalty_type}</td>
                      <td className="data-td text-right">
                        <span className="amount-text text-red-600">{formatAmount(p.amount)}</span>
                      </td>
                      <td className="data-td">
                        <span className={cn("badge", p.status === "Active" ? "badge-error" : "badge-success")}>
                          {p.status}
                        </span>
                      </td>
                      <td className="data-td text-14 text-gray-500">{p.applied_by}</td>
                      <td className="data-td text-12 text-gray-400 max-w-xs truncate">{p.comment || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── DOCUMENTS ── */}
      <TabsContent value="documents" className="focus-visible:outline-none">
        <div className="animate-fade-in">
          <EmptyState
            icon={<Folder />}
            title="No documents yet"
            desc="Upload loan agreements, ID copies, or signed forms to keep everything in one place."
            action={<button className="btn-secondary mt-6">Upload Document</button>}
          />
        </div>
      </TabsContent>

      {/* ── COMMUNICATIONS ── */}
      <TabsContent value="communications" className="focus-visible:outline-none">
        <div className="animate-fade-in">
          {notifications.length > 0 && (
            <CommunicationStats stats={{
              totalSent: notifications.length,
              delivered: notifications.filter(n => n.status === 'SENT' || n.status === 'DELIVERED').length,
              failed: notifications.filter(n => n.status === 'FAILED').length,
              byChannel: {
                SMS: notifications.filter(n => n.channel === 'SMS').length,
                WHATSAPP: notifications.filter(n => n.channel === 'WHATSAPP').length,
                EMAIL: notifications.filter(n => n.channel === 'EMAIL').length,
              }
            }} />
          )}
          <CommunicationTimeline notifications={notifications} />
        </div>
      </TabsContent>

      {/* ── ACTIVITY ── */}
      <TabsContent value="activity" className="focus-visible:outline-none">
        <div className="animate-fade-in">
          <ActivityTimeline logs={auditLogs} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

/* ── reusable empty state ── */
function EmptyState({ icon, title, desc, action }: { icon: JSX.Element; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
      <div className="p-4 bg-white rounded-full shadow-sm mb-4 text-gray-300">
        {icon}
      </div>
      <h4 className="text-16 font-semibold text-gray-900">{title}</h4>
      <p className="text-14 text-gray-500 max-w-xs mt-1">{desc}</p>
      {action}
    </div>
  );
}
