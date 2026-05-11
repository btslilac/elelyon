import Image from "next/image";
import { cn } from "@/lib/utils";

interface CompanyHeaderProps {
  title: string;
  subtext?: string;
  className?: string;
  rightContent?: React.ReactNode;
}

export default function CompanyHeader({ title, subtext, className, rightContent }: CompanyHeaderProps) {
  return (
    <div className={cn("flex justify-between items-start mb-8 pb-6 border-b border-gray-300", className)}>

      {/* Left: Logo + Brand — logo is same visual height as stacked brand name + tagline */}
      <div className="flex items-center gap-3">
        {/*
          The text block is roughly:
            h2 text-2xl (32px line-height ~40px) + p text-sm (20px line-height) + 2px gap ≈ 62px.
          We set the logo to 60px so it matches that natural height exactly.
        */}
        <Image
          src="/icons/logo.svg"
          alt="El Elyon Logo"
          width={60}
          height={60}
          className="object-contain"
          style={{ height: "60px", width: "auto" }}
        />

        {/* Brand name on top, tagline directly below */}
        <div className="flex flex-col justify-center">
          <span className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
            El Elyon Capital
          </span>
          <span className="text-sm text-gray-500 leading-snug mt-0.5">
            Capital &amp; Credit Solutions
          </span>
        </div>
      </div>

      {/* Right: Report title + metadata */}
      <div className="text-right">
        <p className="text-xl font-bold text-gray-900">{title}</p>
        {subtext && (
          <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>
        )}
        {rightContent}
      </div>
    </div>
  );
}
