"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Calendar, Filter } from "lucide-react";

interface DateRangeFilterProps {
  label?: string;
}

export default function DateRangeFilter({ label = "Filter by Date" }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clear = () => {
    setFrom("");
    setTo("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasFilter = !!(searchParams.get("from") || searchParams.get("to"));

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-12 font-bold text-gray-500 uppercase tracking-widest">
        <Filter className="size-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input-class pl-8 py-1.5 text-13 h-9 w-auto"
            placeholder="From"
          />
        </div>
        <span className="text-gray-400 text-12">to</span>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input-class pl-8 py-1.5 text-13 h-9 w-auto"
            placeholder="To"
          />
        </div>
        <button onClick={apply} className="btn-primary h-9 px-4 text-13">
          Apply
        </button>
        {hasFilter && (
          <button onClick={clear} className="btn-ghost h-9 px-3 text-12">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
