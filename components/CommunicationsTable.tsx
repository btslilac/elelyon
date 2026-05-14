'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MessageSquare, Mail, Phone, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CommunicationsTableProps {
  notifications: any[];
}

export default function CommunicationsTable({ notifications }: CommunicationsTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return <CheckCircle className="size-3 text-emerald-500" />;
      case 'FAILED':
        return <XCircle className="size-3 text-red-500" />;
      default:
        return <Clock className="size-3 text-amber-500" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="size-4 text-blue-500" />;
      case 'WHATSAPP':
        return <MessageSquare className="size-4 text-emerald-500" />;
      case 'SMS':
        return <Phone className="size-4 text-amber-500" />;
      default:
        return <MessageSquare className="size-4 text-gray-400" />;
    }
  };

  return (
    <div className="card-premium overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="border-none hover:bg-transparent">
            <TableHead className="text-11 font-bold text-gray-400 uppercase tracking-widest py-4">Recipient</TableHead>
            <TableHead className="text-11 font-bold text-gray-400 uppercase tracking-widest py-4">Channel</TableHead>
            <TableHead className="text-11 font-bold text-gray-400 uppercase tracking-widest py-4">Type</TableHead>
            <TableHead className="text-11 font-bold text-gray-400 uppercase tracking-widest py-4">Status</TableHead>
            <TableHead className="text-11 font-bold text-gray-400 uppercase tracking-widest py-4">Date</TableHead>
            <TableHead className="text-11 font-bold text-gray-400 uppercase tracking-widest py-4">Loan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((notif) => (
            <TableRow key={notif.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
              <TableCell className="py-4">
                <div className="flex flex-col">
                  <span className="text-14 font-semibold text-gray-900">{notif.recipient}</span>
                  {notif.client_id && (
                    <Link href={`/clients/${notif.client_id}`} className="text-12 text-blue-600 hover:underline">
                      View Profile
                    </Link>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center gap-2">
                  {getChannelIcon(notif.channel)}
                  <span className="text-12 font-medium text-gray-700 uppercase tracking-tighter">{notif.channel}</span>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <Badge variant="outline" className="text-10 font-bold bg-slate-100 text-slate-600 border-none uppercase">
                  {notif.template_type.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(notif.status)}
                  <span className={cn(
                    "text-12 font-bold uppercase tracking-tight",
                    notif.status === 'SENT' || notif.status === 'DELIVERED' ? "text-emerald-600" :
                    notif.status === 'FAILED' ? "text-red-600" : "text-amber-600"
                  )}>
                    {notif.status}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex flex-col">
                  <span className="text-13 font-medium text-gray-700">
                    {format(new Date(notif.created_at), 'MMM dd, yyyy')}
                  </span>
                  <span className="text-11 text-gray-400">
                    {format(new Date(notif.created_at), 'hh:mm a')}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-4">
                {notif.loan_id ? (
                  <Link href={`/loans/${notif.loan_id}`} className="text-12 text-blue-600 hover:underline font-medium">
                    View Loan
                  </Link>
                ) : (
                  <span className="text-12 text-gray-400 italic">N/A</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {notifications.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-gray-400 font-medium italic">
                No outgoing messages found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
