import { createSupabaseAdminClient } from "../lib/supabase";

async function checkNotificationsTable() {
  const supabase = createSupabaseAdminClient();
  console.log("Checking notifications table schema...");

  // 1. Let's try to query notifications table directly without relationship
  const { data: directData, error: directError } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);

  if (directError) {
    console.error("❌ Error fetching from notifications table:", directError.message);
  } else {
    console.log("✅ Success! Fetched from notifications table directly. Columns available in first row:");
    if (directData && directData.length > 0) {
      console.log(Object.keys(directData[0]));
      console.log("First row data:", directData[0]);
    } else {
      console.log("(Table is empty, let's query the columns metadata)");
    }
  }

  // 2. Let's use RPC or raw SQL metadata via a standard request if we can, 
  // or check if we can query some database information.
  // Wait, let's run a query that checks what tables are in the public schema.
  // We can select from pg_catalog if we have permissions or we can run custom check.
}

checkNotificationsTable().catch(console.error);
