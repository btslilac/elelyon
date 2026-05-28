"use client";

import { Download } from "lucide-react";
import {
  downloadPortfolioPdf,
  downloadCollectionsPdf,
  downloadArrearsPdf,
  downloadCashFlowPdf,
  downloadPenaltiesPdf,
  downloadAuditLogPdf,
  downloadMonthlyReportPdf,
  downloadLoanStatementPdf,
} from "@/lib/reports/pdf-generator";

export type PdfReportType =
  | "portfolio"
  | "collections"
  | "arrears"
  | "cashflow"
  | "penalties"
  | "audit"
  | "monthly"
  | "statement"
  | "income"
  | "par"
  | "officer";

interface PdfExportButtonProps {
  reportType: PdfReportType;
  data: any;
  label?: string;
  className?: string;
}

const generators: Record<PdfReportType, (data: any) => void> = {
  portfolio:   downloadPortfolioPdf,
  collections: downloadCollectionsPdf,
  arrears:     downloadArrearsPdf,
  cashflow:    downloadCashFlowPdf,
  penalties:   downloadPenaltiesPdf,
  audit:       downloadAuditLogPdf,
  monthly:     downloadMonthlyReportPdf,
  statement:   downloadLoanStatementPdf,
  // New reports — PDF generation can be added to pdf-generator.ts later
  income:  (data) => console.log("Income PDF export", data),
  par:     (data) => console.log("PAR PDF export", data),
  officer: (data) => console.log("Officer PDF export", data),
};

export default function PdfExportButton({
  reportType,
  data,
  label = "Download PDF",
  className,
}: PdfExportButtonProps) {
  const handleClick = () => {
    if (!data) return;
    generators[reportType](data);
  };

  return (
    <button
      onClick={handleClick}
      className={className ?? "btn-secondary flex items-center gap-2"}
    >
      <Download className="size-4" />
      <span>{label}</span>
    </button>
  );
}
