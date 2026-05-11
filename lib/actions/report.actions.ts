"use server";

import { getLoggedInUser } from "./user.actions";
import {
  getPortfolioSummary,
  getCollectionReport,
  getArrearsReport,
  getCashFlowReport,
  getPenaltySummary,
  getAuditLogReport,
  getLoanStatementData,
} from "../reports/report.queries";
import {
  generateMonthlySnapshot,
  listMonthlyReports,
  getMonthlyReport,
} from "../reports/monthly-engine";
import type { ReportFilters, GenerateMonthlyReportInput } from "../reports/report.types";
import { parseStringify } from "../utils";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    throw new Error("UNAUTHORIZED: Admin or Manager access required.");
  }
  return user;
}

// ─── Live report actions ──────────────────────────────────────────────────────

export async function getPortfolioSummaryAction() {
  await requireAdmin();
  try {
    const data = await getPortfolioSummary();
    return parseStringify(data);
  } catch (error) {
    console.error("[getPortfolioSummaryAction]", error);
    return null;
  }
}

export async function getCollectionReportAction(filters: ReportFilters = {}) {
  await requireAdmin();
  try {
    const data = await getCollectionReport(filters);
    return parseStringify(data);
  } catch (error) {
    console.error("[getCollectionReportAction]", error);
    return null;
  }
}

export async function getArrearsReportAction() {
  await requireAdmin();
  try {
    const data = await getArrearsReport();
    return parseStringify(data);
  } catch (error) {
    console.error("[getArrearsReportAction]", error);
    return null;
  }
}

export async function getCashFlowReportAction(monthsBack = 12) {
  await requireAdmin();
  try {
    const data = await getCashFlowReport(monthsBack);
    return parseStringify(data);
  } catch (error) {
    console.error("[getCashFlowReportAction]", error);
    return null;
  }
}

export async function getPenaltySummaryAction(filters: ReportFilters = {}) {
  await requireAdmin();
  try {
    const data = await getPenaltySummary(filters);
    return parseStringify(data);
  } catch (error) {
    console.error("[getPenaltySummaryAction]", error);
    return null;
  }
}

export async function getAuditLogReportAction(filters: ReportFilters = {}) {
  await requireAdmin();
  try {
    const data = await getAuditLogReport(filters);
    return parseStringify(data);
  } catch (error) {
    console.error("[getAuditLogReportAction]", error);
    return null;
  }
}

// ─── Loan statement (no admin gate — any authenticated user for their loan) ───

export async function getLoanStatementAction(loanId: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("UNAUTHORIZED");
  try {
    const data = await getLoanStatementData(loanId);
    return parseStringify(data);
  } catch (error) {
    console.error("[getLoanStatementAction]", error);
    return null;
  }
}

// ─── Monthly snapshot actions ─────────────────────────────────────────────────

export async function generateMonthlySnapshotAction(input: GenerateMonthlyReportInput) {
  const user = await requireAdmin();
  try {
    const data = await generateMonthlySnapshot({
      ...input,
      generatedBy: `${user.firstName} ${user.lastName}`,
    });
    return parseStringify(data);
  } catch (error: any) {
    console.error("[generateMonthlySnapshotAction]", error);
    return { error: error.message ?? "Failed to generate report." };
  }
}

export async function listMonthlyReportsAction() {
  await requireAdmin();
  try {
    const data = await listMonthlyReports();
    return parseStringify(data);
  } catch (error) {
    console.error("[listMonthlyReportsAction]", error);
    return [];
  }
}

export async function getMonthlyReportAction(year: number, month: number) {
  await requireAdmin();
  try {
    const data = await getMonthlyReport(year, month);
    return parseStringify(data);
  } catch (error) {
    console.error("[getMonthlyReportAction]", error);
    return null;
  }
}
