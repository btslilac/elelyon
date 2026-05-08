import HeaderBox from "@/components/HeaderBox";
import { getLoans } from "@/lib/actions/loan.actions";
import { formatAmount } from "@/lib/utils";
import Link from "next/link";
import { Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default async function LoansPage() {
  const loans = await getLoans() || [];
  
  const activeLoans = loans.filter((l: any) => l.status === 'Active').length;
  const pendingLoans = loans.filter((l: any) => l.status === 'Pending').length;
  const overdueLoans = loans.filter((l: any) => l.status === 'Overdue').length;

  return (
    <section className="flex flex-col gap-8 px-5 sm:px-8 py-8 w-full max-w-7xl mx-auto">
      <div className="flex w-full justify-between items-start md:items-center flex-col md:flex-row gap-4 mb-2">
        <HeaderBox
          title="Loans"
          subtext="Manage active, pending, and completed loans."
        />
        <Link href="/loans/create" className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium text-14 shadow-sm hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New Loan
        </Link>
      </div>

      {/* Loan Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-14 font-medium text-gray-500">Active Loans</p>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <h2 className="text-30 font-bold text-gray-900 tracking-tight">{activeLoans}</h2>
            <p className="text-13 text-gray-400 mt-1">Earning interest</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-14 font-medium text-gray-500">Pending Approval</p>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div>
            <h2 className="text-30 font-bold text-gray-900 tracking-tight">{pendingLoans}</h2>
            <p className="text-13 text-gray-400 mt-1">Awaiting review</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-14 font-medium text-gray-500">Overdue</p>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div>
            <h2 className="text-30 font-bold text-gray-900 tracking-tight">{overdueLoans}</h2>
            <p className="text-13 text-gray-400 mt-1">Requires attention</p>
          </div>
        </div>
      </div>

      <section className="flex flex-col w-full gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase text-[11px] tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Loan ID</th>
                  <th className="px-6 py-4">Client ID</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Principal</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.map((loan: any) => (
                  <tr key={loan.$id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{loan.$id}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{loan.clientId}</td>
                    <td className="px-6 py-4 text-gray-500">{loan.loanType}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{formatAmount(loan.principalAmount || 0)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium
                        ${loan.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                          loan.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                            loan.status === 'Overdue' ? 'bg-red-50 text-red-700' :
                              'bg-gray-100 text-gray-700'}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-red-600 font-medium">{formatAmount(loan.balance || 0)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/loans/${loan.$id}`} className="inline-block px-3 py-1.5 rounded-md text-13 font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No loans found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  )
}
