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

  // Calculate total active penalties
  const activePenaltiesTotal = penalties
    .filter(p => p.status === 'Active')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalOutstanding = client.outstandingBalance + activePenaltiesTotal;

  const repaymentRate = client.totalBorrowed > 0
    ? Math.round((totalRepaid / (client.totalBorrowed + (client.totalBorrowed * 0.1))) * 100) // Rough approximation
    : 0;

  const lastPayment = repayments[0];
  const nextDue = loans.filter(l => l.status === 'Active').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];


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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Additional Stats */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
            <div className="flex-shrink-0 p-3 bg-gray-50 rounded-full text-gray-400">
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <p className="text-11 font-bold text-gray-400 uppercase tracking-wider">Last Payment</p>
              <p className="text-14 font-semibold text-gray-900">
                {lastPayment ? new Date(lastPayment.date).toLocaleDateString() : 'None'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
            <div className="p-3 bg-gray-50 rounded-full text-gray-400">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-11 font-bold text-gray-400 uppercase tracking-wider">Next Due Date</p>
              <p className="text-14 font-semibold text-gray-900">
                {nextDue ? new Date(nextDue.due_date).toLocaleDateString() : 'No active loans'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
            <div className="p-3 bg-gray-50 rounded-full text-gray-400">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-11 font-bold text-gray-400 uppercase tracking-wider">Repayment Rate</p>
              <p className="text-14 font-semibold text-emerald-600">{repaymentRate}%</p>
            </div>
          </div>
        </div>

        {/* Small Progress or Chart placeholder */}
        <div className="card-premium p-6 flex flex-col justify-center">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-4">Repayment Health</p>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-emerald-600 bg-emerald-200">
                  On Track
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-emerald-600">
                  {repaymentRate}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-emerald-100">
              <div style={{ width: `${repaymentRate}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
