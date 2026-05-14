'use client';

import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Mail, Phone, CheckCircle2, XCircle, Clock, Send, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  channel: string;
  template_type: string;
  recipient: string;
  message_body: string;
  status: string;
  sent_at: string;
  error_message?: string;
  created_at: string;
}

interface CommunicationTimelineProps {
  notifications: Notification[];
}

export default function CommunicationTimeline({ notifications }: CommunicationTimelineProps) {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <MessageSquare className="size-8 text-gray-300 mb-2" />
        <p className="text-14 text-gray-500">No communication history found.</p>
      </div>
    );
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL': return <Mail className="size-4" />;
      case 'WHATSAPP': return <MessageSquare className="size-4" />;
      case 'SMS': return <Phone className="size-4" />;
      default: return <Send className="size-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 text-11 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <CheckCircle2 className="size-3" /> Delivered
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-11 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
            <XCircle className="size-3" /> Failed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-11 font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
            <Clock className="size-3" /> Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-11 font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-16 font-semibold text-gray-900 tracking-tight flex items-center gap-2">
        <MessageSquare className="size-5 text-gray-400" />
        Communication History
      </h3>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-100">
        {notifications.map((notif) => (
          <div key={notif.id} className="relative flex items-start gap-6 group">
            {/* Icon Dot */}
            <div className={cn(
              "absolute left-0 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-white z-10 transition-all",
              notif.status === 'FAILED' ? "text-red-500 border-red-100" : "text-blue-500 border-blue-100"
            )}>
              {getChannelIcon(notif.channel)}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1 ml-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <p className="text-14 font-bold text-gray-900 uppercase tracking-tight">
                    {notif.template_type.replace(/_/g, ' ')}
                  </p>
                  {getStatusBadge(notif.status)}
                </div>
                <time className="text-12 text-gray-400 font-medium whitespace-nowrap">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </time>
              </div>

              <div className="card-premium p-4 bg-gray-50/50 border-gray-100">
                <p className="text-13 text-gray-600 leading-relaxed italic">
                  "{notif.message_body}"
                </p>
                
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-11 text-gray-400">
                    <span className="font-bold uppercase">{notif.channel}</span>
                    <span>•</span>
                    <span>{notif.recipient}</span>
                  </div>
                  
                  {notif.status === 'FAILED' && (
                    <div className="flex items-center gap-1 text-11 text-red-500 font-medium">
                      <ShieldAlert className="size-3" />
                      {notif.error_message || 'Provider rejected'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
