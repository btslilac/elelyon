import { formatAmount, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, CreditCard, Activity, CalendarCheck, Clock } from "lucide-react";
import type { ClientMetrics } from "@/lib/metrics";

interface ClientOverviewProps {
  client: any;
  clientMetrics: ClientMetrics;
}

export default function ClientOverview({ client, clientMetrics }: ClientOverviewProps) {
  const {
    totalBorrowed,
    totalOutstanding,
    totalExpectedDebt,
    totalRepaid,
    repaymentRate,
    activeLoansCount,
    healthStatus,
    healthMessage,
    healthColor,
    healthBg,
    healthIconBg,
    healthBarBg,
    healthBarContainer,
    lastPaymentDate,
    nextDueDate,
    maxDaysPastDue
  } = clientMetrics || {};

  const formattedLastPayment = lastPaymentDate
    ? new Date(lastPaymentDate).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    : 'None';

  const formattedNextDue = nextDueDate
    ? new Date(nextDueDate).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    : 'None due';

  const metrics = [
    {
      label: "Total Borrowed",
      value: formatAmount(client?.totalBorrowed || totalBorrowed || 0),
      icon: <TrendingUp className="size-4" />,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Outstanding Balance",
      value: formatAmount(totalOutstanding || 0),
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
      value: (activeLoansCount || 0).toString(),
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
                {maxDaysPastDue > 0 && (
                  <p className="text-12 font-semibold text-red-600 mt-1">
                    Days Past Due: {maxDaysPastDue} (DPD)
                  </p>
                )}
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