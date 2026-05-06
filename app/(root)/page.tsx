import HeaderBox from '@/components/HeaderBox'
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getLoanMetrics, getLoans } from '@/lib/actions/loan.actions';
import { formatAmount } from '@/lib/utils';
import Link from 'next/link';

const Home = async () => {
  const loggedIn = await getLoggedInUser();
  const loanMetrics = await getLoanMetrics();
  const recentLoans = await getLoans() || [];

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
            subtext="Manage your Loan Portfolio and monitor active clients efficiently."
          />
        </header>

        {/* LMS Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-chart flex flex-col gap-1 transition-all hover:shadow-md border-t-4 border-t-blue-600">
            <p className="text-14 font-semibold text-gray-500 uppercase tracking-wider">Total Disbursed</p>
            <h2 className="text-30 font-bold text-black-1">{formatAmount(loanMetrics.totalDisbursed || 0)}</h2>
            <p className="text-12 text-gray-400 mt-1">Life-time loan volume</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-chart flex flex-col gap-1 transition-all hover:shadow-md border-t-4 border-t-red-600">
            <p className="text-14 font-semibold text-gray-500 uppercase tracking-wider">Outstanding</p>
            <h2 className="text-30 font-bold text-red-600">{formatAmount(loanMetrics.totalOutstanding || 0)}</h2>
            <p className="text-12 text-gray-400 mt-1">Unpaid principal + interest</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-chart flex flex-col gap-1 transition-all hover:shadow-md border-t-4 border-t-green-600">
            <p className="text-14 font-semibold text-gray-500 uppercase tracking-wider">Active Portfolio</p>
            <h2 className="text-30 font-bold text-green-600">{loanMetrics.loanCount || 0} <span className="text-16 font-medium text-gray-500">Loans</span></h2>
            <p className="text-12 text-gray-400 mt-1">Currently being serviced</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-12 flex flex-col gap-4 w-full">
          <div className="flex justify-between items-end">
            <h2 className="text-20 font-bold text-gray-900">Recent Originations</h2>
            <Link href="/loans" className="text-14 text-blue-600 font-semibold hover:underline">View All Loans</Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-chart">
            <table className="w-full text-sm text-left border-collapse bg-white">
              <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase text-[11px] tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4 font-semibold">Loan ID</th>
                <th className="px-6 py-4 font-semibold">Principal</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentLoans.slice(0, 5).map((loan: any) => (
                <tr key={loan.$id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{loan.$id}</td>
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
                  <td className="px-6 py-4 text-right">
                     <Link href={`/loans/${loan.$id}`} className="inline-block px-4 py-1.5 rounded-lg border border-gray-200 text-12 font-bold text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">
                       View
                     </Link>
                  </td>
                </tr>
              ))}
              {recentLoans.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No active loans found.</td>
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