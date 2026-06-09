import { CheckCircle2, Clock, Package, Truck } from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockOrders } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface OrderProgressProps {
  role: UserRole;
}

export function OrderProgress({ role }: OrderProgressProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <ContentArea>
        <Header title={`${role.toUpperCase()} - Order Progress Tracking`} />

        <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <ProgressMetric label="In Production" value="12" icon={Package} color="text-processing" />
            <ProgressMetric label="Ready to Ship" value="08" icon={Clock} color="text-primary" />
            <ProgressMetric label="On Delivery" value="04" icon={Truck} color="text-processing" />
            <ProgressMetric label="Completed" value="124" icon={CheckCircle2} color="text-success" />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Ongoing Order Progress</h2>
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                Live Tracking Enabled
              </Badge>
            </div>

            <div className="space-y-4">
              {mockOrders.slice(0, 4).map((order, index) => (
                <Card key={order.id} className="border-border/70 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-8 lg:flex-row">
                      <div className="space-y-2 lg:w-1/4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">{order.id}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <h3 className="text-sm font-semibold tracking-tight">{order.campaign}</h3>
                        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">{order.supplier}</p>
                      </div>

                      <div className="grid flex-1 grid-cols-2 items-center gap-4 md:grid-cols-4">
                        <MiniProgress label="In Production" current={750} total={750} isDone />
                        <MiniProgress label="Ready" current={400} total={750} isActive />
                        <MiniProgress label="Shipping" current={150} total={750} />
                        <MiniProgress label="Delivered" current={0} total={750} />
                      </div>

                      <div className="border-t pt-4 lg:w-1/6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Next Milestone</p>
                        <p className="mt-1 text-sm font-semibold">Shipment Pick-up</p>
                        <p className="mt-1 text-xs font-medium text-destructive">2 days left</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </ContentArea>
    </div>
  );
}

function ProgressMetric({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn("rounded-md border bg-muted/20 p-2.5", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
          <h3 className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniProgress({
  label,
  current,
  total,
  isDone = false,
  isActive = false,
}: {
  label: string;
  current: number;
  total: number;
  isDone?: boolean;
  isActive?: boolean;
}) {
  const percentage = (current / total) * 100;

  return (
    <div className={cn("space-y-2", !isDone && !isActive && "opacity-40")}>
      <div className="flex justify-between text-[9px] font-semibold uppercase tracking-[0.24em]">
        <span className={cn(isDone && "text-success", isActive && "text-primary")}>{label}</span>
        <span className="text-muted-foreground">{Math.round(percentage)}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
