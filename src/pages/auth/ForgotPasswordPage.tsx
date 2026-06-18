import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email harus diisi"); return; }

    setLoading(true);

    // simulate sending email
    setTimeout(() => {
      setSent(true);
      setLoading(false);
      toast.success("Link reset password telah dikirim ke email Anda");
    }, 1000);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none absolute right-[-6rem] top-[-4rem] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm">
            <span className="text-xl font-bold tracking-[0.24em] text-primary">V</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">VA Trace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Reset password</p>
        </div>

        <Card className="border-border/70 shadow-lg shadow-primary/5">
          <CardHeader className="space-y-1 pb-4 text-center">
            <div className="mb-1 inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-card px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
              <Sparkles className="h-3 w-3 text-primary" />
              {sent ? "Email terkirim" : "Lupa password"}
            </div>
            <CardTitle className="text-lg">
              {sent ? "Cek email Anda" : "Atur ulang password"}
            </CardTitle>
            <CardDescription>
              {sent
                ? "Kami telah mengirimkan link reset password ke email Anda"
                : "Masukkan email terdaftar untuk menerima link reset"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center py-4">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Link reset telah dikirim ke{" "}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>

                <Button asChild variant="outline" className="w-full" onClick={() => setSent(false)}>
                  <Link to="/auth/forgot-password">
                    Kirim ulang email
                  </Link>
                </Button>

                <div className="text-center">
                  <Link
                    to="/auth/login"
                    className="inline-flex items-center gap-1.5 text-sm text-link underline-offset-4 hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Kembali ke halaman masuk
                  </Link>
                </div>

                {/* prototype note */}
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Prototype — tidak ada email yang benar-benar terkirim
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-reset">Email</Label>
                  <Input
                    id="email-reset"
                    type="email"
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
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
                    <Mail className="h-4 w-4" />
                  )}
                  {loading ? "Mengirim..." : "Kirim link reset"}
                </Button>

                <div className="text-center">
                  <Link
                    to="/auth/login"
                    className="inline-flex items-center gap-1.5 text-sm text-link underline-offset-4 hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Kembali ke halaman masuk
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
