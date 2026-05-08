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
    <section className="home-content">
      <HeaderBox 
        title="Loan Origination"
        subtext="Initiate a new credit facility for a verified borrower."
      />

      <section className="flex-1 pt-4">
        <form action={handleCreateLoan} className="flex flex-col gap-8 max-w-2xl card-premium">
          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Borrower Selection</label>
              <select name="clientId" required className="input-class appearance-none">
                <option value="">-- Select Client Profile --</option>
                {clients.map((c: any) => (
                  <option key={c.$id} value={c.$id}>{c.firstName} {c.lastName} ({c.nationalId})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Loan Product Type</label>
              <select name="loanType" required className="input-class appearance-none">
                <option value="Emergency Loan">Emergency Loan</option>
                <option value="Long-Term Loan">Long-Term Loan</option>
                <option value="Asset Financing Loan">Asset Financing Loan</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Principal Amount (KES)</label>
              <input type="number" step="0.01" name="principalAmount" required placeholder="50,000.00" className="input-class" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Monthly Rate (%)</label>
                <input type="number" step="0.01" name="interestRate" required placeholder="5.00" className="input-class" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Calculation Method</label>
                <select name="interestType" required className="input-class appearance-none">
                  <option value="Flat">Flat Rate</option>
                  <option value="Reducing">Reducing Balance</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Tenure (Months)</label>
              <input type="number" name="durationInMonths" required placeholder="12" className="input-class" />
            </div>
          </div>

          <button type="submit" className="bg-primary text-white font-bold h-12 rounded-xl shadow-premium hover:bg-primary/90 transition-all active:scale-[0.98] mt-4">
            Originate Loan
          </button>
        </form>
      </section>
    </section>
  )
}
