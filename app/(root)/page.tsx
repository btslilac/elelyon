import HeaderBox from '@/components/HeaderBox'
import RecentLoansTable from '@/components/RecentLoansTable'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import { getLoanMetrics, getLoans } from '@/lib/actions/loan.actions'
import { formatAmount } from '@/lib/utils'
import Link from 'next/link'
import { ArrowUpRight, TrendingUp, AlertCircle, Activity, ChevronRight } from 'lucide-react'

const Home = async () => {
  const [loggedIn, loanMetrics, recentLoansResponse] = await Promise.all([
    getLoggedInUser(),
    getLoanMetrics(),
    getLoans()
  ])

  const recentLoans = recentLoansResponse || []
  const activeCount = recentLoans.filter((l: any) => l.status === 'Active').length
  const overdueCount = recentLoans.filter((l: any) => l.status === 'Overdue').length

  return (
    <section className="home-content animate-fade-in">
      <header className="page-header">
        <HeaderBox
          type="greeting"
          title="Hello"
          user={loggedIn?.firstName || 'User'}
          subtext="Monitor active loans, collections, and recent loans."
        />
        <div className="flex gap-3">
          <Link href="/loans/create" className="btn-primary">
            <span>New Loan</span>
            <ArrowUpRight className="size-4 opacity-70" />
          </Link>
        </div>
      </header>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-premium flex flex-col justify-between group relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Disbursed</p>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-700 ring-1 ring-gray-200/50 group-hover:bg-gray-100 transition-colors">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tracking-tight tabular-nums">{formatAmount(loanMetrics.totalDisbursed || 0)}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-success">Total Disbursed</span>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-danger-50/50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Outstanding Balance</p>
            <div className="p-2 bg-danger-50 rounded-lg text-danger-600 ring-1 ring-danger-100">
              <AlertCircle className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tracking-tight tabular-nums">{formatAmount(loanMetrics.totalOutstanding || 0)}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-error">Action Required</span>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group">
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Active Accounts</p>
            <div className="p-2 bg-success-50 rounded-lg text-success-600 ring-1 ring-success-100 group-hover:bg-success-100/50 transition-colors">
              <Activity className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-36 font-bold text-gray-900 tracking-tight tabular-nums">{activeCount}</h2>
              {overdueCount > 0 && (
                <span className="text-14 font-semibold text-red-500">+{overdueCount} overdue</span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-success">Active</span>
              <p className="text-12 text-gray-500 font-medium">Earning interest</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="flex flex-col gap-5 mt-6">
        <div className="flex justify-between items-center">
          <h2 className="text-18 font-semibold text-gray-900 tracking-tight">Recent Loans</h2>
          <Link href="/loans" className="btn-ghost">
            View All Loans
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <RecentLoansTable recentLoans={recentLoans} />
      </div>
    </section>
  )
}

export default Home