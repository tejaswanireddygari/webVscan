import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ShieldCheck, Zap, ArrowRight, Radar, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { api, type ApiScan, type DashboardStats, type Severity } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const SEV_COLORS: Record<Severity, string> = {
  critical: "oklch(0.58 0.27 15)",
  high: "oklch(0.70 0.20 40)",
  medium: "oklch(0.78 0.18 85)",
  low: "oklch(0.75 0.15 200)",
  info: "oklch(0.70 0.10 240)",
};

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scans, setScans] = useState<ApiScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.dashboardStats(), api.listScans()])
      .then(([s, sc]) => { setStats(s); setScans(sc); })
      .catch((e) => toast.error(e.message || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground font-mono text-sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading command center...
      </div>
    );
  }

  const counts = stats?.severity_counts || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const pieData = (Object.entries(counts) as [Severity, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v }));

  // Synthesize a 7-day trend by bucketing recent scans by day & severity.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { key: d.toISOString().slice(0, 10), day: d.toLocaleDateString(undefined, { weekday: "short" }), critical: 0, high: 0, medium: 0 };
  });
  for (const s of scans) {
    const k = s.started_at.slice(0, 10);
    const bucket = days.find((d) => d.key === k);
    if (!bucket || !s.summary?.counts) continue;
    bucket.critical += s.summary.counts.critical || 0;
    bucket.high += s.summary.counts.high || 0;
    bucket.medium += s.summary.counts.medium || 0;
  }

  const totalScans = stats?.total_scans || 0;
  const totalVulns = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-primary tracking-widest">// COMMAND CENTER</p>
          <h1 className="text-3xl font-bold mt-1">Threat Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Live view of detected vulnerabilities across your assets.</p>
        </div>
        <Link to="/scan/new">
          <Button className="font-mono uppercase tracking-wider">
            <Radar className="mr-2 h-4 w-4" /> New Scan
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Scans" value={totalScans} icon={Activity} color="text-primary" />
        <StatCard label="Vulnerabilities" value={totalVulns} icon={AlertTriangle} color="text-high" />
        <StatCard label="Critical Issues" value={counts.critical} icon={Zap} color="text-critical" pulse />
        <StatCard label="Active / Queued" value={stats?.running || 0} icon={ShieldCheck} color="text-accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm uppercase tracking-wider">Threat Trend (7d)</h2>
            <span className="font-mono text-[10px] text-muted-foreground">from your scan history</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={days}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SEV_COLORS.critical} stopOpacity={0.6} /><stop offset="100%" stopColor={SEV_COLORS.critical} stopOpacity={0} /></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SEV_COLORS.high} stopOpacity={0.5} /><stop offset="100%" stopColor={SEV_COLORS.high} stopOpacity={0} /></linearGradient>
                <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SEV_COLORS.medium} stopOpacity={0.4} /><stop offset="100%" stopColor={SEV_COLORS.medium} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.03 250 / 0.5)" />
              <XAxis dataKey="day" stroke="oklch(0.65 0.03 200)" fontSize={11} />
              <YAxis stroke="oklch(0.65 0.03 200)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.20 0.025 250)", border: "1px solid oklch(0.30 0.03 250)", borderRadius: "6px", fontFamily: "JetBrains Mono", fontSize: "12px" }} />
              <Area type="monotone" dataKey="critical" stroke={SEV_COLORS.critical} fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="high" stroke={SEV_COLORS.high} fill="url(#g2)" strokeWidth={2} />
              <Area type="monotone" dataKey="medium" stroke={SEV_COLORS.medium} fill="url(#g3)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-sm uppercase tracking-wider mb-4">Severity Breakdown</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground font-mono py-12 text-center">No vulnerabilities yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={SEV_COLORS[entry.name as Severity]} stroke="none" />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: "11px", fontFamily: "JetBrains Mono" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-mono text-sm uppercase tracking-wider">Recent Scans</h2>
          <Link to="/history" className="font-mono text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {scans.length === 0 && (
            <p className="p-8 text-center font-mono text-sm text-muted-foreground">No scans yet — launch your first one.</p>
          )}
          {scans.slice(0, 5).map((scan) => {
            const c = scan.summary?.counts || ({} as Record<Severity, number>);
            return (
              <Link
                key={scan.id}
                to="/results/$scanId"
                params={{ scanId: String(scan.id) }}
                className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
              >
                <div className={`h-2 w-2 rounded-full ${scan.status === "completed" ? "bg-primary" : scan.status === "failed" ? "bg-destructive" : "bg-accent animate-pulse"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate">{scan.target_url}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(scan.started_at).toLocaleString()} · {scan.status} · {scan.progress}%
                  </p>
                </div>
                <div className="hidden md:flex gap-1.5">
                  {(c.critical || 0) > 0 && <SeverityBadge level="critical" />}
                  {(c.high || 0) > 0 && <SeverityBadge level="high" />}
                  {(c.medium || 0) > 0 && <SeverityBadge level="medium" />}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, pulse }: { label: string; value: number; icon: React.ElementType; color: string; pulse?: boolean; }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`mt-2 font-mono text-3xl font-bold ${color} ${pulse ? "text-glow" : ""}`}>{value}</p>
        </div>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      {pulse && <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-50" />}
    </div>
  );
}
