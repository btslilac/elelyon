import { getLoanById, approveLoan, denyLoan } from "@/lib/actions/loan.actions";
import { getRepaymentsByLoan } from "@/lib/actions/repayment.actions";
import { getPenaltiesByLoan } from "@/lib/actions/penalty.actions";
import { getAuditLogsByLoan } from "@/lib/actions/audit.actions";
import { getClientById } from "@/lib/actions/client.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { cn } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import LoanDetailClient, { ActionPanel } from "@/components/LoanDetailClient";
import HeaderBox from "@/components/HeaderBox";

export default async function LoanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; warn?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [loan, currentUser] = await Promise.all([
    getLoanById(id),
    getLoggedInUser(),
  ]);

  if (!loan) {
    return (
      <section className="home-content">
        <div className="card-premium" style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "#111113" }}>Loan not found</p>
          <p style={{ fontSize: "0.875rem", color: "#9CA3AF", marginTop: "0.5rem" }}>
            The requested loan record does not exist.
          </p>
          <Link href="/loans" className="btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
            Back to Portfolio
          </Link>
        </div>
      </section>
    );
  }

  const [client, repayments, penalties, auditLogs] = await Promise.all([
    getClientById(loan.clientId),
    getRepaymentsByLoan(id),
    getPenaltiesByLoan(id),
    getAuditLogsByLoan(id),
  ]);

  const safeRepayments = repayments || [];
  const safePenalties = penalties || [];
  const safeAuditLogs = auditLogs || [];

  const totalPaid = safeRepayments.reduce(
    (acc: number, rep: Repayment) => acc + (rep.amount || 0),
    0
  );
  const progressPercent = Math.min(100, (totalPaid / (loan.totalPayable || 1)) * 100);

  // Server actions for approve/deny
  const handleApprove = async () => {
    "use server";
    await approveLoan(id);
    revalidatePath(`/loans/${id}`);
    redirect(`/loans/${id}`);
  };

  const handleDeny = async () => {
    "use server";
    await denyLoan(id);
    revalidatePath(`/loans/${id}`);
    redirect(`/loans/${id}`);
  };

  return (
    <section className="home-content animate-fade-in">

      {/* High-Risk Client Banner — shown when loan is flagged or freshly created from a risky client */}
      {(loan.isHighRisk || sp?.warn === 'high_risk') && (
        <div style={{ display: 'flex', gap: '0.875rem', padding: '1rem 1.25rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.875rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#92400E' }}>High-Risk Client — Pending Admin Approval</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#78350F', lineHeight: 1.5 }}>This borrower has an existing Overdue or Defaulted loan. This facility has been flagged and must be reviewed and approved by an admin before disbursement.</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <header className="page-header">
        <HeaderBox
          title={`${client?.firstName} ${client?.lastName}`}
          subtext={
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              <span
                className={cn("badge", {
                  "badge-success": loan.status === "Active",
                  "badge-pending": loan.status === "Pending",
                  "badge-error": loan.status === "Overdue" || loan.status === "Denied" || loan.status === "Defaulted",
                  "badge-completed": loan.status === "Completed",
                })}
              >
                {loan.status}
              </span>
               <span style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 500 }}>
                
                {`Loan No. - ${id.slice(-8).toUpperCase()}`}
              </span>
              
             
              <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>·</span>
              {loan.loanType && (
                <span style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 500 }}>
                  {loan.loanType}
                </span>
              )}
            </div>
          }
        />
        <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
          <Link href="/loans" className="btn-secondary">
            ← Loans
          </Link>
          <Link href={`/loans/${id}/statement`} className="btn-primary">
            Statement
          </Link>
        </div>
      </header>

      {/* 2-column layout: main content + action panel */}
      <div style={{
        display: "grid",
        gap: "1.25rem",
      }}
        className="loan-detail-layout">

        {/* Left: interactive client component (KPI strip + tables + audit) */}
        <div style={{ minWidth: 0 }}>
          <LoanDetailClient
            loan={loan}
            client={client}
            repayments={safeRepayments}
            penalties={safePenalties}
            auditLogs={safeAuditLogs}
            currentUser={currentUser}
            totalPaid={totalPaid}
            progressPercent={progressPercent}
          />
        </div>

        {/* Right: action panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Pending approval buttons handled server-side */}
          {loan.status === "Pending" && (
            <div className="info-card">
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1rem" }}>
                Underwriting Decision
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <form action={handleApprove}>
                  <button type="submit" className="btn-success">
                    APPROVE & DISBURSE
                  </button>
                </form>
                <form action={handleDeny}>
                  <button type="submit" className="btn-danger">
                    DECLINE APPLICATION
                  </button>
                </form>
              </div>
            </div>
          )}

          <ActionPanel
            loan={loan}
            client={client}
            currentUser={currentUser}
            repayments={safeRepayments}
            penalties={safePenalties}
          />
        </div>
      </div>
    </section>
  );
}
