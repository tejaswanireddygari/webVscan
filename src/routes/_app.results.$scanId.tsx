import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Download, FileText, Sparkles, ChevronDown, ExternalLink,
  Lightbulb, Wrench, ShieldAlert, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { api, type ApiScanDetail, type Severity } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/results/$scanId")({
  component: ResultsPage,
});

const severities: Severity[] = ["critical", "high", "medium", "low", "info"];

function ResultsPage() {
  const { scanId } = Route.useParams();
  const [scan, setScan] = useState<ApiScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;

    const load = () =>
      api.getScan(Number(scanId)).then((s) => {
        if (cancelled) return;
        setScan(s);
        setExpanded((cur) => cur ?? s.vulnerabilities[0]?.id ?? null);
        // If still running, listen for completion via WebSocket.
        if ((s.status === "running" || s.status === "queued") && !ws) {
          ws = api.openScanSocket(Number(scanId), (msg) => {
            if (msg.event === "progress") setScan((p) => p ? { ...p, progress: msg.progress } : p);
            if (msg.event === "completed" || msg.event === "failed") load();
          });
        }
      });

    load().catch((e) => toast.error(e.message || "Scan not found"))
      .finally(() => setLoading(false));

    return () => { cancelled = true; ws?.close(); };
  }, [scanId]);

  if (loading || !scan) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground font-mono text-sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading scan...
      </div>
    );
  }

  const counts = (scan.summary?.counts || { critical: 0, high: 0, medium: 0, low: 0, info: 0 }) as Record<Severity, number>;
  const filtered = filter === "all" ? scan.vulnerabilities : scan.vulnerabilities.filter((v) => v.severity === filter);

  const download = async () => {
    try {
      toast.info("Generating PDF report...");
      await api.downloadReport(scan.id);
    } catch (e: any) {
      toast.error(e.message || "Download failed");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <Link to="/history" className="font-mono text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to history
        </Link>
        <div className="mt-2 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-xs text-primary tracking-widest">// SCAN RESULTS · #{scan.id}</p>
            <h1 className="text-3xl font-bold mt-1 break-all">{scan.target_url}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {new Date(scan.started_at).toLocaleString()} · profile: {scan.profile} · status: {scan.status} ({scan.progress}%)
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={download} className="font-mono">
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>
      </div>

      {scan.status !== "completed" && (
        <div className="rounded-lg border border-primary/30 bg-card p-4">
          <p className="font-mono text-xs text-muted-foreground mb-2">
            <Loader2 className="inline mr-1 h-3 w-3 animate-spin" /> Scan {scan.status}...
          </p>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all" style={{ width: `${scan.progress}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {severities.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            className={`rounded-lg border p-4 text-left transition-all ${filter === s ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"} bg-card`}
          >
            <SeverityBadge level={s} />
            <p className="font-mono text-3xl font-bold mt-2">{counts[s] || 0}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm uppercase tracking-wider">
          Findings {filter !== "all" && <span className="text-muted-foreground">// filtered: {filter}</span>}
        </h2>
        {filter !== "all" && (
          <button onClick={() => setFilter("all")} className="font-mono text-xs text-primary hover:underline">Clear filter</button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="p-8 text-center font-mono text-sm text-muted-foreground border border-border rounded-lg">
            {scan.status === "completed" ? "No vulnerabilities found." : "Scan still in progress..."}
          </p>
        )}
        {filtered.map((v) => {
          const open = expanded === v.id;
          return (
            <div key={v.id} className={`rounded-lg border bg-card transition-all ${open ? "border-primary/40" : "border-border"}`}>
              <button onClick={() => setExpanded(open ? null : v.id)} className="flex w-full items-center gap-4 p-4 text-left">
                <SeverityBadge level={v.severity} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{v.title}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                    {v.type} · {v.url}
                  </p>
                </div>
                {v.cvss > 0 && (
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

                  {v.ai_insight && (
                    <div className="rounded-md border border-accent/30 bg-accent/5 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-accent mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> AI INSIGHT · ML confidence {(v.ml_confidence * 100).toFixed(0)}%
                      </p>
                      <p className="text-sm text-foreground/90 leading-relaxed">{v.ai_insight}</p>
                    </div>
                  )}

                  {v.evidence && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Evidence</p>
                      <pre className="rounded bg-black/40 border border-border p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
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
                    <a href={v.url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="font-mono text-xs">
                        <ExternalLink className="mr-1.5 h-3 w-3" /> Open URL
                      </Button>
                    </a>
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
