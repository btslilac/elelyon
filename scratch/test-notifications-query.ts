import { createSupabaseAdminClient } from "../lib/supabase";

async function testNotificationsQuery() {
  const supabase = createSupabaseAdminClient();
  console.log("Running Supabase query for notifications...");
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*, clients(first_name, last_name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ Raw Error Object:", error);
    console.error("❌ Error Message:", error.message);
    console.error("❌ Error Details:", error.details);
    console.error("❌ Error Code:", error.code);
    console.error("❌ Error Hint:", error.hint);
  } else {
    console.log("✅ Success! Fetched notifications count:", data?.length);
    if (data && data.length > 0) {
      console.log("First notification entry:", data[0]);
    }
  }
}

testNotificationsQuery().catch(console.error);
