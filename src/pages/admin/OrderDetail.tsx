import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pencil,
  MoreHorizontal,
  Package,
  Printer,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useOrders } from "@/lib/orderStore";
import {
  DeliveryConfirmationStatusBadge,
  DeliveryNoteStatusBadge,
  DistributionStatusBadge,
  ExceptionStateBadge,
  PodStatusBadge,
  ProductionStatusBadge,
  ShipmentBatchStatusBadge,
} from "@/components/domain/badges/badges";
import { DeliveryProgressBar } from "@/components/domain/DeliveryProgressBar";
import { ProductionPipelineStepper } from "@/components/domain/ProductionPipelineStepper";
import { CreateBatchDialog } from "@/components/domain/dialogs/CreateBatchDialog";
import { SalesPointAllocationTable } from "@/components/domain/tables/SalesPointAllocationTable";
import { buildAllocationRows, useHydratedOrder } from "@/lib/v2/selectors/viewModels";
import { useActor } from "@/lib/v2/useActor";
import { useAuditEvents } from "@/lib/v2/auditEventStore";
import { approveAllocation } from "@/lib/v2/allocationStore";
import { buildCommand, toApiError } from "@/lib/v2/workflows";
import { openException } from "@/lib/v2/exceptionStore";
import type { CreateOperationalExceptionDto } from "@/lib/types/v2/exception";
import type { HydratedOrder } from "@/lib/v2/projections";
import type { OrderAllocationTableRow } from "@/lib/types/v2/orderRequest";
import type { ExceptionState } from "@/lib/types/v2/status";

interface OrderDetailProps {
  userRole?: UserRole;
}

interface ComplaintDraftItem {
  id: string;
  productName: string;
  poLineNumber?: string;
  orderedQty: number;
  systemDeliveredQty: number;
  actualReceivedQty: number;
}

interface LegacyComplaintAdapter {
  complaint?: {
    id: string;
    status: "pending" | "approved" | "rejected";
    remarks: string;
    items: Array<{ systemDeliveredQty: number; actualReceivedQty: number; deltaQty: number }>;
    history: Array<{ id: string; action: string; actor: string; timestamp: string; note?: string }>;
  };
  complaintItems: ComplaintDraftItem[];
}

interface AdminOrderWorkbenchViewModel {
  order: HydratedOrder["order"];
  workflowBatch: HydratedOrder["shipmentBatches"][number] | undefined;
  allocationRows: OrderAllocationTableRow[];
  auditRows: ReturnType<typeof buildOrderAuditRows>;
  exceptionState: ExceptionState;
  summaryStats: Array<{ label: string; value: string; hint?: string; color?: string }>;
  documentStats: Array<{ label: string; value: string }>;
  topSummary: Array<{ label: string; value: string; emphasis?: boolean }>;
  focusCard: {
    eyebrow: string;
    title: string;
    description: string;
  };
}

type OrderDetailTab = "overview" | "operations" | "documents" | "compliance" | "audit";
const ORDER_DETAIL_TABS: Array<{ value: OrderDetailTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "operations", label: "Operations" },
  { value: "documents", label: "Documents" },
  { value: "compliance", label: "Compliance" },
  { value: "audit", label: "Audit" },
];

const TABLE_LINK_CLASS = "text-link hover:underline";

