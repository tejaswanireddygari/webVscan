import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Radar, Globe, Shield, Bug, Search, Loader2, Cpu, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/scan/new")({
  component: NewScanPage,
});

const profiles = [
  { id: "quick", name: "Quick Scan", desc: "Surface-level checks · ~30s", icon: Search },
  { id: "full", name: "Full Audit", desc: "All detectors + ML analysis · ~2min", icon: Shield },
  { id: "ai", name: "AI Pentest", desc: "Adaptive AI exploit chain · ~5min", icon: Cpu },
] as const;

const checks = [
  "SQL Injection", "XSS (Reflected)", "CSRF", "SSRF",
  "Broken Authentication", "Misconfigured headers", "Insecure cookies",
  "Sensitive file exposure", "Server version disclosure", "ML threat scoring",
];

function NewScanPage() {
  const [target, setTarget] = useState("");
  const [profile, setProfile] = useState<"quick" | "full" | "ai">("full");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanId, setScanId] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const nav = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => () => wsRef.current?.close(), []);

  const runScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.match(/^https?:\/\//)) {
      toast.error("Enter a valid URL (http:// or https://)");
      return;
    }
    setScanning(true); setProgress(0); setLog([]); setScanId(null);
    try {
      const scan = await api.createScan(target, profile);
      setScanId(scan.id);
      setLog((l) => [...l, `[+] Scan #${scan.id} queued for ${scan.target_url}`, `[+] Connecting to live event stream...`]);

      const ws = api.openScanSocket(scan.id, (msg) => {
        if (msg.event === "started") setLog((l) => [...l, "[+] Scan engine started"]);
        if (msg.event === "progress") {
          setProgress(msg.progress);
          setLog((l) => [...l, `[*] ${msg.detector} (${msg.progress}%)`]);
        }
        if (msg.event === "warn") setLog((l) => [...l, `[!] ${msg.detector} warning: ${msg.error}`]);
        if (msg.event === "completed") {
          setProgress(100);
          setLog((l) => [...l, `[✓] Scan complete — ${msg.summary?.total ?? 0} findings`]);
          toast.success("Scan complete · opening results");
          setTimeout(() => nav({ to: "/results/$scanId", params: { scanId: String(scan.id) } }), 800);
        }
        if (msg.event === "failed") {
          setLog((l) => [...l, `[x] Scan failed: ${msg.error}`]);
          toast.error("Scan failed: " + msg.error);
        }
      });
      wsRef.current = ws;
    } catch (err: any) {
      toast.error(err.message || "Failed to start scan");
      setScanning(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <p className="font-mono text-xs text-primary tracking-widest">// NEW OPERATION</p>
        <h1 className="text-3xl font-bold mt-1">Launch Vulnerability Scan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure target and scan profile. The AI engine adapts based on detected technologies.
        </p>
      </div>

      {!scanning ? (
        <form onSubmit={runScan} className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target" className="font-mono text-xs uppercase tracking-wider">Target URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="https://example.com" className="pl-9 font-mono" autoFocus />
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">⚠ You must have authorization to scan this target.</p>
            </div>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-wider mb-3 text-muted-foreground">Scan Profile</p>
            <div className="grid gap-3 md:grid-cols-3">
              {profiles.map((p) => {
                const active = profile === p.id;
                return (
                  <button type="button" key={p.id} onClick={() => setProfile(p.id)}
                    className={`text-left rounded-lg border p-4 transition-all ${active ? "border-primary bg-primary/5 ring-1 ring-primary shadow-[0_0_24px_-8px_oklch(0.82_0.22_145_/_0.6)]" : "border-border bg-card hover:border-primary/40"}`}>
                    <p.icon className={`h-5 w-5 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-mono text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bug className="h-4 w-4 text-primary" />
              <p className="font-mono text-xs uppercase tracking-wider">Active Detection Modules</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {checks.map((c) => (
                <span key={c} className="font-mono text-[11px] rounded border border-border bg-muted/40 px-2.5 py-1 text-muted-foreground">{c}</span>
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" className="font-mono uppercase tracking-wider">
            <Radar className="mr-2 h-4 w-4" /> Launch Scan
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/40 bg-card p-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-primary animate-pulse" />
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <div>
                <p className="font-mono text-sm">Scanning {target}</p>
                <p className="text-xs text-muted-foreground">
                  {scanId ? `Scan #${scanId} · live via WebSocket` : "Queueing..."}
                </p>
              </div>
              <span className="ml-auto font-mono text-2xl font-bold text-primary text-glow">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="Endpoints" value={Math.round(progress * 0.47)} />
              <Stat label="Requests" value={Math.round(progress * 32)} icon={Network} />
              <Stat label="Findings" value={Math.round(progress / 12)} icon={Bug} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-black/40 p-4 font-mono text-xs h-72 overflow-auto">
            {log.map((line, i) => (
              <p key={i} className={`leading-relaxed ${line.startsWith("[!]") ? "text-high" : line.startsWith("[✓]") ? "text-primary" : line.startsWith("[x]") ? "text-destructive" : "text-muted-foreground"}`}>
                <span className="text-border mr-2">{String(i + 1).padStart(2, "0")}</span>{line}
              </p>
            ))}
            <span className="text-primary animate-blink">█</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon?: React.ElementType }) {
  return (
    <div className="rounded border border-border bg-muted/30 p-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </p>
      <p className="font-mono text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
