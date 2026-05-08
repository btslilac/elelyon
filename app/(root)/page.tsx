import HeaderBox from '@/components/HeaderBox'
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getLoanMetrics, getLoans } from '@/lib/actions/loan.actions';
import { formatAmount } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const Home = async () => {
  const loggedIn = await getLoggedInUser();
  const loanMetrics = await getLoanMetrics();
  const recentLoans = await getLoans() || [];

  return (
    <section className="home-content">
      <header className="flex flex-col gap-1">
        <HeaderBox 
          type="greeting"
          title="Welcome,"
          user={loggedIn?.firstName || 'Guest'}
          subtext="Overview of your loan portfolio and active originations."
        />
      </header>

      {/* LMS Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium border-t-4 border-t-primary">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-1">Total Disbursed</p>
          <h2 className="text-30 font-black text-gray-900">{formatAmount(loanMetrics.totalDisbursed || 0)}</h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge badge-success">Live Data</span>
            <p className="text-12 text-gray-400 font-medium">Life-time volume</p>
          </div>
        </div>
        
        <div className="card-premium border-t-4 border-t-red-500">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-1">Outstanding</p>
          <h2 className="text-30 font-black text-red-600">{formatAmount(loanMetrics.totalOutstanding || 0)}</h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge badge-error">Action Required</span>
            <p className="text-12 text-gray-400 font-medium">Unpaid balance</p>
          </div>
        </div>

        <div className="card-premium border-t-4 border-t-green-500">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-1">Active Portfolio</p>
          <h2 className="text-30 font-black text-green-600">{loanMetrics.loanCount || 0} <span className="text-16 font-medium text-gray-500">Loans</span></h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge badge-success">Servicing</span>
            <p className="text-12 text-gray-400 font-medium">Active accounts</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-20 font-black text-gray-900 tracking-tight">Recent Originations</h2>
          <Link href="/loans" className="text-14 font-bold text-primary hover:underline underline-offset-4">View All Portfolio</Link>
        </div>
        
        <div className="card-premium p-0 overflow-hidden">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Loan ID</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Principal</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentLoans.slice(0, 5).map((loan: any) => (
                <tr key={loan.$id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{loan.$id.slice(-8).toUpperCase()}</td>
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
              {recentLoans.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium italic">No recent originations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default Home