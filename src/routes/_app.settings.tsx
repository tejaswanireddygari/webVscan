import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Key, Shield, User2, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [notif, setNotif] = useState({ critical: true, weekly: true, marketing: false });
  const [aiAggressive, setAiAggressive] = useState(false);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <p className="font-mono text-xs text-primary tracking-widest">// CONFIG</p>
        <h1 className="text-3xl font-bold mt-1">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage account, notifications, and AI engine behavior.</p>
      </div>

      <Section icon={User2} title="Profile">
        <Field label="Display name">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="font-mono" />
        </Field>
        <Field label="Email">
          <Input value={user?.email ?? ""} disabled className="font-mono" />
        </Field>
        <Button
          onClick={() => toast.success("Profile saved")}
          className="font-mono"
        >
          <Save className="mr-2 h-4 w-4" /> Save changes
        </Button>
      </Section>

      <Section icon={Shield} title="AI Engine">
        <Toggle
          label="Aggressive scanning"
          desc="Allow AI to attempt active exploit chains. May trigger WAFs."
          checked={aiAggressive}
          onChange={setAiAggressive}
        />
        <Field label="Model">
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm">
            <option>sentinel-vuln-v2.4</option>
            <option>sentinel-vuln-v2.0</option>
            <option>sentinel-vuln-experimental</option>
          </select>
        </Field>
        <Field label="Max concurrent requests">
          <Input type="number" defaultValue={20} className="font-mono" />
        </Field>
      </Section>

      <Section icon={Bell} title="Notifications">
        <Toggle
          label="Critical findings"
          desc="Email me as soon as a critical vulnerability is detected."
          checked={notif.critical}
          onChange={(v) => setNotif({ ...notif, critical: v })}
        />
        <Toggle
          label="Weekly summary"
          desc="Recap of all scans and findings every Monday."
          checked={notif.weekly}
          onChange={(v) => setNotif({ ...notif, weekly: v })}
        />
        <Toggle
          label="Product updates"
          desc="New features and AI model improvements."
          checked={notif.marketing}
          onChange={(v) => setNotif({ ...notif, marketing: v })}
        />
      </Section>

      <Section icon={Key} title="API Access">
        <Field label="API Key">
          <div className="flex gap-2">
            <Input
              readOnly
              value="sk_live_a4f7c2d8e9b1·············xK91"
              className="font-mono"
            />
            <Button variant="outline" onClick={() => toast.success("Key copied")} className="font-mono">
              Copy
            </Button>
            <Button variant="outline" onClick={() => toast.success("Key rotated")} className="font-mono">
              Rotate
            </Button>
          </div>
        </Field>
      </Section>

      <Section icon={Trash2} title="Danger Zone" danger>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account, scan history, and reports. This cannot be undone.
        </p>
        <Button variant="destructive" className="font-mono">
          <Trash2 className="mr-2 h-4 w-4" /> Delete account
        </Button>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  danger,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-card p-6 space-y-4 ${danger ? "border-destructive/40" : "border-border"}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${danger ? "text-destructive" : "text-primary"}`} />
        <h2 className="font-mono text-sm uppercase tracking-wider">{title}</h2>
      </div>
      <Separator />
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
