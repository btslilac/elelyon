import { getLoanById } from "@/lib/actions/loan.actions";
import { getRepaymentsByLoan } from "@/lib/actions/repayment.actions";
import { getPenaltiesByLoan } from "@/lib/actions/penalty.actions";
import { getClientById } from "@/lib/actions/client.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { formatAmount, cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import PrintButton from "@/components/PrintButton";

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [loan, currentUser] = await Promise.all([
    getLoanById(id),
    getLoggedInUser(),
  ]);

  if (!loan) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <p>Loan not found.</p>
        <Link href="/loans">Back to Portfolio</Link>
      </div>
    );
  }

  const [client, repayments, penalties] = await Promise.all([
    getClientById(loan.clientId),
    getRepaymentsByLoan(id),
    getPenaltiesByLoan(id),
  ]);

  const safeRepayments = repayments || [];
  const safePenalties = (penalties || []) as Penalty[];
  const totalPaid = safeRepayments.reduce((a: number, r: Repayment) => a + (r.amount || 0), 0);
  const activePenaltyTotal = safePenalties
    .filter((p) => p.status === "Active")
    .reduce((a, p) => a + p.amount, 0);

  const statementNumber = `STM-${id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  const generatedOn = new Date().toLocaleDateString("en-KE", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // Combine and sort chronological transaction ledger
  type LedgerEntry = {
    date: string;
    type: "Disbursement" | "Repayment" | "Penalty";
    description: string;
    debit: number;
    credit: number;
    balance: number;
  };

  const ledger: LedgerEntry[] = [];

  // Opening disbursement
  if (loan.startDate) {
    ledger.push({
      date: loan.startDate,
      type: "Disbursement",
      description: `Loan disbursed — ${loan.loanType || "Loan"}`,
      debit: loan.totalPayable,
      credit: 0,
      balance: loan.totalPayable,
    });
  }

  // Repayments
  safeRepayments.forEach((r: Repayment) => {
    ledger.push({
      date: r.date,
      type: "Repayment",
      description: `${r.paymentMethod}${r.referenceId ? ` — ${r.referenceId}` : ""}`,
      debit: 0,
      credit: r.amount,
      balance: 0, // computed below
    });
  });

  // Penalties
  safePenalties.forEach((p) => {
    ledger.push({
      date: p.dateApplied,
      type: "Penalty",
      description: `${p.penaltyType}${p.comment ? ` — ${p.comment}` : ""}`,
      debit: p.status === "Active" ? p.amount : 0,
      credit: p.status === "Reversed" ? p.amount : 0,
      balance: 0,
    });
  });

  // Sort chronologically
  ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Running balance
  let runningBalance = 0;
  ledger.forEach((entry) => {
    runningBalance += entry.debit - entry.credit;
    entry.balance = runningBalance;
  });

  return (
    <div className="statement-wrapper">
      {/* Print controls — hidden on print */}
      <div className="no-print" style={{ maxWidth: "860px", margin: "0 auto 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <Link href={`/loans/${id}`} className="btn-secondary" style={{ fontSize: "0.8125rem" }}>
          ← Back to Loan
        </Link>
        <PrintButton />
      </div>

      {/* Statement Document */}
      <div className="statement-page">

        {/* Header */}
        <div className="statement-header">
          {/* LEFT */}
          <div className="statement-company">
            <div className="statement-logo-wrap">
              <Image
                src="/icons/logo.svg"
                width={160}
                height={160}
                alt="El Elyon Logo"
                className="statement-logo-img"
              />

              <div className="statement-company-text">
                <h1 className="statement-brand">EL ELYON</h1>
                <p className="statement-tagline">
                  Credit & Capital Solutions
                </p>
              </div>
            </div>

            <div className="statement-contact-info">
              <p className="statement-contact-text">Patel's, Ondiek Highway, Kisumu, Kenya</p>
              <p className="statement-contact-text">Email: info@elelyon.co.ke | Phone: +254 722 263 192</p>
              <p className="statement-contact-text">Website: www.elelyon.co.ke</p>
            </div>
          </div>

          {/* RIGHT */}
          {/*<div className="statement-meta-card">
            <div className="statement-meta-row">
              <span className="statement-meta-label">Statement</span>
              <span className="statement-meta-data">Loan Statement</span>
            </div>

            <div className="statement-meta-row">
              <span className="statement-meta-label">Reference</span>
              <span className="statement-meta-data mono">
                {statementNumber}
              </span>
            </div>

            <div className="statement-meta-row">
              <span className="statement-meta-label">Generated</span>
              <span className="statement-meta-data">
                {generatedOn}
              </span>
            </div>

            {currentUser && (
              <div className="statement-meta-row">
                <span className="statement-meta-label">Prepared By</span>
                <span className="statement-meta-data">
                  {currentUser.firstName} {currentUser.lastName}
                </span>
              </div>
            )}
          </div>*/}

          {/* PASSPORT PHOTO */}
          <div className="statement-passport-photo">
            {client?.profilePhotoUrl ? (
              <Image
                src={client.profilePhotoUrl}
                width={120}
                height={150}
                alt="Client Portrait"
                className="passport-img"
                priority
              />
            ) : (
              <div className="passport-placeholder">
                <p>No Photo</p>
              </div>
            )}
            <div className="passport-label">CLIENT'S PHOTO</div>
          </div>
        </div>

        <div className="statement-header-divider" />

        {/* Financial Summary Box */}
        <div className="statement-summary-box">
          <div className="statement-summary-item">
            <span className="statement-summary-label">Total Payable</span>
            <span className="statement-summary-value">{formatAmount(loan.totalPayable || 0)}</span>
          </div>
          <div className="statement-summary-item">
            <span className="statement-summary-label">Total Paid</span>
            <span className="statement-summary-value statement-summary-value-success">{formatAmount(totalPaid)}</span>
          </div>
          <div className="statement-summary-item">
            <span className="statement-summary-label">Outstanding Balance</span>
            <span className={cn("statement-summary-value", loan.balance > 0 ? "statement-summary-value-danger" : "statement-summary-value-success")}>
              {formatAmount(loan.balance || 0)}
            </span>
          </div>
          <div className="statement-summary-item">
            <span className="statement-summary-label">Penalty Accrued</span>
            <span className={cn("statement-summary-value", activePenaltyTotal > 0 ? "statement-summary-value-danger" : "")}>
              {formatAmount(loan.penaltyAccrued || 0)}
            </span>
          </div>
        </div>

        {/* Client Information */}
        <div className="statement-section">
          <p className="statement-section-title">Borrower Information</p>
          <div className="statement-grid">
            <div className="statement-field">
              <span className="statement-field-label">Full Name</span>
              <span className="statement-field-value">{client?.firstName} {client?.lastName}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Phone</span>
              <span className="statement-field-value">{client?.phone || "—"}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">National ID</span>
              <span className="statement-field-value">{client?.nationalId || "—"}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Email</span>
              <span className="statement-field-value">{client?.email || "—"}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Loan ID</span>
              <span className="statement-field-value" style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.02em" }}>
                {id.slice(-8).toUpperCase()}
              </span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Loan Status</span>
              <span className={cn("statement-field-value", {
                "kpi-value-success": loan.status === "Active" || loan.status === "Completed",
                "kpi-value-warning": loan.status === "Pending",
                "kpi-value-danger": loan.status === "Overdue" || loan.status === "Denied",
              })}>
                {loan.status}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Guarantor Details */}
        {(loan.securities || loan.guarantorName) && (
          <div className="statement-section">
            <p className="statement-section-title">Security & Guarantor Details</p>
            <div className="statement-grid">
              {loan.securities && (
                <div className="statement-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="statement-field-label">Collateral / Securities</span>
                  <span className="statement-field-value">{loan.securities}</span>
                </div>
              )}
              {loan.guarantorName && (
                <div className="statement-field">
                  <span className="statement-field-label">Guarantor Name</span>
                  <span className="statement-field-value">{loan.guarantorName}</span>
                </div>
              )}
              {loan.guarantorPhone && (
                <div className="statement-field">
                  <span className="statement-field-label">Guarantor Phone</span>
                  <span className="statement-field-value">{loan.guarantorPhone || "—"}</span>
                </div>
              )}
              {loan.guarantorId && (
                <div className="statement-field">
                  <span className="statement-field-label">Guarantor ID</span>
                  <span className="statement-field-value">{loan.guarantorId || "—"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loan Terms */}
        <div className="statement-section">
          <p className="statement-section-title">Loan Terms</p>
          <div className="statement-grid">
            <div className="statement-field">
              <span className="statement-field-label">Principal</span>
              <span className="statement-field-value">{formatAmount(loan.principalAmount || 0)}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Interest Rate</span>
              <span className="statement-field-value">{loan.interestRate}% / month</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Duration</span>
              <span className="statement-field-value">{loan.durationInMonths} months</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Interest Type</span>
              <span className="statement-field-value">{loan.interestType}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Total Interest</span>
              <span className="statement-field-value">{formatAmount(loan.totalInterest || 0)}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Loan Type</span>
              <span className="statement-field-value">{loan.loanType || "—"}</span>
            </div>
            {loan.startDate && (
              <div className="statement-field">
                <span className="statement-field-label">Disbursement Date</span>
                <span className="statement-field-value">
                  {new Date(loan.startDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            )}
            {loan.dueDate && (
              <div className="statement-field">
                <span className="statement-field-label">Due Date</span>
                <span className="statement-field-value">
                  {new Date(loan.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Ledger */}
        <div className="statement-section">
          <p className="statement-section-title">Transaction History</p>
          <table className="statement-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Debit (KES)</th>
                <th style={{ textAlign: "right" }}>Credit (KES)</th>
                <th style={{ textAlign: "right" }}>Balance (KES)</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#9CA3AF", padding: "2rem" }}>
                    No transactions recorded.
                  </td>
                </tr>
              )}
              {ledger.map((entry, idx) => (
                <tr key={idx}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(entry.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                      color: entry.type === "Repayment" ? "#047857" : entry.type === "Penalty" ? "#B91C1C" : "#1D4ED8",
                    }}>
                      {entry.type}
                    </span>
                  </td>
                  <td style={{ color: "#374151" }}>{entry.description}</td>
                  <td className={entry.debit > 0 ? "statement-table-debit" : ""} style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {entry.debit > 0 ? entry.debit.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                  <td className={entry.credit > 0 ? "statement-table-credit" : ""} style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {entry.credit > 0 ? entry.credit.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: entry.balance > 0 ? "#B91C1C" : "#047857" }}>
                    {entry.balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Penalty Summary */}
        {safePenalties.length > 0 && (
          <div className="statement-section">
            <p className="statement-section-title">Penalty Register</p>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Date Applied</th>
                  <th>Penalty Type</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Applied By</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {safePenalties.map((p) => (
                  <tr key={p.$id} style={{ opacity: p.status === "Reversed" ? 0.55 : 1 }}>
                    <td>{new Date(p.dateApplied).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td style={{ fontWeight: 600 }}>{p.penaltyType}</td>
                    <td className="statement-table-debit" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {p.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </td>
                    <td>{p.appliedBy}</td>
                    <td style={{ color: "#9CA3AF" }}>{p.comment || "—"}</td>
                    <td style={{ fontWeight: 700, color: p.status === "Active" ? "#B91C1C" : "#9CA3AF", fontSize: "0.75rem" }}>
                      {p.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Signature */}
        <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #E5E7EB", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2.5rem" }}>
              Authorized Signature
            </p>
            <div style={{ borderTop: "1px solid #111113", paddingTop: "0.375rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>
                {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Finance Officer"}
              </p>
              <p style={{ fontSize: "0.6875rem", color: "#9CA3AF" }}>El Elyon Credit & Capital Solutions</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
              Disclaimer
            </p>
            <p style={{ fontSize: "0.6875rem", color: "#9CA3AF", lineHeight: 1.6, maxWidth: "280px", marginLeft: "auto" }}>
              This statement is auto-generated and is accurate as of the generation date. For disputes, contact your account manager.
            </p>
          </div>
        </div>

        {/* Footer Tagline */}
        <div style={{ marginTop: "2.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", fontStyle: "italic", color: "#6B7280", fontWeight: 500 }}>
            "Your financial partner in times of need."
          </p>
        </div>
      </div>
    </div>
  );
}
