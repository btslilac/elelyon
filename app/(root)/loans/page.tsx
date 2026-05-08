import HeaderBox from "@/components/HeaderBox";
import { getLoans } from "@/lib/actions/loan.actions";
import { formatAmount } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function LoansPage() {
  const loans = await getLoans() || [];
  
  const activeLoans = loans.filter((l: any) => l.status === 'Active').length;
  const pendingLoans = loans.filter((l: any) => l.status === 'Pending').length;
  const overdueLoans = loans.filter((l: any) => l.status === 'Overdue').length;

  return (
    <section className="home-content">
      <div className="flex w-full justify-between items-end">
        <HeaderBox
          title="Loan Portfolio"
          subtext="Comprehensive overview and management of all client originations."
        />
        <Link href="/loans/create" className="bg-primary text-white px-6 h-11 rounded-xl font-bold text-14 shadow-premium hover:bg-primary/90 transition-all flex-center">
          New Origination
        </Link>
      </div>

      {/* Loan Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium border-t-4 border-t-green-500">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-1">Active Portfolio</p>
          <h2 className="text-30 font-black text-green-600">{activeLoans}</h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge badge-success">Servicing</span>
            <p className="text-12 text-gray-400 font-medium">Interest earning</p>
          </div>
        </div>
        
        <div className="card-premium border-t-4 border-t-yellow-500">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-1">Awaiting Review</p>
          <h2 className="text-30 font-black text-yellow-600">{pendingLoans}</h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge badge-pending">Pipeline</span>
            <p className="text-12 text-gray-400 font-medium">Pending approval</p>
          </div>
        </div>

        <div className="card-premium border-t-4 border-t-red-500">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-1">Overdue Accounts</p>
          <h2 className="text-30 font-black text-red-600">{overdueLoans}</h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge badge-error">Critical</span>
            <p className="text-12 text-gray-400 font-medium">Requires attention</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-20 font-black text-gray-900 tracking-tight">All Originations</h2>
        <div className="card-premium p-0 overflow-hidden">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Loan ID</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Principal</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loans.map((loan: any) => (
                <tr key={loan.$id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{loan.$id.slice(-8).toUpperCase()}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{loan.clientId}</td>
                  <td className="px-6 py-4 text-gray-600">{loan.loanType}</td>
                  <td className="px-6 py-4 text-gray-900 font-bold">{formatAmount(loan.principalAmount || 0)}</td>
                  <td className="px-6 py-4">
                    <span className={cn('badge', {
                      'badge-success': loan.status === 'Active',
                      'badge-pending': loan.status === 'Pending',
                      'badge-error': loan.status === 'Overdue'
                    })}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/loans/${loan.$id}`} className="inline-flex h-8 items-center px-4 rounded-lg border border-gray-200 text-12 font-bold text-gray-600 hover:border-primary hover:text-primary transition-all bg-white shadow-sm">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                    No originations found in the portfolio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
