import HeaderBox from "@/components/HeaderBox";
import { getLoanById, approveLoan, denyLoan } from "@/lib/actions/loan.actions";
import { processRepayment, getRepaymentsByLoan } from "@/lib/actions/repayment.actions";
import { getClientById } from "@/lib/actions/client.actions";
import { formatAmount } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loan = await getLoanById(id);

  if (!loan) {
    return <div>Loan not found</div>;
  }

  const client = await getClientById(loan.clientId);
  const repayments = await getRepaymentsByLoan(id) || [];

  const totalPaid = repayments.reduce((acc: number, rep: any) => acc + (rep.amount || 0), 0);
  const progressPercent = Math.min(100, (totalPaid / (loan.totalPayable || 1)) * 100);

  const handleApprove = async () => {
    "use server";
    await approveLoan(id);
    revalidatePath(`/loans/${id}`);
  };

  const handleDeny = async () => {
    "use server";
    await denyLoan(id);
    revalidatePath(`/loans/${id}`);
  };

  const handleRepayment = async (formData: FormData) => {
    "use server";
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string;
    const referenceId = formData.get("referenceId") as string;

    await processRepayment({
      loanId: id,
      amount,
      paymentMethod,
      referenceId,
    });
  };

  return (
    <section className="payment-transfer">
      <HeaderBox
        title={`Loan ${id.slice(-6).toUpperCase()}`}
        subtext={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-12 font-bold border border-blue-100">
              <span className="size-2 rounded-full bg-blue-600 animate-pulse"></span>
              {loan.loanType}
            </div>
            <span className="text-14 text-gray-500 font-medium">Client: <span className="text-gray-900">{client?.firstName} {client?.lastName}</span></span>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider 
              ${loan.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' :
                loan.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                  loan.status === 'Overdue' ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-gray-50 text-gray-700 border border-gray-200'}`}>
              {loan.status}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-5">
        {/* Loan Info */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-chart flex flex-col gap-6 transition-all hover:shadow-md">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <h2 className="text-20 font-bold text-gray-900">Financial Overview</h2>
            {loan.status === 'Pending' && (
              <Link href={`/loans/${id}/edit`} className="text-12 font-bold text-blue-600 px-3 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                EDIT TERMS
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-12 font-bold text-gray-400 uppercase tracking-widest">Principal Amount</p>
              <p className="text-20 font-bold text-gray-900">{formatAmount(loan.principalAmount || 0)}</p>
            </div>
            <div>
              <p className="text-12 font-bold text-gray-400 uppercase tracking-widest">Monthly Rate</p>
              <p className="text-20 font-bold text-gray-900">{loan.interestRate}% <span className="text-12 text-gray-400 font-medium">({loan.interestType})</span></p>
            </div>
            <div>
              <p className="text-12 font-bold text-gray-400 uppercase tracking-widest">Duration</p>
              <p className="text-20 font-bold text-gray-900">{loan.durationInMonths} <span className="text-12 text-gray-400 font-medium">Months</span></p>
            </div>
            <div>
              <p className="text-12 font-bold text-gray-400 uppercase tracking-widest">Total Interest</p>
              <p className="text-20 font-bold text-gray-900">{formatAmount(loan.totalInterest || 0)}</p>
            </div>
            <div>
              <p className="text-12 font-bold text-gray-400 uppercase tracking-widest">Total Payable</p>
              <p className="text-20 font-bold text-blue-600">{formatAmount(loan.totalPayable || 0)}</p>
            </div>
            <div>
              <p className="text-12 font-bold text-gray-400 uppercase tracking-widest">Remaining Balance</p>
              <p className="text-24 font-black text-red-600">{formatAmount(loan.balance || 0)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex justify-between items-end mb-2">
              <p className="text-12 font-bold text-gray-400 uppercase tracking-widest">Repayment Progress</p>
              <p className="text-12 font-bold text-blue-600">{progressPercent.toFixed(1)}% PAID</p>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
              <div
                className="h-full bg-bank-gradient transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-12 font-medium text-gray-500">
              <span>Paid: {formatAmount(totalPaid)}</span>
              <span> {formatAmount(loan.totalPayable)}</span>
            </div>
          </div>

          {loan.status === 'Pending' && (
            <div className="flex gap-4 mt-4">
              <form action={handleApprove} className="flex-1">
                <button type="submit" className="w-full bg-green-600 text-white rounded-xl py-3 font-bold shadow-form hover:bg-green-700 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  APPROVE LOAN
                </button>
              </form>
              <form action={handleDeny} className="flex-1">
                <button type="submit" className="w-full bg-red-50 text-red-600 border border-red-100 rounded-xl py-3 font-bold hover:bg-red-100 transition-all">
                  DENY
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Log Repayment Form */}
        {(loan.status === 'Active' || loan.status === 'Overdue') && (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-chart">
            <h2 className="text-20 font-bold text-gray-900 border-b border-gray-50 pb-4 mb-6">Log Repayment</h2>
            <form action={handleRepayment} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Amount (KES)</label>
                <input type="number" step="0.01" name="amount" max={loan.balance} required placeholder="0.00" className="w-full rounded-xl border border-gray-200 p-3 text-16 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Payment Method</label>
                <select name="paymentMethod" required className="w-full rounded-xl border border-gray-200 p-3 text-16 outline-none bg-white focus:border-blue-500 transition-all">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Reference ID (Optional)</label>
                <input type="text" name="referenceId" placeholder="e.g. MPESA-ABC123" className="w-full rounded-xl border border-gray-200 p-3 text-16 outline-none focus:border-blue-500 transition-all" />
              </div>
              <button type="submit" className="w-full bg-bank-gradient text-white rounded-xl py-4 mt-2 font-bold shadow-form hover:opacity-90 transition-all hover:scale-[1.01] active:scale-[0.99]">
                SUBMIT REPAYMENT
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Repayments Table */}
      <div className="mt-12 flex flex-col gap-4 w-full">
        <h2 className="text-20 font-bold text-gray-900">Repayment History</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-chart">
          <table className="w-full text-sm text-left border-collapse bg-white">
            <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase text-[11px] tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold text-right">Reference ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {repayments.map((rep: any) => (
                <tr key={rep.$id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-600">{new Date(rep.date).toLocaleString()}</td>
                  <td className="px-6 py-4 text-green-600 font-bold">+{formatAmount(rep.amount || 0)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-500">{rep.paymentMethod}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">{rep.referenceId || '-'}</td>
                </tr>
              ))}
              {repayments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">No repayments recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </section>
  )
}
