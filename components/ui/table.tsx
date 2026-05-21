import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom text-sm border-collapse",
        className
      )}
      {...props}
    />
  </div>
));

Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "sticky top-0 z-10 bg-white [&_tr]:border-b",
      className
    )}
    {...props}
  />
));

TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "[&_tr:last-child]:border-0",
      "[&_tr:nth-child(even)]:bg-gray-50/50",
      className
    )}
    {...props}
  />
));

TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-gray-50 font-semibold",
      "[&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));

TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-all duration-200",
      "hover:bg-blue-50/50",
      "data-[state=selected]:bg-blue-100",
      "cursor-default",
      className
    )}
    {...props}
  />
));

TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-14 px-6 text-left align-middle",
      "font-semibold text-gray-500 text-xs uppercase tracking-wide",
      "whitespace-nowrap",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));

TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-6 align-middle",
      "text-gray-700",
      "whitespace-nowrap",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));

TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-4 text-sm text-gray-500",
      className
    )}
    {...props}
  />
));

TableCaption.displayName = "TableCaption";

/* ==========================================================================
   ADDED RESPONSIVE CARD PRIMITIVES (FOR MOBILE & TABLET TRANSFORMATION)
   ========================================================================== */

/**
 * Responsive grid layout container.
 * Automatically displays full-width cards on mobile, a 2-column card grid on tablet,
 * and completely hides itself when screens reach desktop breakpoint layout (`lg:hidden`).
 */
const TableResponsiveGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      `
      grid
      grid-cols-1
      md:grid-cols-2
      lg:hidden
      w-full
      gap-5
      px-1
      `,
      className
    )}
    {...props}
  />
));
TableResponsiveGrid.displayName = "TableResponsiveGrid";


/**
 * Professional SaaS mobile card
 */
const TableResponsiveCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      `
      w-full
      flex
      flex-col
      overflow-hidden

      bg-white
      rounded-2xl
      border
      border-gray-200/90

      shadow-sm
      hover:shadow-md

      transition-all
      duration-300
      ease-out

      active:scale-[0.995]
      `,
      className
    )}
    {...props}
  />
));
TableResponsiveCard.displayName = "TableResponsiveCard";


/**
 * Clickable header section
 */
const TableResponsiveCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      `
      flex
      items-start
      justify-between

      px-5
      py-4

      cursor-pointer
      select-none

      transition-all
      duration-200

      hover:bg-blue-50/20
      active:bg-blue-50/40

      min-h-[94px]
      `,
      className
    )}
    {...props}
  />
));
TableResponsiveCardHeader.displayName = "TableResponsiveCardHeader";


/**
 * Expandable content
 */
const TableResponsiveCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isOpen?: boolean;
  }
>(({ className, isOpen, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      `
      grid
      items-start
      justify
      overflow-hidden
      w-max-[90%]
     
      py-0

      transition-all
      duration-300
      ease-out

      border-t
      border-gray-100

      bg-gray-50/30
      `,
      isOpen
        ? "grid-rows-[1fr] opacity-100"
        : "grid-rows-[0fr] opacity-80",
      className
    )}
    {...props}
  >
    <div className="overflow-hidden">

      <div
        className="
        items-start
        w-max-[90%]
        px-5
        py-5
        space-y-5
 

        text-sm
        text-gray-600
        "
      >
        {children}
      </div>

    </div>
  </div>
));
TableResponsiveCardContent.displayName =
  "TableResponsiveCardContent";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  // New Primitives
  TableResponsiveGrid,
  TableResponsiveCard,
  TableResponsiveCardHeader,
  TableResponsiveCardContent,
};