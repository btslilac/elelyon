import HeaderBox from '@/components/HeaderBox'
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getLoanMetrics, getLoans } from '@/lib/actions/loan.actions';
import { formatAmount } from '@/lib/utils';
import Link from 'next/link';
import { ArrowUpRight, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

const Home = async () => {
  const loggedIn = await getLoggedInUser();
  const loanMetrics = await getLoanMetrics();
  const recentLoans = await getLoans() || [];

  return (
    <section className="flex flex-col gap-8 px-5 sm:px-8 py-8 w-full max-w-7xl mx-auto">
      <header>
        <HeaderBox 
          type="greeting"
          title="Overview"
          user={loggedIn?.firstName || 'Guest'}
          subtext="Here's a summary of your lending portfolio and recent activity."
        />
      </header>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-14 font-medium text-gray-500">Total Disbursed</p>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div>
            <h2 className="text-30 font-bold text-gray-900 tracking-tight">{formatAmount(loanMetrics.totalDisbursed || 0)}</h2>
            <p className="text-13 text-gray-400 mt-1">Lifetime loan volume</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-14 font-medium text-gray-500">Outstanding Principal</p>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div>
            <h2 className="text-30 font-bold text-gray-900 tracking-tight">{formatAmount(loanMetrics.totalOutstanding || 0)}</h2>
            <p className="text-13 text-gray-400 mt-1">Awaiting collection</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-14 font-medium text-gray-500">Active Loans</p>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <h2 className="text-30 font-bold text-gray-900 tracking-tight">{loanMetrics.loanCount || 0} <span className="text-16 font-medium text-gray-400">Loans</span></h2>
            <p className="text-13 text-gray-400 mt-1">Currently being serviced</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-4 flex flex-col gap-6 w-full">
        <div className="flex justify-between items-end">
          <h2 className="text-18 font-semibold text-gray-900">Recent Originations</h2>
          <Link href="/loans" className="text-14 text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1 group">
            View all <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase text-[11px] tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Loan ID</th>
                  <th className="px-6 py-4">Principal</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLoans.slice(0, 5).map((loan: any) => (
                  <tr key={loan.$id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{loan.$id}</td>
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
                    <td className="px-6 py-4 text-right">
                       <Link href={`/loans/${loan.$id}`} className="inline-block px-3 py-1.5 rounded-md text-13 font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                         View details
                       </Link>
                    </td>
                  </tr>
                ))}
                {recentLoans.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No active loans found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Home