import { getNotifications } from "../lib/actions/collections.actions";

async function testGetNotifications() {
  console.log("Testing getNotifications() function...");
  const data = await getNotifications({});
  console.log("✅ getNotifications returned data count:", data.length);
  if (data.length > 0) {
    console.log("Sample notification record:", data[0]);
  }
}

testGetNotifications().catch(console.error);
