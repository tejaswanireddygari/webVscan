import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, ShieldCheck, Zap, ArrowRight, Radar } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { mockScans, countBySeverity } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const trend = [
  { day: "Mon", critical: 2, high: 4, medium: 7 },
  { day: "Tue", critical: 1, high: 3, medium: 5 },
  { day: "Wed", critical: 3, high: 6, medium: 9 },
  { day: "Thu", critical: 0, high: 2, medium: 4 },
  { day: "Fri", critical: 4, high: 5, medium: 8 },
  { day: "Sat", critical: 2, high: 3, medium: 6 },
  { day: "Sun", critical: 2, high: 4, medium: 7 },
];

const SEV_COLORS = {
  critical: "oklch(0.58 0.27 15)",
  high: "oklch(0.70 0.20 40)",
  medium: "oklch(0.78 0.18 85)",
  low: "oklch(0.75 0.15 200)",
  info: "oklch(0.70 0.10 240)",
};

function Dashboard() {
  const allVulns = mockScans.flatMap((s) => s.vulnerabilities);
  const counts = countBySeverity(allVulns);
  const pieData = Object.entries(counts).map(([k, v]) => ({ name: k, value: v }));
  const totalScans = mockScans.length;
  const totalVulns = allVulns.length;
  const criticals = counts.critical;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-primary tracking-widest">// COMMAND CENTER</p>
          <h1 className="text-3xl font-bold mt-1">Threat Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time view of detected vulnerabilities across your assets.</p>
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
        <StatCard label="Critical Issues" value={criticals} icon={Zap} color="text-critical" pulse />
        <StatCard label="Assets Protected" value={4} icon={ShieldCheck} color="text-accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm uppercase tracking-wider">Threat Trend (7d)</h2>
            <span className="font-mono text-[10px] text-muted-foreground">live · auto-refresh 30s</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SEV_COLORS.critical} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={SEV_COLORS.critical} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SEV_COLORS.high} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={SEV_COLORS.high} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SEV_COLORS.medium} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={SEV_COLORS.medium} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.03 250 / 0.5)" />
              <XAxis dataKey="day" stroke="oklch(0.65 0.03 200)" fontSize={11} />
              <YAxis stroke="oklch(0.65 0.03 200)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.20 0.025 250)",
                  border: "1px solid oklch(0.30 0.03 250)",
                  borderRadius: "6px",
                  fontFamily: "JetBrains Mono",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="critical" stroke={SEV_COLORS.critical} fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="high" stroke={SEV_COLORS.high} fill="url(#g2)" strokeWidth={2} />
              <Area type="monotone" dataKey="medium" stroke={SEV_COLORS.medium} fill="url(#g3)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-sm uppercase tracking-wider mb-4">Severity Breakdown</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={SEV_COLORS[entry.name as keyof typeof SEV_COLORS]} stroke="none" />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", fontFamily: "JetBrains Mono" }}
              />
            </PieChart>
          </ResponsiveContainer>
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
          {mockScans.slice(0, 4).map((scan) => {
            const c = countBySeverity(scan.vulnerabilities);
            return (
              <Link
                key={scan.id}
                to="/results/$scanId"
                params={{ scanId: scan.id }}
                className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
              >
                <div className={`h-2 w-2 rounded-full ${scan.status === "completed" ? "bg-primary" : "bg-destructive"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate">{scan.target}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(scan.startedAt).toLocaleString()} · {scan.duration} · {scan.pagesScanned} pages
                  </p>
                </div>
                <div className="hidden md:flex gap-1.5">
                  {c.critical > 0 && <SeverityBadge level="critical" />}
                  {c.high > 0 && <SeverityBadge level="high" />}
                  {c.medium > 0 && <SeverityBadge level="medium" />}
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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  pulse,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`mt-2 font-mono text-3xl font-bold ${color} ${pulse ? "text-glow" : ""}`}>{value}</p>
        </div>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      {pulse && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-50" />
      )}
    </div>
  );
}
