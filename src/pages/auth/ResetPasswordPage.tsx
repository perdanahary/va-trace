import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!newPassword) { setError("Password baru harus diisi"); return; }
    if (newPassword.length < 6) { setError("Password minimal 6 karakter"); return; }
    if (newPassword !== confirmPassword) { setError("Konfirmasi password tidak cocok"); return; }

    setLoading(true);

    // simulate reset
    setTimeout(() => {
      setDone(true);
      setLoading(false);
      toast.success("Password berhasil diubah");
    }, 800);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none absolute bottom-[-4rem] right-[-6rem] h-72 w-72 rounded-full bg-success/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm">
            <span className="text-xl font-bold tracking-[0.24em] text-primary">V</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">VA Trace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Buat password baru</p>
        </div>

        <Card className="border-border/70 shadow-lg shadow-primary/5">
          <CardHeader className="space-y-1 pb-4 text-center">
            <div className="mb-1 inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-card px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
              <Sparkles className="h-3 w-3 text-primary" />
              {done ? "Berhasil" : "Reset password"}
            </div>
            <CardTitle className="text-lg">
              {done ? "Password berhasil diubah" : "Buat password baru"}
            </CardTitle>
            <CardDescription>
              {done
                ? "Silakan masuk menggunakan password baru Anda"
                : "Password minimal 6 karakter"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center py-4">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Password Anda telah berhasil diperbarui
                  </p>
                </div>

                <Button className="w-full" asChild>
                  <Link to="/auth/login">Masuk sekarang</Link>
                </Button>

                {/* prototype note */}
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Prototype — password tidak benar-benar berubah
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!token && (
                  <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    Token reset tidak valid atau kadaluarsa. Gunakan link dari email reset.
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-password">Password baru</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Konfirmasi password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ulangi password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
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

                {error && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {loading ? "Memproses..." : "Simpan password baru"}
                </Button>

                <div className="text-center">
                  <Link
                    to="/auth/login"
                    className="inline-flex items-center gap-1.5 text-sm text-link underline-offset-4 hover:underline"
                  >
                    Kembali ke halaman masuk
                  </Link>
                </div>
              </form>
            )}

            {/* token indicator */}
            {token && !done && (
              <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Token: <span className="font-mono text-foreground">{token.slice(0, 16)}...</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
