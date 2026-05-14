import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Lightbulb,
  Wrench,
  ShieldAlert,
  FileJson,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { mockScans, countBySeverity, type Severity } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/results/$scanId")({
  component: ResultsPage,
  loader: ({ params }) => {
    const scan = mockScans.find((s) => s.id === params.scanId);
    if (!scan) throw notFound();
    return { scan };
  },
  notFoundComponent: () => (
    <div className="p-8 font-mono">
      <p className="text-destructive">Scan not found.</p>
      <Link to="/history" className="text-primary hover:underline">← Back to history</Link>
    </div>
  ),
});

const severities: Severity[] = ["critical", "high", "medium", "low", "info"];

function ResultsPage() {
  const { scan } = Route.useLoaderData();
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(scan.vulnerabilities[0]?.id ?? null);
  const counts = countBySeverity(scan.vulnerabilities);
  const filtered = filter === "all" ? scan.vulnerabilities : scan.vulnerabilities.filter((v) => v.severity === filter);

  const downloadReport = (fmt: string) => {
    toast.success(`Generating ${fmt.toUpperCase()} report...`, {
      description: "Your download will start shortly.",
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <Link to="/history" className="font-mono text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to history
        </Link>
        <div className="mt-2 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-xs text-primary tracking-widest">// SCAN RESULTS · {scan.id}</p>
            <h1 className="text-3xl font-bold mt-1 break-all">{scan.target}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {new Date(scan.startedAt).toLocaleString()} · {scan.duration} · {scan.pagesScanned} pages · {scan.requests} requests
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadReport("pdf")} className="font-mono">
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" onClick={() => downloadReport("json")} className="font-mono">
              <FileJson className="mr-2 h-4 w-4" /> JSON
            </Button>
            <Button variant="outline" onClick={() => downloadReport("csv")} className="font-mono">
              <FileCode className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => downloadReport("full")} className="font-mono">
              <Download className="mr-2 h-4 w-4" /> Download All
            </Button>
          </div>
        </div>
      </div>

      {/* Severity summary cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {severities.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            className={`rounded-lg border p-4 text-left transition-all ${
              filter === s ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
            } bg-card`}
          >
            <SeverityBadge level={s} />
            <p className="font-mono text-3xl font-bold mt-2">{counts[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm uppercase tracking-wider">
          Findings {filter !== "all" && <span className="text-muted-foreground">// filtered: {filter}</span>}
        </h2>
        {filter !== "all" && (
          <button onClick={() => setFilter("all")} className="font-mono text-xs text-primary hover:underline">
            Clear filter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.map((v) => {
          const open = expanded === v.id;
          return (
            <div
              key={v.id}
              className={`rounded-lg border bg-card transition-all ${open ? "border-primary/40" : "border-border"}`}
            >
              <button
                onClick={() => setExpanded(open ? null : v.id)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <SeverityBadge level={v.severity} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{v.title}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                    {v.type} · {v.url} {v.cve && `· ${v.cve}`}
                  </p>
                </div>
                {v.cvss !== undefined && v.cvss > 0 && (
                  <div className="hidden md:block text-right">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">CVSS</p>
                    <p className="font-mono text-lg font-bold text-foreground">{v.cvss.toFixed(1)}</p>
                  </div>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="border-t border-border p-5 space-y-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <ShieldAlert className="h-3 w-3" /> Description
                    </p>
                    <p className="text-sm">{v.description}</p>
                  </div>

                  <div className="rounded-md border border-accent/30 bg-accent/5 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-accent mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> AI INSIGHT
                    </p>
                    <p className="text-sm text-foreground/90 leading-relaxed">{v.aiInsight}</p>
                  </div>

                  {v.evidence && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                        Evidence
                      </p>
                      <pre className="rounded bg-black/40 border border-border p-3 font-mono text-xs overflow-x-auto">
                        {v.evidence}
                      </pre>
                    </div>
                  )}

                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                      <Wrench className="h-3 w-3" /> Remediation
                    </p>
                    <p className="text-sm">{v.remediation}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="font-mono text-xs">
                      <Lightbulb className="mr-1.5 h-3 w-3" /> Ask AI to fix
                    </Button>
                    <Button size="sm" variant="outline" className="font-mono text-xs">
                      <ExternalLink className="mr-1.5 h-3 w-3" /> View in DOM
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
