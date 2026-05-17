import { formatDistanceToNow } from 'date-fns'; // Wait, I should check if date-fns is installed.
import { Activity, CreditCard, AlertCircle, UserPlus, RefreshCw, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
  logs: any[];
}

export default function ActivityTimeline({ logs }: ActivityTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
      <br/>
        <Activity className="size-8 text-gray-300 mb-2" />
        <p className="text-14 text-gray-500">No activity recorded yet for this client.</p>
        <br/>
      </div>
    );
  }

  const getIcon = (action: string) => {
    switch (action) {
      case 'REPAYMENT_CREATED': return <CreditCard className="size-4" />;
      case 'PENALTY_ADDED': return <AlertCircle className="size-4" />;
      case 'CLIENT_CREATED': return <UserPlus className="size-4" />;
      case 'CLIENT_UPDATED': return <RefreshCw className="size-4" />;
      case 'DOCUMENT_UPLOADED': return <FileUp className="size-4" />;
      default: return <Activity className="size-4" />;
    }
  };

  const getIconColor = (action: string) => {
    switch (action) {
      case 'REPAYMENT_CREATED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PENALTY_ADDED': return 'bg-red-50 text-red-600 border-red-100';
      case 'CLIENT_CREATED': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'CLIENT_UPDATED': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'DOCUMENT_UPLOADED': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-16 font-semibold text-gray-900 tracking-tight flex items-center gap-2">
        <Activity className="size-5 text-gray-400" />
        Recent Activity
      </h3>

      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:via-gray-200 before:to-transparent">
        {logs.map((log, idx) => (
          <div key={idx} className="relative flex items-start gap-6 group">
            <div className={cn(
              "absolute left-0 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-white z-10 transition-transform group-hover:scale-110",
              getIconColor(log.action)
            )}>
              {getIcon(log.action)}
            </div>

            <div className="flex-1 pt-1 ml-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <p className="text-14 font-semibold text-gray-900">{log.description}</p>
                <time className="text-12 text-gray-400 font-medium">
                  {new Date(log.timestamp).toLocaleString()}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-4 rounded-full bg-gray-100 flex items-center justify-center">
                   <div className="size-1.5 rounded-full bg-gray-400" />
                </div>
                <p className="text-12 text-gray-500">
                  <span className="font-medium text-gray-700">{log.performed_by || log.performedBy}</span>
                </p>
              </div>
              
              {log.newValue && log.previousValue && (
                 <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 inline-block">
                    <p className="text-11 text-gray-500 uppercase tracking-wider font-bold">Change</p>
                    <p className="text-12 text-gray-600 mt-0.5">
                       <span className="line-through opacity-50">{log.previousValue}</span>
                       <span className="mx-2">→</span>
                       <span className="font-medium text-emerald-600">{log.newValue}</span>
                    </p>
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
