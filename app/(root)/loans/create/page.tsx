import HeaderBox from "@/components/HeaderBox";
import { createLoan } from "@/lib/actions/loan.actions";
import { getClients } from "@/lib/actions/client.actions";
import { redirect } from "next/navigation";
import { ArrowRight, UserCheck, Briefcase, Calculator, Calendar, ShieldCheck, FileText } from "lucide-react";

export default async function CreateLoanPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const clients = await getClients() || [];

  const handleCreateLoan = async (formData: FormData) => {
    "use server";

    const clientId = formData.get("clientId") as string;
    const principalAmount = parseFloat(formData.get("principalAmount") as string);
    const interestRate = parseFloat(formData.get("interestRate") as string);
    const interestType = formData.get("interestType") as "Flat" | "Reducing";
    const durationInMonths = parseInt(formData.get("durationInMonths") as string, 10);
    const loanType = formData.get("loanType") as string;
    const startDate = formData.get("startDate") as string;
    const securities = formData.get("securities") as string;
    const guarantorName = formData.get("guarantorName") as string;
    const guarantorPhone = formData.get("guarantorPhone") as string;
    const guarantorId = formData.get("guarantorId") as string;
    const documentFile = formData.get("documentFile") as File | null;

    const result = await createLoan({
      clientId,
      principalAmount,
      interestRate,
      interestType,
      durationInMonths,
      loanType,
      startDate: startDate || undefined,
      securities: securities || undefined,
      guarantorName: guarantorName || undefined,
      guarantorPhone: guarantorPhone || undefined,
      guarantorId: guarantorId || undefined,
      documentFile: documentFile || undefined
    });

    if (result && 'error' in result && result.error === 'CREDIT_REJECTED') {
      redirect(`/loans/create?error=credit_rejected`);
    } else if (result && '$id' in result) {
      redirect(`/loans/${result.$id}`);
    }
  };

  return (
    <section className="home-content">
      <header className="mb-6">
        <HeaderBox
          title="Loan Origination"
          subtext="Initiate a new credit facility for a verified borrower."
        />
      </header>

      {params?.error === 'credit_rejected' && (
        <div style={{ display: 'flex', gap: '0.875rem', padding: '1rem 1.25rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.875rem', marginBottom: '1.5rem' }}>
          <div style={{ flexShrink: 0, width: '2rem', height: '2rem', background: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B91C1C' }}>
            ⛔
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#B91C1C' }}>Action Denied — High-Risk Client</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#991B1B', lineHeight: 1.5 }}>This client currently has an active Overdue or Defaulted loan. System policy blocks new originations until their credit record is cleared.</p>
          </div>
        </div>
      )}

      <section className="flex-1">
        <form action={handleCreateLoan} className="flex flex-col gap-8 max-w-3xl">

          {/* Client & Product Section */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <Briefcase className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Facility Details</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <UserCheck className="size-3.5" />
                  Borrower Selection
                </label>
                <div className="relative">
                  <select name="clientId" required className="input-class appearance-none w-full">
                    <option value="">-- Select Verified Client --</option>
                    {clients.map((c: any) => (
                      <option key={c.$id} value={c.$id}>{c.firstName} {c.lastName} ({c.nationalId})</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Loan Product Type</label>
                <div className="relative">
                  <select name="loanType" required className="input-class appearance-none w-full">
                    <option value="Emergency Loan">Emergency Loan</option>
                    <option value="Long-Term Loan">Long-Term Loan</option>
                    <option value="Asset Financing Loan">Asset Financing Loan</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Terms Section */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <Calculator className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Financial Terms</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Principal Amount (KSH)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">KSH</span>
                  <input type="number" step="1" name="principalAmount" required placeholder="50,000.00" className="input-class text-center w-full font-mono font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Monthly Rate (%)</label>
                  <div className="relative">
                    <input type="number" step="0.01" name="interestRate" required placeholder="5.00" className="input-class pr-10 w-full" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Calculation Method</label>
                  <div className="relative">
                    <select name="interestType" required className="input-class appearance-none w-full">
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
                    <input type="number" name="durationInMonths" required placeholder="12" className="input-class pr-24 w-full" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Months</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="size-3.5" />
                    Disbursement Date (Optional)
                  </label>
                  <div className="relative">
                    <input type="date" name="startDate" className="input-class w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Mitigation Section */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Risk Mitigation & Security</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="size-3.5" />
                    Securities & Collateral Description
                  </label>
                  <textarea
                    name="securities"
                    rows={3}
                    placeholder="e.g. Nissan Note Logbook - KDG 123X, Title Deed 4455"
                    className="input-class w-full py-3 resize-none"
                  ></textarea>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="size-3.5" />
                    Physical Document Upload (Optional)
                  </label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center text-center">
                    <input
                      type="file"
                      name="documentFile"
                      accept=".pdf,image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileText className="size-6 text-gray-400 mb-2" />
                    <p className="text-14 font-medium text-gray-700">Click to upload document</p>
                    <p className="text-12 text-gray-500 mt-1">PDF or Images up to 10MB</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-14 font-semibold text-gray-800 mb-4">Guarantor Information (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Full Name</label>
                    <input type="text" name="guarantorName" placeholder="Jane Doe" className="input-class w-full" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Phone Number</label>
                    <input type="text" name="guarantorPhone" placeholder="+254..." className="input-class w-full" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">National ID</label>
                    <input type="text" name="guarantorId" placeholder="12345678" className="input-class w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-submit">
              <span>Originate Facility</span>
              <ArrowRight className="size-4 opacity-70" />
            </button>
          </div>
        </form>
      </section>
    </section>
  )
}
