import HeaderBox from "@/components/HeaderBox";
import { createLoan } from "@/lib/actions/loan.actions";
import { getClients } from "@/lib/actions/client.actions";
import { redirect } from "next/navigation";

export default async function CreateLoanPage() {
  const clients = await getClients() || [];

  const handleCreateLoan = async (formData: FormData) => {
    "use server";
    
    const clientId = formData.get("clientId") as string;
    const principalAmount = parseFloat(formData.get("principalAmount") as string);
    const interestRate = parseFloat(formData.get("interestRate") as string);
    const interestType = formData.get("interestType") as "Flat" | "Reducing";
    const durationInMonths = parseInt(formData.get("durationInMonths") as string, 10);
    const loanType = formData.get("loanType") as string;

    const loan = await createLoan({
      clientId,
      principalAmount,
      interestRate,
      interestType,
      durationInMonths,
      loanType
    });

    if (loan) {
      redirect(`/loans/${loan.$id}`);
    }
  };

  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Create New Loan"
        subtext="Originate a new loan for an existing client."
      />

      <section className="size-full pt-5">
        <form action={handleCreateLoan} className="flex flex-col gap-6 max-w-2xl bg-white p-6 rounded-xl border border-gray-200">
          
          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Select Client</label>
            <select name="clientId" required className="w-full rounded-lg border border-gray-300 p-3 text-16 placeholder:text-16 outline-none bg-white">
              <option value="">-- Choose Client --</option>
              {clients.map((c: any) => (
                <option key={c.$id} value={c.$id}>{c.firstName} {c.lastName} ({c.nationalId})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Loan Type</label>
            <select name="loanType" required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none bg-white">
              <option value="Emergency Loan">Emergency Loan</option>
              <option value="Long-Term Loan">Long-Term Loan</option>
              <option value="Asset Financing Loan">Asset Financing Loan</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Principal Amount (KES)</label>
            <input type="number" step="0.01" name="principalAmount" required placeholder="e.g. 5000" className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Monthly Interest Rate (%)</label>
              <input type="number" step="0.01" name="interestRate" required placeholder="e.g. 5" className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Interest Type</label>
              <select name="interestType" required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none bg-white">
                <option value="Flat">Flat Rate</option>
                <option value="Reducing">Reducing Balance</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Duration (Months)</label>
            <input type="number" name="durationInMonths" required placeholder="e.g. 12" className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
          </div>

          <button type="submit" className="text-16 w-full bg-bank-gradient font-semibold text-white shadow-form rounded-lg py-3 mt-4">
            Originate Loan
          </button>
        </form>
      </section>
    </section>
  )
}
