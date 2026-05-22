import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Terminal, Lock, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { demoMode, tokenStore } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === "register" && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
      <div className="pointer-events-none absolute left-0 right-0 h-px bg-primary/40 animate-scan-bar" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/40 animate-pulse-glow">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-mono text-3xl font-bold tracking-tight">
            SENTINEL<span className="text-primary">_AI</span>
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground tracking-widest">
            // AI-POWERED VULNERABILITY SCANNER
          </p>
        </div>

        <div className="relative rounded-lg border border-border bg-card/80 p-6 backdrop-blur-sm shadow-2xl scanline">
          <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              ~/auth/{mode}<span className="animate-blink text-primary">_</span>
            </span>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded font-mono text-xs uppercase tracking-wider py-2 transition-colors ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="font-mono text-xs">Operator name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="neo"
                  className="font-mono"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-mono text-xs">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@sentinel.io"
                  className="pl-9 font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-mono text-xs">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 font-mono"
                />
              </div>
            </div>

            <Button type="submit" disabled={busy} className="w-full font-mono uppercase tracking-wider">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "→ Authenticate" : "→ Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground">
            By continuing you agree to ethical scanning. Targets must be authorized.
          </p>
        </div>

        <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              demoMode.set(true);
              tokenStore.set("demo.jwt.token");
              window.location.href = "/dashboard";
            }}
            className="hover:text-primary"
          >
            Skip → demo dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
