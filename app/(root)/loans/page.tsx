import HeaderBox from "@/components/HeaderBox";
import { getLoans } from "@/lib/actions/loan.actions";
import Link from "next/link";
import { ArrowUpRight, Activity, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import LoansTable from "@/components/LoansTable";

export default async function LoansPage() {
  const loans = await getLoans() || [];

  const activeLoans = loans.filter((l: any) => l.status === 'Active').length;
  const pendingLoans = loans.filter((l: any) => l.status === 'Pending').length;
  const overdueLoans = loans.filter((l: any) => l.status === 'Overdue').length;
  const completedLoans = loans.filter((l: any) => l.status === 'Completed').length;

  return (
    <section className="home-content">
      <header className="page-header">
        <HeaderBox
          title="Loans"
          subtext="Comprehensive overview and management of all client loans."
        />
        <Link href="/loans/create" className="btn-primary">
          <span>New Loan</span>
          <ArrowUpRight className="size-4 opacity-70" />
        </Link>
      </header>

      {/* Loan Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success-50 rounded-bl-full -z-10"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Active Loans</p>
            <div className="p-2 bg-success-50 rounded-lg text-success-600 ring-1 ring-success-100">
              <Activity className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{activeLoans}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-success">Servicing</span>
              <p className="text-12 text-gray-500 font-medium">Interest earning</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning-50 rounded-bl-full -z-10"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Awaiting Review</p>
            <div className="p-2 bg-warning-50 rounded-lg text-warning-600 ring-1 ring-warning-100">
              <Clock className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{pendingLoans}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-pending">Pipeline</span>
              <p className="text-12 text-gray-500 font-medium">Pending approval</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-danger-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Overdue Accounts</p>
            <div className="p-2 bg-danger-50 rounded-lg text-danger-600 ring-1 ring-danger-100">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{overdueLoans}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-error">Critical</span>
              <p className="text-12 text-gray-500 font-medium">Requires attention</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full -z-10" style={{ background: '#E0F2FE' }}></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Completed</p>
            <div className="p-2 rounded-lg ring-1" style={{ background: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' }}>
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{completedLoans}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-completed">Settled</span>
              <p className="text-12 text-gray-500 font-medium">Fully repaid</p>
            </div>
          </div>
        </div>
      </div>

      <LoansTable loans={loans} />
    </section>
  )
}
