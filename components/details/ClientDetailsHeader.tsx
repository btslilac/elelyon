'use client';

import Link from "next/link";
import { Edit, Banknote, PlusCircle, FileDown, UserX, Shield, Calendar, Mail, Phone, Hash } from "lucide-react";
import ClientAvatar from "@/components/ClientAvatar";
import { cn } from "@/lib/utils";

interface ClientDetailsHeaderProps {
  client: LMSClient;
  penalties: any[];
  loans?: any[];
}

export default function ClientDetailsHeader({ client, penalties, loans = [] }: ClientDetailsHeaderProps) {
  const activePenaltiesTotal = penalties
    .filter(p => p.status === 'Active')
    .reduce((acc, p) => acc + p.amount, 0);

  const outstandingBalance = client.outstandingBalance ?? 0;

  // Arrears is the sum of balance of overdue or defaulted loans
  const overdueLoans = loans.filter(l => {
    if (l.balance <= 0) return false;
    if (l.status === 'Overdue' || l.status === 'Defaulted') return true;
    
    // Safety check on due date
    if (l.due_date) {
      const dueDateObj = new Date(l.due_date);
      const now = new Date();
      return now > dueDateObj;
    }
    return false;
  });

  const arrearsAmount = overdueLoans.reduce((sum, l) => sum + (l.balance ?? 0), 0);

  // Check if any loan is overdue by more than 60 days
  const hasDefaultedLoan = loans.some(l => {
    if (l.balance <= 0) return false;
    if (l.status === 'Defaulted') return true;
    
    if (l.due_date) {
      const dueDateObj = new Date(l.due_date);
      const now = new Date();
      const diffMs = now.getTime() - dueDateObj.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > 60;
    }
    return false;
  });

  // 1. Determine Status Badge
  let statusLabel = "Cleared";
  let statusBadgeClass = "badge-success";

  if (hasDefaultedLoan) {
    statusLabel = "Default";
    statusBadgeClass = "bg-red-950 text-red-200 border border-red-800 font-semibold";
  } else if (overdueLoans.length > 0) {
    statusLabel = "Arrears";
    statusBadgeClass = "badge-error";
  } else if (outstandingBalance > 0 || loans.some(l => (l.balance ?? 0) > 0)) {
    statusLabel = "Active";
    statusBadgeClass = "badge-pending"; // amber/warning badge
  }

  // 2. Determine Risk Badge
  let riskLabel = "Low Risk";
  let riskBadgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
  let shieldClass = "text-emerald-600";

  if (arrearsAmount > 1000000) {
    riskLabel = "Peak Risk";
    riskBadgeClass = "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse";
    shieldClass = "text-rose-600";
  } else if (arrearsAmount >= 200000) {
    riskLabel = "High Risk";
    riskBadgeClass = "bg-red-50 text-red-700 border border-red-200";
    shieldClass = "text-red-600";
  } else if (arrearsAmount >= 50000) {
    riskLabel = "Moderate Risk";
    riskBadgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
    shieldClass = "text-amber-600";
  } else if (arrearsAmount >= 10000) {
    riskLabel = "Normal Risk";
    riskBadgeClass = "bg-blue-50 text-blue-700 border border-blue-200";
    shieldClass = "text-blue-600";
  }

  const joinDate = client.$createdAt ? new Date(client.$createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }) : 'N/A';

  return (
    <div className="flex flex-col gap-6">
      {/* Top Section: Info & Profile */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <ClientAvatar
            firstName={client.firstName}
            lastName={client.lastName}
            photoUrl={client.profilePhotoUrl}
            size="xl"
            className="shadow-soft border-4 border-white"
          />

          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
            <h1 className="text-30 font-bold text-gray-900 tracking-tight">
              {client.firstName} {client.lastName}
            </h1>
            
            {/* Real-time status and risk badges, placed below the name of the client */}
            <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
              <span className={cn("badge", statusBadgeClass)}>
                {statusLabel}
              </span>
              <span className={cn("badge flex items-center gap-1", riskBadgeClass)}>
                <Shield className={cn("size-3", shieldClass)} />
                {riskLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 mt-1">
              <div className="flex items-center gap-2 text-14 text-gray-500">
                <Hash className="size-4 text-gray-400" />
                <span className="font-medium">ID: {client.nationalId}</span>
              </div>
              <div className="flex items-center gap-2 text-14 text-gray-500">
                <Phone className="size-4 text-gray-400" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-14 text-gray-500">
                <Mail className="size-4 text-gray-400" />
                <span>{client.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-14 text-gray-500">
                <Calendar className="size-4 text-gray-400" />
                <span>Joined {joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center md:justify-end gap-2 max-w-md">
          <Link href={`/clients/${client.$id}/edit`} className="btn-secondary h-10 px-4">
            <Edit className="size-4" />
            <span>Edit Profile</span>
          </Link>
          {/*<button className="btn-primary h-10 px-4 bg-emerald-600 hover:bg-emerald-700">
            <Banknote className="size-4" />
            <span>Log Repayment</span>
          </button>
          <button className="btn-secondary h-10 px-4">
            <PlusCircle className="size-4" />
            <span>Add Penalty</span>
          </button>
          <button className="btn-secondary h-10 px-4">
            <FileDown className="size-4" />
            <span>Statement</span>
          </button>
          <button className="btn-secondary h-10 px-4 text-red-600 hover:text-white hover:bg-red-600">
            <UserX className="size-4" />
            <span>Suspend</span>
          </button>*/}
        </div>
      </div>
    </div>
  );
}
