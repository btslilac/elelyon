'use client';

import { Send, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface Stats {
  totalSent: number;
  delivered: number;
  failed: number;
  byChannel: {
    SMS: number;
    WHATSAPP: number;
    EMAIL: number;
  };
}

export default function CommunicationStats({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  const deliveryRate = stats.totalSent > 0 
    ? Math.round((stats.delivered / stats.totalSent) * 100) 
    : 0;

  const cards = [
    {
      label: "Total Sent",
      value: stats.totalSent,
      icon: <Send className="size-4" />,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Delivery Rate",
      value: `${deliveryRate}%`,
      icon: <CheckCircle className="size-4" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      label: "Failed Sends",
      value: stats.failed,
      icon: <XCircle className="size-4" />,
      color: "text-red-600",
      bg: "bg-red-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-11 font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
            <h4 className="text-20 font-bold text-gray-900 mt-1">{card.value}</h4>
          </div>
          <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
