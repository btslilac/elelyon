import HeaderBox from "@/components/HeaderBox";
import { getLoanById, updateLoan } from "@/lib/actions/loan.actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calculator, Calendar, ArrowLeft, Save } from "lucide-react";

export default async function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loan = await getLoanById(id);

  if (!loan) {
    return (
      <section className="home-content">
        <div className="card-premium" style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "#111113" }}>Loan not found</p>
          <Link href="/loans" className="btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
            Back to Portfolio
          </Link>
        </div>
      </section>
    );
  }

  if (loan.status !== "Pending") {
    return (
      <section className="home-content">
        <div className="card-premium" style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "#111113" }}>Cannot Edit</p>
          <p style={{ fontSize: "0.875rem", color: "#9CA3AF", marginTop: "0.5rem" }}>
            Only <strong>Pending</strong> loans can have their terms revised. This loan is currently <strong>{loan.status}</strong>.
          </p>
          <Link href={`/loans/${id}`} className="btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
            ← Back to Loan
          </Link>
        </div>
      </section>
    );
  }

  const handleUpdateLoan = async (formData: FormData) => {
    "use server";

    const principalAmount = parseFloat(formData.get("principalAmount") as string);
    const interestRate = parseFloat(formData.get("interestRate") as string);
    const interestType = formData.get("interestType") as "Flat" | "Reducing";
    const durationInMonths = parseInt(formData.get("durationInMonths") as string, 10);
    const loanType = formData.get("loanType") as string;
    const startDate = formData.get("startDate") as string;

    const updated = await updateLoan(id, {
      principalAmount,
      interestRate,
      interestType,
      durationInMonths,
      loanType,
      ...(startDate && { startDate: new Date(startDate).toISOString() }),
    });

    if (updated) {
      redirect(`/loans/${id}`);
    }
  };

  return (
    <section className="home-content">
      <header className="page-header">
        <HeaderBox
          title="Revise Loan Terms"
          subtext={`Editing pending origination ${id.slice(-8).toUpperCase()}`}
        />
        <Link href={`/loans/${id}`} className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <ArrowLeft className="size-4" />
          Cancel
        </Link>
      </header>

      <form action={handleUpdateLoan} className="flex flex-col gap-6 max-w-2xl">

        {/* Financial Terms */}
        <div className="card-premium p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/5 rounded-lg text-primary">
              <Calculator className="size-5" />
            </div>
            <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Financial Terms</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Loan Product Type</label>
              <div className="relative">
                <select name="loanType" defaultValue={loan.loanType} required className="input-class appearance-none w-full">
                  <option value="Emergency Loan">Emergency Loan</option>
                  <option value="Long-Term Loan">Long-Term Loan</option>
                  <option value="Asset Financing Loan">Asset Financing Loan</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Principal Amount (KES)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">KES</span>
                <input
                  type="number"
                  step="1"
                  name="principalAmount"
                  defaultValue={loan.principalAmount}
                  required
                  className="input-class text-center w-full font-mono font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Monthly Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    name="interestRate"
                    defaultValue={loan.interestRate}
                    required
                    className="input-class pr-10 w-full"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Calculation Method</label>
                <div className="relative">
                  <select name="interestType" defaultValue={loan.interestType} required className="input-class appearance-none w-full">
                    <option value="Flat">Flat Rate</option>
                    <option value="Reducing">Reducing Balance</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="size-3.5" />
                  Tenure
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="durationInMonths"
                    defaultValue={loan.durationInMonths}
                    required
                    className="input-class pr-24 w-full"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Months</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="size-3.5" />
                  Disbursement Date (Optional)
                </label>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={loan.startDate ? loan.startDate.split("T")[0] : ""}
                  className="input-class w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info notice */}
        <div style={{ padding: "0.875rem 1.125rem", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "0.75rem" }}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#92400E" }}>
            ⚡ Interest totals, balance and installment amounts will be automatically recalculated on save.
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/loans/${id}`} className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            Cancel
          </Link>
          <button type="submit" className="btn-submit">
            <Save className="size-4 opacity-70" />
            <span>Save Revised Terms</span>
          </button>
        </div>
      </form>
    </section>
  );
}
