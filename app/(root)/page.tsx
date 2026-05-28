import HeaderBox from '@/components/HeaderBox'
import RecentLoansTable from '@/components/RecentLoansTable'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import { getDashboardMetrics, getLoans } from '@/lib/actions/loan.actions'
import { formatAmount } from '@/lib/utils'
import Link from 'next/link'
import {
  ArrowUpRight, TrendingUp, AlertCircle, Activity, ChevronRight,
  Users, CreditCard, ShieldAlert, CheckCircle2, XCircle,
  Clock, DollarSign, TrendingDown, Percent, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const Home = async () => {
  const [loggedIn, metrics, recentLoansResponse] = await Promise.all([
    getLoggedInUser(),
    getDashboardMetrics(),
    getLoans()
  ])

  const recentLoans = recentLoansResponse || []
  const isManager = loggedIn?.role === 'ADMIN' || loggedIn?.role === 'MANAGER'

  return (
    <section className="home-content animate-fade-in">
      <header className="page-header">
        <HeaderBox
          type="greeting"
          title="Hello"
          user={loggedIn?.firstName || 'User'}
          subtext={isManager
            ? `${new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
            : "Monitor active loans and recent activity."}
        />
        <div className="flex gap-3">
          <Link href="/loans/create" className="btn-primary">
            <span>New Loan</span>
            <ArrowUpRight className="size-4 opacity-70" />
          </Link>
        </div>
      </header>

      {/* ── Row 1: Three primary financial KPIs ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Total Disbursed */}
        <div className="card-premium flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 to-transparent -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-5">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Disbursed</p>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 ring-1 ring-indigo-100">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-32 font-bold text-gray-900 tracking-tight tabular-nums leading-none">
              {formatAmount(metrics.totalDisbursed)}
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-success">{metrics.totalLoans} loans</span>
              <span className="text-12 text-gray-400">{metrics.fullyPaidLoans} fully paid</span>
            </div>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="card-premium flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-red-50/60 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-5">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Outstanding Balance</p>
            <div className="p-2 bg-red-50 rounded-xl text-red-500 ring-1 ring-red-100">
              <AlertCircle className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-32 font-bold text-gray-900 tracking-tight tabular-nums leading-none">
              {formatAmount(metrics.totalOutstanding)}
            </h2>
            <div className="mt-3 flex items-center gap-2">
              {metrics.overdueLoans > 0
                ? <span className="badge badge-error">{metrics.overdueLoans} overdue</span>
                : <span className="badge badge-success">All current</span>}
              <span className="text-12 text-gray-400">{metrics.activeLoans} active</span>
            </div>
          </div>
        </div>

        {/* Collections This Month */}
        <div className="card-premium flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/60 to-transparent -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-5">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Collections This Month</p>
            <div className="p-2 bg-green-50 rounded-xl text-green-600 ring-1 ring-green-100">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-32 font-bold text-gray-900 tracking-tight tabular-nums leading-none">
              {formatAmount(metrics.collectionsThisMonth)}
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <span className={cn('badge', metrics.collectionRate >= 80 ? 'badge-success' : metrics.collectionRate >= 50 ? 'badge-pending' : 'badge-error')}>
                {metrics.collectionRate}% rate
              </span>
              {metrics.collectionsToday > 0 && (
                <span className="text-12 text-gray-400">+{formatAmount(metrics.collectionsToday)} today</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Secondary KPI strips ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
        {[
          {
            label: 'Active Loans',
            value: metrics.activeLoans,
            icon: <Activity className="size-3.5" />,
            color: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-100',
            badge: null,
          },
          {
            label: 'Overdue',
            value: metrics.overdueLoans,
            icon: <AlertCircle className="size-3.5" />,
            color: metrics.overdueLoans > 0 ? 'text-red-500' : 'text-gray-400',
            bg: metrics.overdueLoans > 0 ? 'bg-red-50' : 'bg-gray-50',
            ring: metrics.overdueLoans > 0 ? 'ring-red-100' : 'ring-gray-100',
            badge: null,
          },
          {
            label: 'Pending Approval',
            value: metrics.pendingLoans,
            icon: <Clock className="size-3.5" />,
            color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100',
            badge: metrics.pendingLoans > 0 ? 'Needs review' : null,
          },
          {
            label: 'Fully Paid',
            value: metrics.fullyPaidLoans,
            icon: <CheckCircle2 className="size-3.5" />,
            color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100',
            badge: null,
          },
          {
            label: 'Written Off',
            value: metrics.writtenOffLoans + metrics.lossLoans,
            icon: <XCircle className="size-3.5" />,
            color: 'text-gray-500', bg: 'bg-gray-50', ring: 'ring-gray-100',
            badge: null,
          },
          {
            label: 'Clients',
            value: metrics.totalClients,
            icon: <Users className="size-3.5" />,
            color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100',
            badge: null,
          },
        ].map(({ label, value, icon, color, bg, ring, badge }) => (
          <div key={label} className="card-premium p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-11 font-bold text-gray-400 uppercase tracking-widest">{label}</p>
              <div className={cn('p-1.5 rounded-lg ring-1', bg, ring, color)}>
                {icon}
              </div>
            </div>
            <p className={cn('text-26 font-bold tabular-nums', color)}>{value}</p>
            {badge && <span className="badge badge-pending text-10 self-start">{badge}</span>}
          </div>
        ))}
      </div>

      {/* ── Row 3: PAR30 risk gauge + Penalties + New Loans ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">

        {/* PAR30 Risk Gauge */}
        <div className="card-premium">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">PAR 30</p>
              <p className="text-11 text-gray-400 mt-0.5">Portfolio at risk ≥ 30 days</p>
            </div>
            <Link href="/reports/par" className="text-11 text-indigo-500 hover:underline">View full →</Link>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <span className={cn(
              'text-36 font-bold tabular-nums leading-none',
              metrics.par30Rate === 0 ? 'text-green-600' :
              metrics.par30Rate < 5 ? 'text-green-600' :
              metrics.par30Rate < 15 ? 'text-amber-500' : 'text-red-600'
            )}>
              {metrics.par30Rate}%
            </span>
            <span className="text-13 text-gray-500 mb-1">{formatAmount(metrics.par30Balance)}</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', 
                metrics.par30Rate < 5 ? 'bg-green-500' :
                metrics.par30Rate < 15 ? 'bg-amber-400' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(100, metrics.par30Rate * 4)}%` }}
            />
          </div>
          <p className={cn(
            'text-11 font-semibold mt-2',
            metrics.par30Rate < 5 ? 'text-green-600' : metrics.par30Rate < 15 ? 'text-amber-600' : 'text-red-600'
          )}>
            {metrics.par30Rate === 0 ? '✓ No loans at risk' :
             metrics.par30Rate < 5 ? '✓ Healthy (< 5% threshold)' :
             metrics.par30Rate < 15 ? '⚠ Above threshold — review needed' :
             '⚠ Critical — immediate action required'}
          </p>
        </div>

        {/* Outstanding Penalties */}
        <div className="card-premium">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Outstanding Penalties</p>
              <p className="text-11 text-gray-400 mt-0.5">Active manual penalties</p>
            </div>
            <Link href="/reports/penalties" className="text-11 text-indigo-500 hover:underline">View all →</Link>
          </div>
          <span className={cn(
            'text-36 font-bold tabular-nums leading-none',
            metrics.totalPenaltiesOutstanding > 0 ? 'text-amber-600' : 'text-gray-400'
          )}>
            {formatAmount(metrics.totalPenaltiesOutstanding)}
          </span>
          <div className="mt-3">
            {metrics.totalPenaltiesOutstanding > 0
              ? <span className="badge badge-error">Pending collection</span>
              : <span className="badge badge-success">No outstanding penalties</span>}
          </div>
        </div>

        {/* New Loans This Month */}
        <div className="card-premium">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">New Loans</p>
              <p className="text-11 text-gray-400 mt-0.5">Originated this month</p>
            </div>
            <Link href="/reports/officer" className="text-11 text-indigo-500 hover:underline">Officer view →</Link>
          </div>
          <span className="text-36 font-bold tabular-nums leading-none text-indigo-600">
            {metrics.newLoansThisMonth}
          </span>
          <div className="mt-3 flex items-center gap-2">
            {metrics.highRiskLoans > 0 && (
              <span className="badge badge-error flex items-center gap-1">
                <ShieldAlert className="size-3" />{metrics.highRiskLoans} high risk
              </span>
            )}
            <Link href="/loans" className="text-11 text-gray-400 hover:text-indigo-500">View all loans →</Link>
          </div>
        </div>
      </div>

      {/* ── Row 4: Collection rate bar ───────────────────────────────────── */}
      <div className="card-premium mb-7">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-13 font-bold text-gray-700">Monthly Collection Efficiency</p>
            <p className="text-11 text-gray-400">
              {formatAmount(metrics.collectionsThisMonth)} collected of {formatAmount(metrics.totalDisbursed)} total portfolio
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Percent className="size-4 text-gray-400" />
            <span className={cn(
              'text-20 font-bold tabular-nums',
              metrics.collectionRate >= 80 ? 'text-green-600' :
              metrics.collectionRate >= 50 ? 'text-amber-500' : 'text-red-500'
            )}>
              {metrics.collectionRate}%
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700',
              metrics.collectionRate >= 80 ? 'bg-green-500' :
              metrics.collectionRate >= 50 ? 'bg-amber-400' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(100, metrics.collectionRate)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-11 text-gray-400">0%</span>
          <span className="text-11 text-gray-400 font-semibold">Target: 80%</span>
          <span className="text-11 text-gray-400">100%</span>
        </div>
      </div>

      {/* ── Row 5: Quick Actions ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {[
          { label: 'New Loan',        href: '/loans/create',       icon: <CreditCard className="size-4" />,  variant: 'btn-primary' },
          { label: 'Portfolio Report', href: '/reports/portfolio',  icon: <BarChart2 className="size-4" />,   variant: 'btn-secondary' },
          { label: 'Arrears Report',   href: '/reports/arrears',    icon: <AlertCircle className="size-4" />, variant: 'btn-secondary' },
          { label: 'Collections',      href: '/reports/collections', icon: <DollarSign className="size-4" />, variant: 'btn-secondary' },
        ].map(({ label, href, icon, variant }) => (
          <Link key={href} href={href} className={cn(variant, 'flex items-center gap-2 justify-center')}>
            {icon}
            <span>{label}</span>
          </Link>
        ))}
      </div>

      {/* ── Row 6: Recent Loans ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-5">
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