import { formatAmount, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, CreditCard, Activity, CalendarCheck, Clock } from "lucide-react";

interface ClientOverviewProps {
  client: LMSClient;
  loans: any[];
  repayments: any[];
  penalties: any[];
}



export default function ClientOverview({ client, loans, repayments, penalties }: ClientOverviewProps) {
  const activeLoans = loans.filter(l => l.status === 'Active' || l.status === 'Overdue').length;
  const totalRepaid = repayments.reduce((acc, r) => acc + r.amount, 0);




  const validStatuses = ['Active', 'Overdue', 'Completed', 'Defaulted'];

  // Calculate total outstanding perfectly from the sum of all valid loan balances
  // The backend ledger automatically synchronizes loan.balance with all penalty additions and all repayments.
  const totalOutstanding = loans
    .filter(l => validStatuses.includes(l.status))
    .reduce((acc, l) => acc + (l.balance || 0), 0);
  const totalExpectedDebt = loans
    .filter(l => validStatuses.includes(l.status))
    .reduce((acc, l) => acc + (l.totalPayable || 0), 0)
    + penalties
      .filter(p => p.status !== 'Reversed')
      .reduce((acc, p) => acc + p.amount, 0);

  const repaymentRate = totalExpectedDebt > 0
    ? Math.min(100, Math.round((totalRepaid / totalExpectedDebt) * 100))
    : 0;

  let healthStatus = 'No Loans';
  let healthMessage = 'No loans taken yet.';
  let healthColor = 'text-gray-600';
  let healthBg = 'bg-gray-200';
  let healthIconBg = 'bg-gray-50';
  let healthBarBg = 'bg-gray-500';
  let healthBarContainer = 'bg-gray-100';

  if (loans.length > 0) {
    const firstLoan = [...loans].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
    const isAfterFirstDue = new Date() >= new Date(firstLoan.due_date);
    const hasOverdue = loans.some(l => l.status === 'Overdue');

    if (!isAfterFirstDue && !hasOverdue) {
      healthStatus = 'New';
      healthMessage = 'Your first payment is not due yet.';
      healthColor = 'text-sky-600';
      healthBg = 'bg-sky-200';
      healthIconBg = 'bg-sky-50';
      healthBarBg = 'bg-sky-500';
      healthBarContainer = 'bg-sky-100';
    } else if (hasOverdue) {
      healthStatus = 'Overdue';
      healthMessage = 'You have an overdue payment that needs immediate attention!';
      healthColor = 'text-red-600';
      healthBg = 'bg-red-200';
      healthIconBg = 'bg-red-50';
      healthBarBg = 'bg-red-500';
      healthBarContainer = 'bg-red-100';
    } else {
      if (repaymentRate >= 90) {
        healthStatus = 'Good';
        healthMessage = 'Your repayment rate is excellent!';
        healthColor = 'text-emerald-600';
        healthBg = 'bg-emerald-200';
        healthIconBg = 'bg-emerald-50';
        healthBarBg = 'bg-emerald-500';
        healthBarContainer = 'bg-emerald-100';
      } else if (repaymentRate >= 75) {
        healthStatus = 'On Track';
        healthMessage = 'You are on track with your repayments.';
        healthColor = 'text-blue-600';
        healthBg = 'bg-blue-200';
        healthIconBg = 'bg-blue-50';
        healthBarBg = 'bg-blue-500';
        healthBarContainer = 'bg-blue-100';
      } else if (repaymentRate >= 50) {
        healthStatus = 'Average';
        healthMessage = 'Your repayment rate is average.';
        healthColor = 'text-amber-600';
        healthBg = 'bg-amber-200';
        healthIconBg = 'bg-amber-50';
        healthBarBg = 'bg-amber-500';
        healthBarContainer = 'bg-amber-100';
      } else if (repaymentRate >= 20) {
        healthStatus = 'Needs Improvement';
        healthMessage = 'Your repayment rate needs improvement.';
        healthColor = 'text-orange-600';
        healthBg = 'bg-orange-200';
        healthIconBg = 'bg-orange-50';
        healthBarBg = 'bg-orange-500';
        healthBarContainer = 'bg-orange-100';
      } else {
        healthStatus = 'Bad';
        healthMessage = 'Your repayment rate is poor, please repay your loans in time!';
        healthColor = 'text-red-600';
        healthBg = 'bg-red-200';
        healthIconBg = 'bg-red-50';
        healthBarBg = 'bg-red-500';
        healthBarContainer = 'bg-red-100';
      }
    }
  }

  const lastPayment = repayments[0];
  const nextDue = loans.filter(l => l.status === 'Active').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  const formattedLastPayment = lastPayment
    ? new Date(lastPayment.date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    : 'None';

  const formattedNextDue = nextDue
    ? new Date(nextDue.due_date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    : 'No active loans';


  const metrics = [
    {
      label: "Total Borrowed",
      value: formatAmount(client.totalBorrowed),
      icon: <TrendingUp className="size-4" />,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Outstanding Balance",
      value: formatAmount(totalOutstanding),
      icon: <TrendingDown className="size-4" />,
      color: "text-red-600",
      bg: "bg-red-50"
    },
    {
      label: "Total Repaid",
      value: formatAmount(totalRepaid),
      icon: <CreditCard className="size-4" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      label: "Active Loans",
      value: activeLoans.toString(),
      icon: <Activity className="size-4" />,
      color: "text-orange-600",
      bg: "bg-orange-50"
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div key={idx} className="card-premium p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-12 font-bold text-gray-400 uppercase tracking-widest">{m.label}</p>
              <div className={cn("p-2 rounded-lg", m.bg, m.color)}>
                {m.icon}
              </div>
            </div>
            <h3 className="text-24 font-bold text-gray-900">{m.value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-8">
        {/* Additional Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-premium p-6">
            <div className="flex justify-between items-center gap-4 p-4 bg-white rounded-xl">

              <div>
                <p className="text-11 font-bold text-gray-400 uppercase tracking-wider">Last Payment</p>
                <p className="text-14 font-semibold text-gray-900">
                  {formattedLastPayment}
                </p>
              </div>
              <div className="flex justify-end p-3 bg-gray-50 rounded-full text-gray-400">
                <CalendarCheck className="size-5" />
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex justify-between items-center gap-4 p-4 bg-white rounded-xl ">

              <div>
                <p className="text-11 font-bold text-gray-400 uppercase tracking-wider">Next Due Date</p>
                <p className="text-14 font-semibold text-gray-900">
                  {formattedNextDue}
                </p>
              </div>
              <div className="flex justify-end p-3 bg-gray-50 rounded-full text-gray-400">
                <Clock className="size-5 " />
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center justify-between gap-4 p-4 bg-white rounded-xl">
              <div>
                <p className="text-11 font-bold text-gray-400 uppercase tracking-wider">Repayment Rate</p>
                <p className={cn("text-14 font-semibold", healthColor)}>{repaymentRate}%</p>
              </div>
              <div className={cn("flex justify-end p-3 rounded-full", healthIconBg, healthColor)}>
                <TrendingUp className="size-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Small Progress or Chart placeholder */}
        <div className="card-premium p-6 flex flex-col justify-center">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-4">Repayment Health</p>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className={cn("badge text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full", healthColor, healthBg)}>
                  {healthStatus}
                </span>
              </div>

              <div className="text-right">
                <span className={cn("text-xs font-semibold inline-block", healthColor)}>
                  {repaymentRate}%
                </span>
              </div>
            </div>

            <p className="mb-3 mt-1">
              <span className={cn("text-xs font-medium inline-block", healthColor)}>
                {healthMessage}
              </span>
            </p>

            <div className={cn("overflow-hidden h-2 mb-4 text-xs flex rounded", healthBarContainer)}>
              <div style={{ width: `${repaymentRate}%` }} className={cn("shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500", healthBarBg)}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}