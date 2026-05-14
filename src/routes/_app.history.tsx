import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SeverityBadge } from "@/components/SeverityBadge";
import { mockScans, countBySeverity } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const [q, setQ] = useState("");
  const filtered = mockScans.filter((s) => s.target.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <p className="font-mono text-xs text-primary tracking-widest">// LOG ARCHIVE</p>
        <h1 className="text-3xl font-bold mt-1">Scan History</h1>
        <p className="text-sm text-muted-foreground mt-1">All scans performed across your assets.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="grep target..."
          className="pl-9 font-mono"
        />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-3 border-b border-border bg-muted/30 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="col-span-1">Status</div>
          <div className="col-span-4">Target</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Duration</div>
          <div className="col-span-3">Findings</div>
          <div className="col-span-1"></div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((s) => {
            const c = countBySeverity(s.vulnerabilities);
            return (
              <Link
                key={s.id}
                to="/results/$scanId"
                params={{ scanId: s.id }}
                className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-muted/40 transition-colors"
              >
                <div className="col-span-1">
                  {s.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="col-span-4 font-mono text-sm truncate">{s.target}</div>
                <div className="col-span-2 font-mono text-xs text-muted-foreground">
                  {new Date(s.startedAt).toLocaleDateString()}
                </div>
                <div className="col-span-1 font-mono text-xs text-muted-foreground">{s.duration}</div>
                <div className="col-span-3 flex flex-wrap gap-1">
                  {(["critical", "high", "medium", "low", "info"] as const).map(
                    (sev) =>
                      c[sev] > 0 && (
                        <span key={sev} className="flex items-center gap-1">
                          <SeverityBadge level={sev} />
                          <span className="font-mono text-xs">{c[sev]}</span>
                        </span>
                      ),
                  )}
                  {s.vulnerabilities.length === 0 && <span className="font-mono text-xs text-muted-foreground">—</span>}
                </div>
                <div className="col-span-1 text-right">
                  <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-8 text-center font-mono text-sm text-muted-foreground">No scans match.</p>
          )}
        </div>
      </div>
    </div>
  );
}
