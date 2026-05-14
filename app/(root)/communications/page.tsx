import HeaderBox from "@/components/HeaderBox";
import { getNotifications } from "@/lib/actions/collections.actions";
import CommunicationsTable from "@/components/CommunicationsTable";
import CommunicationStats from "@/components/details/CommunicationStats";

export default async function CommunicationsPage() {
  // Fetch all notifications (no filters)
  const notifications = await getNotifications({});

  // Calculate global stats
  const stats = {
    totalSent: notifications.length,
    delivered: notifications.filter(n => n.status === 'SENT' || n.status === 'DELIVERED').length,
    failed: notifications.filter(n => n.status === 'FAILED').length,
    byChannel: {
      SMS: notifications.filter(n => n.channel === 'SMS').length,
      WHATSAPP: notifications.filter(n => n.channel === 'WHATSAPP').length,
      EMAIL: notifications.filter(n => n.channel === 'EMAIL').length,
    }
  };

  return (
    <section className="flex flex-col flex-1 w-full p-6 lg:p-8 bg-slate-50/30 gap-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <HeaderBox 
          title="Communication Center"
          subtext="Monitor all outgoing loan notifications, reminders, and delivery statuses."
        />
      </div>

      <div className="animate-fade-in space-y-8">
        {/* Global Analytics Section */}
        <CommunicationStats stats={stats} />

        {/* Global Message Log */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-18 font-bold text-gray-900">Message Audit Trail</h2>
            <span className="text-12 font-medium text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
              Total Logs: {notifications.length}
            </span>
          </div>
          <CommunicationsTable notifications={notifications} />
        </div>
      </div>
    </section>
  );
}
