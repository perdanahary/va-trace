import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, LogIn, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/authStore";
import { useUserStore } from "@/lib/userStore";
import { toast } from "sonner";

const REMEMBER_KEY = "va-trace-remember-email";

export function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useCurrentUser();
  const { users } = useUserStore();

  // redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate(`/${currentUser.role}`, { replace: true });
    }
  }, [currentUser, navigate]);

  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(REMEMBER_KEY) ?? ""; } catch { return ""; }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => !!email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email harus diisi"); return; }
    if (!password.trim()) { setError("Password harus diisi"); return; }

    setLoading(true);

    // simulate auth delay
    setTimeout(() => {
      const user = users.find((u) => u.email === email.trim());

      if (!user) {
        setError("Email tidak terdaftar");
        setLoading(false);
        return;
      }
      if (user.status === "Inactive") {
        setError("Akun Anda tidak aktif. Hubungi administrator.");
        setLoading(false);
        return;
      }

      // store remember preference
      if (remember) {
        try { localStorage.setItem(REMEMBER_KEY, email.trim()); } catch {}
      } else {
        try { localStorage.removeItem(REMEMBER_KEY); } catch {}
      }

      // simulate password check — any non-empty password works in prototype
      setCurrentUser(user);
      toast.success(`Selamat datang, ${user.name}`);
      navigate(`/${user.role}`, { replace: true });
    }, 800);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* decorative bg */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none absolute left-[-6rem] top-[-4rem] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm">
            <span className="text-xl font-bold tracking-[0.24em] text-primary">V</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">VA Trace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Supply Chain Visibility Platform</p>
        </div>

        <Card className="border-border/70 shadow-lg shadow-primary/5">
          <CardHeader className="space-y-1 pb-4 text-center">
            <div className="mb-1 inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-card px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
              <Sparkles className="h-3 w-3 text-primary" />
              Sign in
            </div>
            <CardTitle className="text-lg">Masuk ke akun Anda</CardTitle>
            <CardDescription>
              Gunakan email dan password yang terdaftar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@perusahaan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs text-link underline-offset-4 hover:underline"
                    tabIndex={-1}
                  >
                    Lupa password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* remember me */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                  Ingat email saya
                </Label>
              </div>

              {/* error */}
              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {/* submit */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            {/* prototype note */}
            <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Prototype —{" "}
              <span className="text-foreground">any password works</span>
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Gunakan email demo:{" "}
              <button
                type="button"
                className="text-link underline-offset-4 hover:underline"
                onClick={() => {
                  setEmail("sarah@officebee.co");
                  setPassword("password");
                }}
              >
                sarah@officebee.co
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
