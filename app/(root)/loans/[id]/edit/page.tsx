import HeaderBox from "@/components/HeaderBox";
import { getLoanById, updateLoan } from "@/lib/actions/loan.actions";
import { getClients } from "@/lib/actions/client.actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EditLoanPage({ params: { id } }: { params: { id: string } }) {
  const loan = await getLoanById(id);
  const clients = await getClients() || [];

  if (!loan) {
    return <div>Loan not found</div>;
  }

  if (loan.status !== 'Pending') {
    return <div>Only pending loans can be edited.</div>;
  }

  const handleUpdateLoan = async (formData: FormData) => {
    "use server";
    
    const clientId = formData.get("clientId") as string;
    const principalAmount = parseFloat(formData.get("principalAmount") as string);
    const interestRate = parseFloat(formData.get("interestRate") as string);
    const interestType = formData.get("interestType") as "Flat" | "Reducing";
    const durationInMonths = parseInt(formData.get("durationInMonths") as string, 10);
    const loanType = formData.get("loanType") as string;

    const updated = await updateLoan(id, {
      clientId,
      principalAmount,
      interestRate,
      interestType,
      durationInMonths,
      loanType
    });

    if (updated) {
      redirect(`/loans/${id}`);
    }
  };

  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Edit Loan Terms"
        subtext={`Correcting terms for loan ${id}`}
      />

      <section className="size-full pt-5">
        <form action={handleUpdateLoan} className="flex flex-col gap-6 max-w-2xl bg-white p-6 rounded-xl border border-gray-200">
          
          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Client</label>
            <select name="clientId" defaultValue={loan.clientId} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none bg-white">
              {clients.map((c: any) => (
                <option key={c.$id} value={c.$id}>{c.firstName} {c.lastName} ({c.nationalId})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Loan Type</label>
            <select name="loanType" defaultValue={loan.loanType} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none bg-white">
              <option value="Emergency Loan">Emergency Loan</option>
              <option value="Long-Term Loan">Long-Term Loan</option>
              <option value="Asset Financing Loan">Asset Financing Loan</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Principal Amount (KES)</label>
            <input type="number" step="0.01" name="principalAmount" defaultValue={loan.principalAmount} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Monthly Interest Rate (%)</label>
              <input type="number" step="0.01" name="interestRate" defaultValue={loan.interestRate} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Interest Type</label>
              <select name="interestType" defaultValue={loan.interestType} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none bg-white">
                <option value="Flat">Flat Rate</option>
                <option value="Reducing">Reducing Balance</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Duration (Months)</label>
            <input type="number" name="durationInMonths" defaultValue={loan.durationInMonths} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
          </div>

          <div className="flex gap-4">
            <button type="submit" className="text-16 flex-1 bg-bank-gradient font-semibold text-white shadow-form rounded-lg py-3 mt-4">
              Update Terms
            </button>
            <Link href={`/loans/${id}`} className="text-16 flex-1 flex items-center justify-center bg-gray-100 font-semibold text-gray-700 border border-gray-200 rounded-lg py-3 mt-4">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </section>
  )
}
