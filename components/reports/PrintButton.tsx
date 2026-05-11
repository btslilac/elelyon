"use client";

import { Printer } from "lucide-react";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export default function PrintButton({
  label = "Print / Save PDF",
  className,
}: PrintButtonProps) {
  return (
    <button
      onClick={() => window.print()}
      className={className ?? "btn-secondary flex items-center gap-2"}
    >
      <Printer className="size-4" />
      <span>{label}</span>
    </button>
  );
}
