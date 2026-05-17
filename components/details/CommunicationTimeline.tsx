'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  MessageCircle,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ShieldAlert,
  Search,
} from 'lucide-react';
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

function extractTextFromHtml(htmlString: string): string {
  if (!htmlString) return '';

  if (!htmlString.includes('<html') && !htmlString.includes('<body')) {
    return htmlString;
  }

  try {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    return 'Error parsing email content...';
  }
}

function getChannelIcon(channel: string) {
  switch (channel) {
    case 'EMAIL':
      return <Mail className="size-4.5" />;
    case 'WHATSAPP':
      return <MessageCircle className="size-4.5" />;
    case 'SMS':
      return <Phone className="size-4.5" />;
    default:
      return <Send className="size-4.5" />;
  }
}

function getChannelStyles(channel: string) {
  switch (channel) {
    case 'EMAIL':
      return {
      
        icon: 'text-sky-600',
        ring: 'ring-sky-100',
        bg: 'bg-sky-50/80',
        border: 'border-sky-100/50',
      };
    case 'WHATSAPP':
      return {
      
        icon: 'text-emerald-600',
        ring: 'ring-emerald-100',
        bg: 'bg-emerald-50/80',
        border: 'border-emerald-100/50',
      };
    case 'SMS':
      return {
        icon: 'text-violet-600',
        ring: 'ring-violet-100',
        bg: 'bg-violet-50/80',
        border: 'border-violet-100/50',
      };
    default:
      return {
        icon: 'text-gray-600',
        ring: 'ring-gray-200',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
      };
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'SENT':
    case 'DELIVERED':
      return (
        <div>
          <div className="mt-3 flex items-center gap-2 translate-x-6">
            <span className="badge badge-success gap-2 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-emerald-700 shadow-lg">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            DELIVERED</span>
          </div>
        </div>

      );
    case 'FAILED':
      return (
        <div className="mt-3 flex items-center gap-2 translate-x-6">
          <span className="badge inline-flex items-center gap-1.5 rounded-full border border-red-200/60 bg-red-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-red-700 shadow-sm">
            <XCircle className="size-3.5 text-red-500" />
            FAILED
          </span>
        </div>
      );
    case 'PENDING':
      return (
        <div className="mt-3 flex items-center gap-2 translate-x-6">
          <span className="badge inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-amber-700 shadow-sm">
            <Clock className="size-3.5 text-amber-500" />
            PENDING
          </span>
        </div>
      );
    default:
      return (
        <div className="mt-3 flex items-center gap-2 translate-x-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-gray-600 shadow-sm">
            {status.toUpperCase()}
          </span>
        </div>
      );
  }
}