export function OrderDetail({ userRole = "admin" }: OrderDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const hydrated = useHydratedOrder(id);
  const legacyComplaint = useLegacyComplaintAdapter(hydrated?.order.id);
  const actor = useActor(userRole, "order-detail");
  const auditEvents = useAuditEvents();

  const allocationRows = useMemo(
    () => (hydrated ? buildAllocationRows(hydrated) : []),
    [hydrated],
  );
  const orderAudit = useMemo(
    () => buildOrderAuditRows(hydrated, auditEvents),
    [auditEvents, hydrated],
  );

  const viewModel = useMemo(
    () => (hydrated ? buildAdminOrderWorkbenchViewModel(hydrated, allocationRows, orderAudit) : null),
    [allocationRows, hydrated, orderAudit],
  );

  const totalReadyQty = useMemo(
    () => hydrated?.productionJobs.reduce((sum, job) => sum + job.readyQuantity, 0) ?? 0,
    [hydrated],
  );
  const isProductionPhase = hydrated
    ? hydrated.productionStatus === "IN_PROGRESS" || hydrated.productionStatus === "EXCEPTION"
    : false;
  const canAmend = hydrated
    ? (hydrated.productionStatus === "NEW" || hydrated.productionStatus === "SUBMITTED" || hydrated.productionStatus === "ACCEPTED") &&
      (userRole === "admin" || userRole === "operator")
    : false;

  const canCreateBatch =
    (userRole === "admin" || userRole === "operator" || userRole === "vendor") &&
    totalReadyQty > 0 &&
    allocationRows.some((row) => row.canAddToBatch);
  const canRaiseComplaint = userRole === "admin" || userRole === "operator";

  const visibleTabs = useMemo(() => {
    if (!isProductionPhase) return ORDER_DETAIL_TABS;
    return ORDER_DETAIL_TABS.filter((tab) =>
      ["overview", "operations", "audit"].includes(tab.value),
    ).map((tab) =>
      tab.value === "operations"
        ? { ...tab, label: "Allocations & Jobs" }
        : tab,
    );
  }, [isProductionPhase]);

  const [activeTab, setActiveTab] = useState<OrderDetailTab>("overview");

  useEffect(() => {
    if (isProductionPhase && !["overview", "operations", "audit"].includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [isProductionPhase, activeTab]);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isComplaintDialogOpen, setIsComplaintDialogOpen] = useState(false);
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(true);
  const [isExceptionsExpanded, setIsExceptionsExpanded] = useState(true);
  const [isNotesExpanded, setIsNotesExpanded] = useState(true);
  const [complaintRemarks, setComplaintRemarks] = useState("");
  const [complaintDraftItems, setComplaintDraftItems] = useState<ComplaintDraftItem[]>(legacyComplaint.complaintItems);

  if (!hydrated || !viewModel) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole={userRole} />
        <ContentArea>
          <Header
            title={id ?? "Order detail"}
            breadcrumbs={[
              { label: "All Orders", to: userRole === "admin" ? "/admin/orders" : `/${userRole}/orders` },
              { label: id ?? "Order detail" },
            ]}
          />
          <main className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-5xl">
              <Alert>
                <AlertTitle>Order not found</AlertTitle>
                <AlertDescription>
                  The requested order could not be resolved from the V2 workbench data.
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </ContentArea>
      </div>
    );
  }

  const backPath = userRole === "admin" ? "/admin/orders" : `/${userRole}/orders`;
  const complaint = legacyComplaint.complaint;
  const complaintLocked = complaint?.status === "pending";
  const deadlineDate = new Date(viewModel.order.deadlineDate);
  const deadlineDateLabel = formatDateLabel(viewModel.order.deadlineDate);
  const deadlineDaysLeft = Number.isNaN(deadlineDate.getTime())
    ? null
    : Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const latestNoteMeta = formatRelativeDateTime(viewModel.order.audit.updatedAt);
  const recentJobs = hydrated.productionJobs.slice(0, 3);

  const handleApproveAllocation = (allocationId: string) => {
    const allocation = hydrated.allocations.find((entry) => entry.id === allocationId);
    if (!allocation) return;

    try {
      approveAllocation(allocation.id, "Approved from order workbench.", allocation.version, buildCommand(actor));
      toast.success("Allocation approved.");
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  const openComplaintDialog = () => {
    setComplaintDraftItems(legacyComplaint.complaintItems.map((item) => ({ ...item })));
    setComplaintRemarks(complaint?.remarks ?? "");
    setIsComplaintDialogOpen(true);
  };

  const submitComplaint = () => {
    const affectedRefs = hydrated.allocations
      .filter((allocation) =>
        complaintDraftItems.some((item) => item.id === allocation.orderItemId)
      )
      .map((allocation) => ({
        entityType: "SALES_POINT_ALLOCATION" as const,
        entityId: allocation.id,
      }));

    openException(
      {
        type: "QUANTITY_VARIANCE",
        severity: "HIGH",
        ownerRole: "VENDOR",
        sourceEntityType: "ORDER_REQUEST",
        sourceEntityId: hydrated.order.id,
        affectedEntityRefs: affectedRefs,
        title: `Quantity variance on order ${hydrated.order.orderRequestNumber}`,
        description: complaintRemarks.trim() || "Admin flagged a quantity discrepancy on this order.",
        dueAt: undefined,
      } satisfies CreateOperationalExceptionDto,
      buildCommand(actor, "Raise quantity variance from admin order detail"),
    );

    toast.success("Quantity variance reported. Vendor has been notified.");
    setIsComplaintDialogOpen(false);
  };

  const adjustComplaintItem = (index: number, delta: number) => {
    setComplaintDraftItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              actualReceivedQty: clampQuantity(item.actualReceivedQty + delta, item.orderedQty),
            }
          : item,
      ),
    );
  };

  const renderWorkflowActions = (size: "default" | "sm" = "sm") => (
    <>
      {canAmend ? (
        <Button size={size} onClick={() => navigate(`/${userRole}/orders/${hydrated!.order.id}/amend`)}>
          <Pencil className="h-4 w-4" />
          Amend Order
        </Button>
      ) : isProductionPhase ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-processing/30 bg-processing/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-processing">
          Production Ongoing (Order Locked)
        </span>
      ) : canCreateBatch ? (
        <Button size={size} onClick={() => setIsBatchDialogOpen(true)}>
          Create Shipment Batch
        </Button>
      ) : null}
      {viewModel.workflowBatch ? (
        <Button asChild variant="outline" size={size}>
          <Link to={`/${userRole}/shipments/${viewModel.workflowBatch.id}`}>
            <Package className="h-4 w-4" />
            Open Active Batch
          </Link>
        </Button>
      ) : null}
      {viewModel.workflowBatch?.deliveryNoteId ? (
        <Button asChild variant="outline" size={size}>
          <Link to={`/${userRole}/shipments/${viewModel.workflowBatch.id}/delivery-note`}>
            <Printer className="h-4 w-4" />
            Delivery Note
          </Link>
        </Button>
      ) : null}
      {viewModel.workflowBatch ? (
        <Button asChild variant="outline" size={size}>
          <Link to={`/${userRole}/shipments/${viewModel.workflowBatch.id}/labels`}>
            <Package className="h-4 w-4" />
            Labels
          </Link>
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size}>
            <MoreHorizontal className="h-4 w-4" />
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {canRaiseComplaint && !isProductionPhase ? (
            <DropdownMenuItem onSelect={openComplaintDialog}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              {complaint ? "Review Complaint" : "Raise Complaint"}
            </DropdownMenuItem>
          ) : null}
          {!isProductionPhase ? (
            <DropdownMenuItem onSelect={() => setActiveTab("compliance")}>
              <ShieldAlert className="mr-2 h-4 w-4" />
              Open Compliance
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setActiveTab("audit")}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Open Audit Trail
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header
          title={viewModel.order.orderRequestNumber}
          breadcrumbs={[
            { label: "All Orders", to: backPath },
            { label: viewModel.order.orderRequestNumber },
          ]}
          actions={renderWorkflowActions()}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1440px]">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">


                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrderDetailTab)} className="space-y-5">
                  <TabsList className="mb-6">
                    {visibleTabs.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="overview" className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {viewModel.summaryStats.map((stat) => (
                        <OverviewStat key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} color={stat.color} />
                      ))}
                    </div>

                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>{isProductionPhase ? "Production Pipeline" : "Delivery Progress"}</CardTitle>
                        <CardDescription>
                          {isProductionPhase
                            ? "Current production stage and readiness."
                            : "Order-level shipment and receipt progress."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center p-5">
                        <div className="w-full max-w-2xl">
                          {isProductionPhase ? (
                            <ProductionPipelineStepper
                              productionStatus={hydrated.productionStatus}
                              jobStatuses={hydrated.productionJobs.map((j) => j.status)}
                              className="w-full justify-center"
                            />
                          ) : (
                            <DeliveryProgressBar
                              receivedQuantity={viewModel.order.quantitySummary.receivedQuantity}
                              allocatedQuantity={viewModel.order.quantitySummary.allocatedQuantity}
                              shippedQuantity={viewModel.order.quantitySummary.shippedQuantity}
                            />
                          )}
                        </div>
                        {isProductionPhase && totalReadyQty > 0 ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {totalReadyQty} / {viewModel.order.quantitySummary.orderedQuantity} pcs ready for shipping
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>

                    {viewModel.workflowBatch ? (
                      <Card className="border-border/70 shadow-sm">
                        <CardHeader className="border-b bg-muted/20">
                          <div className="flex items-center justify-between">
                            <CardTitle>Active Shipment Batch</CardTitle>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 text-sm font-medium text-link hover:underline"
                              onClick={() => navigate(`/${userRole}/shipments/${viewModel.workflowBatch!.id}`)}
                            >
                              Open Batch
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              to={`/${userRole}/shipments/${viewModel.workflowBatch.id}`}
                              className={TABLE_LINK_CLASS}
                            >
                              {viewModel.workflowBatch.batchNumber}
                            </Link>
                            <ShipmentBatchStatusBadge status={viewModel.workflowBatch.status} />
                          </div>

                          <div className="mt-4 grid gap-4 sm:grid-cols-4">
                            <KeyMetric label="Shipped" value={`${viewModel.workflowBatch.quantitySummary.shippedQuantity} pcs`} />
                            <KeyMetric label="Received" value={`${viewModel.workflowBatch.quantitySummary.verifiedReceivedQuantity} pcs`} />
                            <KeyMetric label="Status" value={formatBatchStatusLabel(viewModel.workflowBatch.status)} />
                            <KeyMetric label="Proof of Delivery (POD)" value={formatPodLabel(hydrated.podStatus)} />
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}

                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>Recent Production Jobs</CardTitle>
                        <CardDescription>Latest jobs for this order.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Job</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Ordered</TableHead>
                              <TableHead className="text-right">Ready</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentJobs.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                  No production jobs have been generated yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              recentJobs.map((job) => {
                                const item = hydrated.order.items.find((entry) => entry.id === job.orderItemId);
                                const jobLink = userRole === "admin" ? `/admin/production/${job.id}` : null;
                                return (
                                  <TableRow key={job.id}>
                                    <TableCell className="font-mono text-xs">
                                      {jobLink ? (
                                        <Link to={jobLink} className={TABLE_LINK_CLASS}>
                                          {job.jobNumber}
                                        </Link>
                                      ) : (
                                        job.jobNumber
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm">{item?.description ?? job.orderItemId}</TableCell>
                                    <TableCell className="text-right text-sm tabular-nums">{job.orderedQuantity}</TableCell>
                                    <TableCell className="text-right text-sm tabular-nums">{job.readyQuantity}</TableCell>
                                    <TableCell>
                                      <ProductionStatusBadge status={job.status} />
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                      {hydrated.productionJobs.length > 3 ? (
                        <div className="border-t border-border/60 px-5 py-4">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-sm font-medium text-link hover:underline"
                            onClick={() => setActiveTab("operations")}
                          >
                            View all production jobs
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </Card>
                  </TabsContent>

                  <TabsContent value="operations" className="space-y-5">
                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>Allocations</CardTitle>
                        <CardDescription>
                          Distribution plan by sales point, including outstanding quantity and POD exposure.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <SalesPointAllocationTable rows={allocationRows} onApprove={handleApproveAllocation} />
                      </CardContent>
                    </Card>

                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>Production</CardTitle>
                        <CardDescription>
                          Jobs generated for this order and their current readiness.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Job</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Ordered</TableHead>
                              <TableHead className="text-right">Ready</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {hydrated.productionJobs.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                  No production jobs have been generated yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              hydrated.productionJobs.map((job) => {
                                const item = hydrated.order.items.find((entry) => entry.id === job.orderItemId);
                                const jobLink = userRole === "admin" ? `/admin/production/${job.id}` : null;
                                return (
                                  <TableRow key={job.id}>
                                    <TableCell className="font-mono text-xs">
                                      {jobLink ? (
                                        <Link to={jobLink} className={TABLE_LINK_CLASS}>
                                          {job.jobNumber}
                                        </Link>
                                      ) : (
                                        job.jobNumber
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm">{item?.description ?? job.orderItemId}</TableCell>
                                    <TableCell className="text-right text-sm tabular-nums">{job.orderedQuantity}</TableCell>
                                    <TableCell className="text-right text-sm tabular-nums">{job.readyQuantity}</TableCell>
                                    <TableCell>
                                      <ProductionStatusBadge status={job.status} />
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>Shipment Batches</CardTitle>
                        <CardDescription>
                          Batch-scoped execution is the source of shipment, document, and POD progress.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Batch</TableHead>
                              <TableHead className="text-right">Shipped</TableHead>
                              <TableHead className="text-right">Received</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Proof of Delivery (POD)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {hydrated.shipmentBatches.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                  No shipment batches yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              hydrated.shipmentBatches.map((batch) => (
                                <TableRow key={batch.id}>
                                  <TableCell className="font-mono text-xs">
                                    <Link to={`/${userRole}/shipments/${batch.id}`} className={TABLE_LINK_CLASS}>
                                      {batch.batchNumber}
                                    </Link>
                                  </TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {batch.quantitySummary.shippedQuantity}
                                  </TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {batch.quantitySummary.verifiedReceivedQuantity}
                                  </TableCell>
                                  <TableCell>
                                    <ShipmentBatchStatusBadge status={batch.status} />
                                  </TableCell>
                                  <TableCell>
                                    <PodStatusBadge status={batch.podStatus} />
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-5">
                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>Delivery Notes</CardTitle>
                        <CardDescription>
                          Delivery notes remain batch-scoped and inherit shipment lifecycle state.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Delivery Note</TableHead>
                              <TableHead>Batch</TableHead>
                              <TableHead className="text-right">Shipped</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {hydrated.deliveryNotes.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                  No delivery notes yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              hydrated.deliveryNotes.map((note) => (
                                <TableRow key={note.id}>
                                  <TableCell className="font-mono text-xs">
                                    <Link
                                      to={`/${userRole}/shipments/${note.shipmentBatchId}/delivery-note`}
                                      className={TABLE_LINK_CLASS}
                                    >
                                      {note.deliveryNoteNumber}
                                    </Link>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{note.batchNumber}</TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {note.quantitySummary.shippedQuantity}
                                  </TableCell>
                                  <TableCell>
                                    <DeliveryNoteStatusBadge status={note.status} />
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>References</CardTitle>
                        <CardDescription>Order metadata used across document and shipment work.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                        <DetailPair label="Requester" value={viewModel.order.requester.name} />
                        <DetailPair label="Source" value={viewModel.order.source.replace(/_/g, " ")} />
                        <DetailPair label="Priority" value={viewModel.order.priority.replace(/_/g, " ")} />
                        <DetailPair
                          label="References"
                          value={
                            viewModel.order.externalReferences.length > 0
                              ? viewModel.order.externalReferences.map((reference) => reference.value).join(", ")
                              : "—"
                          }
                          mono={viewModel.order.externalReferences.length > 0}
                        />

                        <DetailPair
                          label="Link"
                          value={
                            viewModel.order.referenceLink ? (
                              <a
                                href={viewModel.order.referenceLink.url}
                                target="_blank"
                                rel="noreferrer"
                                className="break-words text-sm font-medium text-link hover:underline"
                                title={viewModel.order.referenceLink.url}
                              >
                                {viewModel.order.referenceLink.displayTitle?.trim() || viewModel.order.referenceLink.url}
                              </a>
                            ) : (
                              "—"
                            )
                          }
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="compliance" className="space-y-5">
                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>Proof of Delivery</CardTitle>
                        <CardDescription>
                          Submitted and verified receipts by sales point.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Sales Point</TableHead>
                              <TableHead>Receiver</TableHead>
                              <TableHead className="text-right">Claimed</TableHead>
                              <TableHead className="text-right">Verified</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {hydrated.deliveryConfirmations.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                  No Proof of Delivery (POD) submissions yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              hydrated.deliveryConfirmations.map((confirmation) => (
                                <TableRow key={confirmation.id}>
                                  <TableCell className="text-sm">{confirmation.salesPointName}</TableCell>
                                  <TableCell className="text-sm">{confirmation.receiverName || "—"}</TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {confirmation.quantitySummary.claimedReceivedQuantity}
                                  </TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {confirmation.quantitySummary.verifiedReceivedQuantity}
                                  </TableCell>
                                  <TableCell>
                                    <DeliveryConfirmationStatusBadge status={confirmation.status} />
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>Exceptions & Complaints</CardTitle>
                        <CardDescription>
                          Keep quantity variance and exception handling visible without crowding the main workbench.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <ExceptionStateBadge status={viewModel.exceptionState} />
                        </div>

                        {hydrated.order.exceptionSummary.hasException && (
                          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
                            <p className="text-sm font-semibold text-destructive">
                              {hydrated.order.exceptionSummary.exceptionCount} Open Exception
                              {hydrated.order.exceptionSummary.exceptionCount > 1 ? "s" : ""}
                            </p>
                            {hydrated.order.exceptionSummary.latestExceptionReason && (
                              <p className="mt-1 text-xs text-muted-foreground">{hydrated.order.exceptionSummary.latestExceptionReason}</p>
                            )}
                          </div>
                        )}

                        {!hydrated.order.exceptionSummary.hasException && (
                          <p className="text-sm text-muted-foreground">No active exceptions on this order.</p>
                        )}

                        {canRaiseComplaint ? (
                          <Button onClick={openComplaintDialog} variant={complaint ? "outline" : "default"} className="rounded-xl">
                            <AlertTriangle className="h-4 w-4" />
                            {complaint ? "Review Complaint" : "Raise Complaint"}
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>

                    {complaint?.history.length ? (
                      <Card className="border-border/70 shadow-sm">
                        <CardHeader className="border-b bg-muted/20">
                          <CardTitle>Complaint History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-5">
                          {complaint.history.map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-border/60 bg-card p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium">{entry.action.replace(/-/g, " ")}</p>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{entry.actor}</p>
                              {entry.note ? <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p> : null}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="audit">
                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="border-b bg-muted/20">
                        <CardTitle>Audit History</CardTitle>
                        <CardDescription>
                          Unified event trail across the order, allocations, production, shipment, documents, and POD.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>When</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Entity</TableHead>
                              <TableHead>Actor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewModel.auditRows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                  No audit events recorded.
                                </TableCell>
                              </TableRow>
                            ) : (
                              viewModel.auditRows.map((event) => (
                                <TableRow key={event.id}>
                                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                    {event.occurredAt.replace("T", " ").slice(0, 19)}
                                  </TableCell>
                                  <TableCell className="text-sm">{event.eventType}</TableCell>
                                  <TableCell className="text-xs">{event.sourceEntityType}</TableCell>
                                  <TableCell className="text-xs">
                                    {event.actorUserId} · {event.actorRole}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-[84px] xl:self-start">
                <Card className="overflow-hidden border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="flex items-center justify-between">
                      <span>At a Glance</span>
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0 p-0">
                    <div className="space-y-4 border-b border-border/60 p-5">
                      <p className="text-base font-semibold">Current State</p>
                      <div className="inline-flex rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-sm font-medium text-foreground">
                        {formatDistributionLabel(hydrated.distributionStatus)}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-warning">{viewModel.focusCard.eyebrow}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{viewModel.focusCard.title.toLowerCase()}</p>
                      </div>
                    </div>

                    <div className="space-y-5 border-b border-border/60 p-5">
                      <p className="text-base font-semibold">Order Essentials</p>
                      <RailDetail label="Project" value={viewModel.order.project.name} />
                      <RailDetail label="Vendor" value={viewModel.order.vendor.name} />
                      <RailDetail label="Client PO" value={viewModel.order.clientPoNumber ?? "—"} />
                      <RailDetail label="Deadline" value={deadlineDateLabel} subvalue={deadlineDaysLeft !== null ? `${deadlineDaysLeft} day${deadlineDaysLeft === 1 ? "" : "s"} left` : undefined} strong />
                    </div>

                    {!isProductionPhase ? (
                      <>
                        <div className="border-b border-border/60">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between p-5 text-left"
                            onClick={() => setIsDocumentsExpanded((current) => !current)}
                          >
                            <span className="text-base font-semibold">Documents</span>
                            {isDocumentsExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          {isDocumentsExpanded ? (
                            <div className="grid gap-3 border-t border-border/60 p-5 sm:grid-cols-2">
                              {viewModel.documentStats.map((stat) => (
                                <DocumentStat key={stat.label} label={stat.label} value={stat.value} />
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="border-b border-border/60">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between p-5 text-left"
                            onClick={() => setIsExceptionsExpanded((current) => !current)}
                          >
                            <span className="text-base font-semibold">Exceptions & Complaints</span>
                            {isExceptionsExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          {isExceptionsExpanded ? (
                            <div className="space-y-4 border-t border-border/60 p-5">
                              {hydrated.order.exceptionSummary.hasException && (
                                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
                                  <p className="text-sm font-semibold text-destructive">
                                    {hydrated.order.exceptionSummary.exceptionCount} Open Exception
                                    {hydrated.order.exceptionSummary.exceptionCount > 1 ? "s" : ""}
                                  </p>
                                  {hydrated.order.exceptionSummary.latestExceptionReason && (
                                    <p className="mt-1 text-xs text-muted-foreground">{hydrated.order.exceptionSummary.latestExceptionReason}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : null}

                    <div>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-5 text-left"
                        onClick={() => setIsNotesExpanded((current) => !current)}
                      >
                        <span className="text-base font-semibold">Internal Note</span>
                        {isNotesExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {isNotesExpanded ? (
                        <div className="space-y-4 border-t border-border/60 p-5">
                          <p className="text-sm leading-6 text-muted-foreground">
                            {viewModel.order.remarks ?? "No internal notes recorded for this order."}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {latestNoteMeta} · {viewModel.order.requester.name}
                          </p>
                          <button
                            type="button"
                            className="text-sm font-medium text-link hover:underline"
                            onClick={() => setActiveTab("audit")}
                          >
                            View all notes
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </main>
      </ContentArea>

      <Dialog open={isComplaintDialogOpen} onOpenChange={setIsComplaintDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{complaint ? "Complaint Review" : "Report Quantity Variance"}</DialogTitle>
            <DialogDescription>
              {complaint
                ? "Review the submitted actual received quantities and vendor response."
                : "Record the actual received quantity for each item before sending the revision request to vendor."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Order</p>
                  <p className="mt-1 text-sm font-medium">{viewModel.order.orderRequestNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Complaint Status
                  </p>
                  <div className="mt-2">
                    <StatusChip status={complaint?.status ?? "pending"} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {complaintDraftItems.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-border/60 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">PO Line {item.poLineNumber ?? "—"}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <OverviewStat label="Ordered" value={`${item.orderedQty} pcs`} />
                      <OverviewStat label="System Delivered" value={`${item.systemDeliveredQty} pcs`} />
                      <OverviewStat
                        label="Delta"
                        value={`${Math.max(item.systemDeliveredQty - item.actualReceivedQty, 0)} pcs`}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Actual Received Qty
                    </p>
                    <Input
                      type="number"
                      min={0}
                      max={item.orderedQty}
                      value={item.actualReceivedQty}
                      disabled={complaintLocked}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value) || 0;
                        setComplaintDraftItems((current) =>
                          current.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  actualReceivedQty: clampQuantity(nextValue, currentItem.orderedQty),
                                }
                              : currentItem,
                          ),
                        );
                      }}
                    />
                  </div>
                  {!complaintLocked ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, -5)}>
                        -5
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, -1)}>
                        -1
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, 1)}>
                        +1
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, 5)}>
                        +5
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Variance Description</p>
              <Textarea
                value={complaintRemarks}
                disabled={complaintLocked}
                onChange={(event) => setComplaintRemarks(event.target.value)}
                placeholder="Explain the discrepancy and expected correction."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsComplaintDialogOpen(false)}>
              Close
            </Button>
            {!complaintLocked ? (
              <Button onClick={submitComplaint}>
                <Send className="h-4 w-4" />
                Report Variance
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateBatchDialog
        open={isBatchDialogOpen}
        onOpenChange={setIsBatchDialogOpen}
        order={hydrated}
        actor={actor}
      />
    </div>
  );
}

function useLegacyComplaintAdapter(orderId: string | undefined): LegacyComplaintAdapter {
  const orders = useOrders();

  return useMemo(() => {
    const legacyOrder = orderId ? orders.find((entry) => entry.id === orderId) : undefined;
     
    const legacy = legacyOrder as any;
    const complaint = legacy?.complaint as Record<string, unknown> | undefined;

     
    return {
      complaint,
      complaintItems: (legacyOrder?.items ?? []).map((item: { id: string; name: string; poLineNumber: string; quantity: number; deliveredQuantity?: number }) => ({
        id: item.id,
        productName: item.name,
        poLineNumber: item.poLineNumber,
        orderedQty: item.quantity,
        systemDeliveredQty: item.deliveredQuantity ?? item.quantity,
        actualReceivedQty:
          (complaint?.items as Array<Record<string, unknown>> | undefined)?.find((entry: Record<string, unknown>) => entry.lineId === item.id)?.actualReceivedQty ??
          item.deliveredQuantity ??
          item.quantity,
      })) ?? [],
    } as LegacyComplaintAdapter;
  }, [orderId, orders]);
}

function buildAdminOrderWorkbenchViewModel(
  hydrated: HydratedOrder,
  allocationRows: OrderAllocationTableRow[],
  auditRows: ReturnType<typeof buildOrderAuditRows>,
): AdminOrderWorkbenchViewModel {
  const { order } = hydrated;
  const workflowBatch = pickWorkflowBatch(hydrated.shipmentBatches);
  const exceptionState = deriveOrderExceptionState(order.exceptionSummary);

  return {
    order,
    workflowBatch,
    allocationRows,
    auditRows,
    exceptionState,
    summaryStats: [
      {
        label: "Ordered",
        value: `${order.quantitySummary.orderedQuantity} pcs`,
        color: "text-primary",
      },
      {
        label: "Allocated",
        value: `${order.quantitySummary.allocatedQuantity} pcs`,
        hint: `${order.quantitySummary.salesPointCount} sales point${order.quantitySummary.salesPointCount === 1 ? "" : "s"}`,
        color: "text-primary",
      },
      {
        label: "Shipped",
        value: `${order.quantitySummary.shippedQuantity} pcs`,
        hint: `${order.documentSummary.shipmentBatchCount} batch${order.documentSummary.shipmentBatchCount === 1 ? "" : "es"}`,
        color: "text-processing",
      },
      {
        label: "Received",
        value: `${order.quantitySummary.receivedQuantity} pcs`,
        hint: `${order.quantitySummary.openPodIssueCount} open Proof of Delivery (POD) issue${order.quantitySummary.openPodIssueCount === 1 ? "" : "s"}`,
        color: "text-success",
      },
    ],
    documentStats: [
      {
        label: "Delivery Notes",
        value: `${order.documentSummary.deliveryNoteCount}`,
      },
      {
        label: "Proof of Delivery (POD)",
        value: `${order.documentSummary.uploadedPodCount}`,
      },
      {
        label: "Batches",
        value: `${order.documentSummary.shipmentBatchCount}`,
      },
      {
        label: "Labels",
        value: `${order.documentSummary.printedDeliveryNoteCount}`,
      },
    ],
    topSummary: [
      {
        label: "Vendor",
        value: order.vendor.name,
        emphasis: true,
      },
      {
        label: "Deadline",
        value: order.deadlineDate,
      },
      {
        label: "Client PO",
        value: order.clientPoNumber ?? "—",
      },
      {
        label: "Reference",
        value: order.id,
      },
    ],
    focusCard: buildFocusCard(hydrated, allocationRows, workflowBatch, exceptionState),
  };
}

function buildOrderAuditRows(
  hydrated: HydratedOrder | undefined,
  auditEvents: ReturnType<typeof useAuditEvents>,
) {
  if (!hydrated) {
    return [];
  }

  return auditEvents
    .filter(
      (event) =>
        event.sourceEntityId === hydrated.order.id ||
        hydrated.allocations.some((allocation) => allocation.id === event.sourceEntityId) ||
        hydrated.productionJobs.some((job) => job.id === event.sourceEntityId) ||
        hydrated.shipmentBatches.some((batch) => batch.id === event.sourceEntityId) ||
        hydrated.deliveryNotes.some((note) => note.id === event.sourceEntityId) ||
        hydrated.deliveryConfirmations.some((confirmation) => confirmation.id === event.sourceEntityId),
    )
    .slice()
    .reverse();
}

function deriveOrderExceptionState(summary: HydratedOrder["order"]["exceptionSummary"]): ExceptionState {
  if (!summary.hasException) {
    return "NONE";
  }

  return summary.highestSeverity === "CRITICAL" ? "BLOCKED" : "WARNING";
}

function buildFocusCard(
  hydrated: HydratedOrder,
  allocationRows: OrderAllocationTableRow[],
  workflowBatch: HydratedOrder["shipmentBatches"][number] | undefined,
  exceptionState: ExceptionState,
) {
  const totalReadyQty = hydrated.productionJobs.reduce((sum, job) => sum + job.readyQuantity, 0);
  const isPreProduction =
    hydrated.productionStatus === "NEW" ||
    hydrated.productionStatus === "SUBMITTED" ||
    hydrated.productionStatus === "ACCEPTED";
  const inProductionPhase = hydrated.productionStatus === "IN_PROGRESS" || hydrated.productionStatus === "EXCEPTION";

  if (isPreProduction) {
    return {
      eyebrow: "Order Request Created",
      title: "Waiting for production start",
      description:
        "This order has been created and is waiting to enter production. Use 'Amend Order' to modify details before production begins.",
    };
  }

  if (inProductionPhase) {
    return {
      eyebrow: "Production Phase",
      title: "Waiting for production progress",
      description:
        "The vendor is manufacturing the items. Shipment batch creation will unlock once ready quantities are reported.",
    };
  }

  if (exceptionState === "BLOCKED") {
    return {
      eyebrow: "Attention required",
      title: "Order is blocked by an active exception",
      description:
        hydrated.order.exceptionSummary.latestExceptionReason ??
        "Resolve the active exception before pushing the order forward.",
    };
  }

  if (hydrated.deliveryConfirmations.length > 0 && hydrated.podStatus !== "VERIFIED") {
    return {
      eyebrow: "Proof of Delivery (POD) review",
      title: "Proof of Delivery (POD) review is the current bottleneck",
      description:
        "Proof of Delivery (POD) review is the current bottleneck.",
    };
  }

  if (workflowBatch) {
    return {
      eyebrow: "Active shipment",
      title: `${workflowBatch.batchNumber} is driving this order forward`,
      description:
        "Active shipment is driving this order forward.",
    };
  }

  if (allocationRows.some((row) => row.canAddToBatch)) {
    return {
      eyebrow: "Ready for distribution",
      title: "Outstanding allocations can be moved into a shipment batch",
      description:
        "Outstanding allocations can be moved into a shipment batch.",
    };
  }

  return {
    eyebrow: "Order workbench",
    title: "Monitor production, shipment, and receipt from one screen",
    description:
      "Monitor production, shipment, and receipt from one screen.",
  };
}

function clampQuantity(value: number, max: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.round(value), max));
}

function OverviewStat({ label, value, hint, color, compact }: { label: string; value: string; hint?: string; color?: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-background px-4 py-3 transition-colors hover:border-primary/40">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className={`mt-0.5 text-lg font-semibold tracking-tight ${color ?? "text-primary"}`}>{value}</p>
        </div>
        {hint && <p className="shrink-0 text-[10px] text-muted-foreground">{hint}</p>}
      </div>
    );
  }

  return (
    <Card className="group cursor-pointer border-border/70 shadow-sm transition-colors hover:border-primary/40">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className={`text-3xl ${color ?? "text-primary"}`}>{value}</CardTitle>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </CardHeader>
      <CardContent className="flex items-center justify-between pt-0">
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : (
          <span />
        )}
      </CardContent>
    </Card>
  );
}


function KeyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function DetailPair({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className={cn("text-sm font-medium", mono && "font-mono")}>{value}</div>
    </div>
  );
}

function RailDetail({
  label,
  value,
  subvalue,
  strong = false,
}: {
  label: string;
  value: string;
  subvalue?: string;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div>
        <p className={cn("text-sm", strong ? "font-semibold text-foreground" : "text-foreground")}>{value}</p>
        {subvalue ? <p className="mt-1 text-sm text-muted-foreground">{subvalue}</p> : null}
      </div>
    </div>
  );
}

function DocumentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status: "pending" | "approved" | "rejected" }) {
  const config =
    status === "approved"
      ? { icon: CheckCircle2, label: "Approved", className: "border-success/30 bg-success/10 text-success" }
      : status === "rejected"
        ? { icon: XCircle, label: "Rejected", className: "border-destructive/30 bg-destructive/10 text-destructive" }
        : { icon: ClipboardList, label: "Pending", className: "border-warning/30 bg-warning/10 text-warning" };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]",
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatRelativeDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 1) {
    return "Less than 1 hour ago";
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function formatDistributionLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBatchStatusLabel(status: string) {
  return formatDistributionLabel(status);
}

function formatPodLabel(status: string) {
  return formatDistributionLabel(status);
}

function pickWorkflowBatch<T extends { status: string }>(batches: T[]): T | undefined {
  return (
    batches
      .slice()
      .reverse()
      .find((batch) => !["CLOSED", "FULLY_RECEIVED", "CANCELLED", "VOIDED"].includes(batch.status)) ??
    batches.at(-1)
  );
}
