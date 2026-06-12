import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Factory } from "lucide-react";

import { ProductionStatusBadge } from "@/components/domain/badges/badges";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOrderRequests } from "@/lib/v2/orderRequestStore";
import { useProductionJobs } from "@/lib/v2/productionStore";

interface ProductionJobDetailProps {
  userRole?: UserRole;
}

export function ProductionJobDetail({ userRole = "admin" }: ProductionJobDetailProps) {
  const { id } = useParams<{ id: string }>();
  const rolePrefix = `/${userRole}`;
  const jobs = useProductionJobs();
  const orders = useOrderRequests();
  const job = jobs.find((entry) => entry.id === id || entry.jobNumber === id);
  const order = orders.find((entry) => entry.id === job?.orderRequestId);
  const item = order?.items.find((entry) => entry.id === job?.orderItemId);

  if (!job) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole={userRole} />
        <ContentArea>
          <Header title="Production Job" />
          <main className="p-8">
            <p className="text-sm text-muted-foreground">Production job not found.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to={`${rolePrefix}/production`}>
                <ArrowLeft className="h-4 w-4" />
                Back to Production
              </Link>
            </Button>
          </main>
        </ContentArea>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header
          title={job.jobNumber}
          breadcrumbs={[
            { label: "Production", to: `${rolePrefix}/production` },
            { label: job.jobNumber },
          ]}
        />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Factory className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-semibold">{job.jobNumber}</span>
                <ProductionStatusBadge status={job.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {item?.description ?? job.orderItemId} ·{" "}
                {order ? (
                  <Link to={`${rolePrefix}/orders/${order.id}`} className="font-mono text-link hover:underline">
                    {order.orderRequestNumber}
                  </Link>
                ) : (
                  job.orderRequestId
                )}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to={`${rolePrefix}/production`}>
                <ArrowLeft className="h-4 w-4" />
                Back to queue
              </Link>
            </Button>
          </section>

          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Ordered" value={job.orderedQuantity} />
            <Metric label="Produced" value={job.producedQuantity} />
            <Metric label="QC Passed" value={job.qcPassedQuantity} />
            <Metric label="Ready" value={job.readyQuantity} />
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Readiness Pool</CardTitle>
              <CardDescription>Ready quantity is the pool used for shipment batch eligibility and reservations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={job.orderedQuantity > 0 ? (job.readyQuantity / job.orderedQuantity) * 100 : 0} />
              <div className="grid gap-4 text-sm sm:grid-cols-3">
                <Detail label="Reserved for shipment" value={job.reservedForShipmentQuantity} />
                <Detail label="Completed" value={job.completedQuantity} />
                <Detail label="Rejected" value={job.rejectedQuantity} />
              </div>
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  );
}
