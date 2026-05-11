"use client";

import { Printer } from "lucide-react";

interface ExportButtonProps {
  label?: string;
  filename?: string;
}

export default function ExportButton({ label = "Print / Export PDF" }: ExportButtonProps) {
  return (
    <button
      onClick={() => window.print()}
      className="btn-secondary print:hidden flex items-center gap-2"
    >
      <Printer className="size-4" />
      <span>{label}</span>
    </button>
  );
}
