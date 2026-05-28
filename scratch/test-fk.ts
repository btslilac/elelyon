import { createSupabaseAdminClient } from "../lib/supabase";

async function testFK() {
  const supabase = createSupabaseAdminClient();
  console.log("Trying to insert a notification with a non-existent client_id (should fail if FK exists)...");

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      client_id: 'f80e9df1-8e7c-473d-8dfb-b9d9df3c90cb', // Valid UUID format but non-existent client ID
      channel: 'SMS',
      template_type: 'TEST',
      recipient: 'test@example.com',
      message_body: 'Testing FK constraint',
      status: 'PENDING'
    })
    .select();

  if (error) {
    console.log("❌ Insert failed (as expected if constraint exists). Error detail:");
    console.log("Code:", error.code);
    console.log("Message:", error.message);
    console.log("Details:", error.details);
  } else {
    console.log("✅ Success! Wait... the insert succeeded! This means there is NO foreign key constraint from client_id to clients table in the database!");
    // Clean up
    if (data && data[0]) {
      await supabase.from('notifications').delete().eq('id', data[0].id);
      console.log("Cleaned up the test record.");
    }
  }
}

testFK().catch(console.error);
