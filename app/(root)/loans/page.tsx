import HeaderBox from "@/components/HeaderBox";
import { getLoans } from "@/lib/actions/loan.actions";
import { formatAmount } from "@/lib/utils";
import Link from "next/link";

export default async function LoansPage() {
  const loans = await getLoans() || [];
  
  const activeLoans = loans.filter((l: any) => l.status === 'Active').length;
  const pendingLoans = loans.filter((l: any) => l.status === 'Pending').length;
  const overdueLoans = loans.filter((l: any) => l.status === 'Overdue').length;

  return (
    <section className="payment-transfer">
      <div className="flex w-full justify-between items-center mb-6">
        <HeaderBox
          title="Loans"
          subtext="Manage active, pending, and completed loans."
        />
        <Link href="/loans/create" className="bg-bank-gradient text-white px-5 py-2.5 rounded-lg font-semibold text-14 shadow-form hover:opacity-90 transition-all">
          + New Loan
        </Link>
      </div>

      {/* Loan Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-chart flex flex-col gap-1 border-t-4 border-t-green-600">
          <p className="text-14 font-semibold text-gray-500 uppercase tracking-wider">Active Loans</p>
          <h2 className="text-30 font-bold text-green-600">{activeLoans}</h2>
          <p className="text-12 text-gray-400 mt-1">Earning interest</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-chart flex flex-col gap-1 border-t-4 border-t-yellow-600">
          <p className="text-14 font-semibold text-gray-500 uppercase tracking-wider">Pending Approval</p>
          <h2 className="text-30 font-bold text-yellow-600">{pendingLoans}</h2>
          <p className="text-12 text-gray-400 mt-1">Awaiting review</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-chart flex flex-col gap-1 border-t-4 border-t-red-600">
          <p className="text-14 font-semibold text-gray-500 uppercase tracking-wider">Overdue</p>
          <h2 className="text-30 font-bold text-red-600">{overdueLoans}</h2>
          <p   className="text-12 text-gray-400 mt-1">Requires attention</p>
        </div>
      </div>

      <section className="size-full pt-5">
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-chart">
          <table className="w-full text-sm text-left border-collapse bg-white">
            <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase text-[11px] tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4 font-semibold">Loan ID</th>
                <th className="px-6 py-4 font-semibold">Client ID</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Principal</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Balance</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loans.map((loan: any) => (
                <tr key={loan.$id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{loan.$id}</td>
                  <td className="px-6 py-4 text-gray-600">{loan.clientId}</td>
                  <td className="px-6 py-4 text-gray-600">{loan.loanType}</td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">{formatAmount(loan.principalAmount || 0)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider 
                      ${loan.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' :
                        loan.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                          loan.status === 'Overdue' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-red-600 font-semibold">{formatAmount(loan.balance || 0)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/loans/${loan.$id}`} className="inline-block px-4 py-1.5 rounded-lg border border-gray-200 text-12 font-bold text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No loans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
