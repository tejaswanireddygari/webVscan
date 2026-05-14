import { severityColor, type Severity } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function SeverityBadge({ level, className }: { level: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
        severityColor[level],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}