export default function CommunicationTimeline({
  notifications,
}: CommunicationTimelineProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 pb-20 rounded-3xl border border-dashed border-gray-200 bg-gray-50/40 px-8 py-20 text-center shadow-sm">
        <br />
        <div className="pt-20 pb-20 mb-5 flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/50">
          <MessageSquare className="size-6 text-gray-400" />
        </div>
        <h3 className="text-16 font-semibold tracking-tight text-gray-900">No communication history</h3>
        <p className="mt-2 max-w-sm text-14 leading-relaxed text-gray-500">
          Messages, emails, and alerts sent to this client will appear perfectly organized here.
        </p>
        <br/>
      </div>
    );
  }

  const filteredNotifications = notifications.filter((notif) =>
    [notif.message_body, notif.template_type, notif.channel]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 pt-6">
      {/* Toolbar */}
      <div className="p-4" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50/80 text-blue-600 ring-1 ring-blue-100/50 shadow-sm">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <h2 className="text-16 font-bold tracking-tight text-gray-900">Communication History</h2>
            <p className="text-13 font-medium text-gray-500">{notifications.length} message{notifications.length !== 1 && 's'} sent</p>
          </div>
        </div>

        <div className="relative w-full sm:max-w-xs shadow-lg">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="  Search messages..."
            value=  {searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 h-10 w-full rounded-xl border border-gray-200/80 bg-white left-3.5 text-14 font-medium text-gray-700 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </div>

      {/* Timeline */}
      {filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 px-6 py-12 text-center">
          <p className="text-14 text-gray-500">
            No messages matching <span className="font-semibold text-gray-700">"{searchQuery}"</span>
          </p>
        </div>
      ) : (
        <div className="relative space-y-8 before:absolute before:inset-y-3 before:left-[1.375rem] before:w-[2px] before:bg-gradient-to-b before:from-gray-200 before:via-gray-200/50 before:to-transparent">
          {filteredNotifications.map((notif) => {
            const isFailed = notif.status === 'FAILED';
            const cleanMessage = extractTextFromHtml(notif.message_body);
            const channelStyles = getChannelStyles(notif.channel);

            const formattedDate = notif.sent_at || notif.created_at
              ? new Date(notif.sent_at || notif.created_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
              : 'N/A';

            return (
              <div key={notif.id} className="group relative flex gap-6">
                {/* Node - Perfectly centered on the 2px line (size-11 = 44px, center is 22px = 1.375rem) */}
                <div
                  className={cn(
                    'relative z-10 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md',
                    channelStyles.ring,
                    channelStyles.icon
                  )}
                >
                  {getChannelIcon(notif.channel)}

                </div>


                {/* Card */}

                <div className="flex-4 overflow-wrap rounded-2xl border border-gray-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/40">
                  {/* Card header */}
                  <div className="h-4" />
                  <div className="flex flex-row sm:flex-row sm:items-start justify-between gap-4 px-6 pt-5">
                 
                  
                    <div className="flex flex-nowrap items-center gap-3">
                      <span
                        className={cn(
                          'badge inline-flex items-center rounded-lg border px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wide shadow-lg translate-x-5',
                          channelStyles.bg,
                          channelStyles.icon,
                          channelStyles.border
                        )}
                      >
                        {notif.channel}
                      </span>
                      {getStatusBadge(notif.status)}
                    </div>
                     <time className="min-w-0 truncate text-12 font-medium text-gray-500 text-right -translate-x-4">
                    {formattedDate}    
                     <br/>{notif.sent_at || notif.created_at ? formatDistanceToNow(new Date(notif.sent_at || notif.created_at), { addSuffix: true }) : ''}
                  </time>
                  </div>

                  {/* Template name */}
                  <div className="px-6 pt-3 translate-x-4.5">
                    <div className="h-2" />
                    <h3 className="text-16 font-bold tracking-tight text-gray-900">
                      {(notif.template_type || 'Unknown').replace(/_/g, ' ')}
                    </h3>
                  </div>

                  {/* Message body */}
                  <div className="mx-6 mt-4 mb-5 rounded border border-gray-100 bg-gray-50/50 p-4 transition-colors duration-300 group-hover:bg-gray-50/80 translate-x-2 w-[calc(100%-32px)]">
                    <p
                      className="line-clamp-20 wrap-break-words text-13 font-medium leading-relaxed text-gray-600  translate-x-4 w-[calc(100%-16px)]"
                      title={cleanMessage}
                    >
                      {cleanMessage}
                    </p>
                  </div>
                  <div className="h-4" />

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/30 px-6 py-3.5">
                  <p className="min-w-0 truncate text-12 font-medium text-gray-500 translate-x-4">
                  <br />
                      Sent to:{' '}
                      <span className="font-bold text-gray-700">{notif.recipient}</span>
                    </p>
                    
                    

                    {isFailed && (
                      <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200/60 bg-red-50 px-3 text-12 font-bold text-red-600 shadow-sm">
                        <ShieldAlert className=" size-4 shrink-0 text-red-500" />
                        <span className="truncate max-w-[200px]" title={notif.error_message}>
                          {notif.error_message || 'Provider rejected message'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="h-4" />
                </div>
                <div className="h-4" />
              </div>

            );
            <div className="h-4" />
          })}
        </div>

      )}<div className="h-4" />
    </div>
  ); <div className="h-4" />
}