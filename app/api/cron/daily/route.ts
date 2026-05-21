import { NextResponse } from "next/server";
import { autoFlagOverdueLoans } from "@/lib/actions/loan.actions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Check for authorization (Vercel cron secret)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call the airtight database function to update DPD and apply auto penalties
    await autoFlagOverdueLoans();

    return NextResponse.json({ success: true, message: "Daily job completed successfully" });
  } catch (error) {
    console.error("Cron Job Failed:", error);
    return NextResponse.json(
      { success: false, error: "Cron execution failed" },
      { status: 500 }
    );
  }
}
