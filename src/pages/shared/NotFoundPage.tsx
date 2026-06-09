import { ArrowLeft, Home, PackageSearch, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getNavItemsForRole, type UserRole } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  operator: "Operator",
  analyst: "Analyst",
  client: "Client",
  vendor: "Vendor",
};

export function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = getRoleFromPathname(location.pathname);
  const navItems = getNavItemsForRole(role).slice(0, 4);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <DecorativeBackground />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="flex flex-col justify-center">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm">
                <span className="text-sm font-semibold tracking-[0.24em] text-primary">V</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">VA Trace</p>
                <p className="text-sm text-muted-foreground">Workspace navigation</p>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-sm animate-in-smart">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                404 / Route not found
              </div>

              <h1 className="text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                This route got lost in the supply chain.
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                The page you tried to open does not exist, may have moved, or was typed incorrectly.
                Use one of the live destinations below to get back to work.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={() => navigate(-1)} className="btn-press">
                  <ArrowLeft className="h-4 w-4" />
                  Go back
                </Button>
                <Button asChild variant="outline" className="btn-press">
                  <Link to={`/${role}`}>
                    <Home className="h-4 w-4" />
                    {roleLabels[role]} dashboard
                  </Link>
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <Card className="border-border/70 bg-card/90 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Requested path</CardDescription>
                    <CardTitle className="break-all font-mono text-sm">{location.pathname}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      If this path should exist, check the route spelling or add a matching route in `App.tsx`.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/90 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Best recovery path</CardDescription>
                    <CardTitle className="text-sm">Go to a known workspace entry</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Jump to the dashboard first, then continue through the sidebar from there.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          <aside className="flex items-center">
            <Card className="w-full border-border/70 bg-card/90 shadow-lg shadow-primary/5 backdrop-blur">
              <CardHeader className="border-b bg-muted/20">
                <CardDescription>Suggested destinations</CardDescription>
                <CardTitle className="text-lg">Live routes for {roleLabels[role]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {navItems.map((item, index) => (
                  <Button
                    key={item.path}
                    asChild
                    variant={index === 0 ? "default" : "ghost"}
                    className={cn(
                      "h-12 w-full justify-start gap-3 rounded-xl px-4",
                      index !== 0 && "border border-transparent",
                    )}
                  >
                    <Link to={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </Link>
                  </Button>
                ))}

                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Navigation hint
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Start with the dashboard for your role, then use the sidebar to reach orders, inbox, imports, and master data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

function DecorativeBackground() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(16,185,129,0.12),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.1),_transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-7rem] right-[-6rem] h-80 w-80 rounded-full bg-success/10 blur-3xl" />
    </>
  );
}

function getRoleFromPathname(pathname: string): UserRole {
  const segment = pathname.split("/")[1];

  if (segment === "admin" || segment === "operator" || segment === "analyst" || segment === "client" || segment === "vendor") {
    return segment;
  }

  return "admin";
}
