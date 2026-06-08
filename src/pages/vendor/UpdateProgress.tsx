import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { resolveQuantityComplaint, useOrders } from "@/lib/orderStore";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  AlertTriangle,
  CheckCircle2,
  Save, 
  History, 
  Plus, 
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function VendorUpdateProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orders = useOrders();
  const order = orders.find((o) => o.id === id) || orders[0];
  const complaint = order.complaint;
  const complaintSummary = useMemo(() => {
    if (!complaint) {
      return null;
    }

    return {
      ordered: complaint.items.reduce((total, item) => total + item.orderedQty, 0),
      delivered: complaint.items.reduce((total, item) => total + item.systemDeliveredQty, 0),
      actual: complaint.items.reduce((total, item) => total + item.actualReceivedQty, 0),
      delta: complaint.items.reduce((total, item) => total + item.deltaQty, 0),
    };
  }, [complaint]);

  const total = getTotalQuantity(order);
  const [production, setProduction] = useState(() => Math.max(Math.round(total * 0.7), 0));
  const [ready, setReady] = useState(() => Math.max(Math.round(total * 0.4), 0));
  const [shipping, setShipping] = useState(() => Math.max(Math.round(total * 0.2), 0));
  const [vendorNote, setVendorNote] = useState("");

  useEffect(() => {
    setProduction(Math.max(Math.round(total * 0.7), 0));
    setReady(Math.max(Math.round(total * 0.4), 0));
    setShipping(Math.max(Math.round(total * 0.2), 0));
  }, [order.id, total]);

  const handleComplaintDecision = (decision: "approved" | "rejected") => {
    if (!complaint) {
      return;
    }

    resolveQuantityComplaint(order.id, {
      decision,
      reviewedBy: "Vendor Admin",
      reviewNote: vendorNote.trim() || (decision === "approved" ? "Vendor approved the quantity revision." : "Vendor rejected the quantity revision."),
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="vendor" />
      <div className="flex-1">
        <Header title={`Update Progress: ${order.id}`} />
        
        <main className="p-8 max-w-5xl mx-auto space-y-6">
          {/* Header Actions */}
          <section className="flex items-center justify-between animate-in-smart">
            <Link to="/vendor" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Discard Changes
            </Link>

            <button 
              onClick={() => navigate('/vendor')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-all shadow-md btn-press"
            >
              <Save className="w-3.5 h-3.5" />
              Save Progress
            </button>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Main Update Form */}
            <div className="lg:col-span-2 space-y-6">
              <section className="overflow-hidden rounded-lg border border-border bg-white shadow-sm animate-in-smart" style={{ animationDelay: '100ms' }}>
                <div className="p-6 border-b border-border bg-accent/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold tracking-tight">{order.campaign}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">{order.id} · Total Quantity: {total}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="p-6 space-y-8">
                  <UpdateItem 
                    label="In Production" 
                    value={production} 
                    max={total} 
                    onChange={setProduction} 
                    color="text-primary"
                    bg="bg-primary/5"
                  />
                  <UpdateItem 
                    label="Ready to Ship" 
                    value={ready} 
                    max={production} 
                    onChange={setReady} 
                    color="text-processing"
                    bg="bg-processing/5"
                    helper="Must be ≤ In Production"
                  />
                  <UpdateItem 
                    label="On Delivery" 
                    value={shipping} 
                    max={ready} 
                    onChange={setShipping} 
                    color="text-processing"
                    bg="bg-processing/5"
                    helper="Must be ≤ Ready to Ship"
                  />
                </div>
              </section>

              {/* Conflict/Warning section if needed */}
              <section className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4 animate-in-smart" style={{ animationDelay: '200ms' }}>
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-warning uppercase tracking-widest">Update Policy</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Progress updates are sequential. You cannot mark items as "Ready to Ship" until they have been logged as "In Production".
                  </p>
                </div>
              </section>
            </div>

            {/* Live Summary Sidebar */}
            <div className="space-y-6">
              <section className="sticky top-24 rounded-lg border border-border bg-white p-6 shadow-sm animate-in-smart" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold tracking-tight">Fulfillment Summary</h3>
                </div>

                <div className="space-y-6">
                  <SummaryStat label="Production Rate" percentage={(production/total)*100} color="bg-primary" />
                  <SummaryStat label="Readiness" percentage={(ready/total)*100} color="bg-processing" />
                  <SummaryStat label="Delivery Completion" percentage={(shipping/total)*100} color="bg-success" />
                </div>

                <div className="mt-8 pt-6 border-t border-border flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-md">
                    <History className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">
                    Last updated <span className="font-bold text-foreground">2 hours ago</span> by <span className="font-bold text-foreground">Vendor Admin</span>
                  </div>
                </div>
              </section>

              {complaint ? (
                <Card className="border-border shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Complaint Review</CardTitle>
                    <CardDescription>Approve or reject the PMG quantity revision.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Complaint ID</p>
                        <p className="mt-1 text-sm font-medium">{complaint.id}</p>
                      </div>
                      <Badge variant={complaint.status === "approved" ? "success" : complaint.status === "rejected" ? "destructive" : "warning"} className="rounded-full uppercase tracking-[0.18em]">
                        {complaint.status}
                      </Badge>
                    </div>

                    {complaintSummary ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <MiniStat label="Ordered Qty" value={`${complaintSummary.ordered} pcs`} />
                        <MiniStat label="System Delivered" value={`${complaintSummary.delivered} pcs`} />
                        <MiniStat label="Actual Received" value={`${complaintSummary.actual} pcs`} />
                        <MiniStat label="Delta" value={`${complaintSummary.delta} pcs`} />
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {complaint.items.map((item) => (
                        <div key={item.lineId} className="rounded-lg border border-border/60 bg-background p-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">PO Line {item.poLineNumber}</p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>Delivered: {item.systemDeliveredQty} pcs</p>
                              <p>Actual: {item.actualReceivedQty} pcs</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs font-medium text-destructive">Missing {item.deltaQty} pcs</p>
                        </div>
                      ))}
                    </div>

                    <Textarea
                      value={vendorNote}
                      onChange={(event) => setVendorNote(event.target.value)}
                      placeholder="Add vendor review note before approval or rejection."
                    />

                    {complaint.status === "pending" ? (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleComplaintDecision("rejected")}>
                          <AlertTriangle className="h-4 w-4" />
                          Reject Revision
                        </Button>
                        <Button className="w-full sm:w-auto" onClick={() => handleComplaintDecision("approved")}>
                          <CheckCircle2 className="h-4 w-4" />
                          Approve Revision
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                        This complaint has already been reviewed by the vendor.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function getTotalQuantity(order: { items: Array<{ quantity: number }> }) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function UpdateItem({ label, value, max, onChange, color, bg, helper }: { label: string, value: number, max: number, onChange: (v: number) => void, color: string, bg: string, helper?: string }) {
  const increment = () => value < max && onChange(value + 1);
  const decrement = () => value > 0 && onChange(value - 1);

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/20 transition-all group">
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-foreground">{label}</h4>
        {helper && <p className="text-[10px] text-muted-foreground italic">{helper}</p>}
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total: {max}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center bg-accent/50 rounded-md p-1 border border-border shadow-inner">
          <button 
            onClick={decrement}
            className="p-1.5 hover:bg-white rounded shadow-sm text-muted-foreground hover:text-destructive transition-all btn-press"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input 
            type="number" 
            value={value}
            onChange={(e) => onChange(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-16 bg-transparent text-center text-sm font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button 
            onClick={increment}
            className="p-1.5 hover:bg-white rounded shadow-sm text-muted-foreground hover:text-primary transition-all btn-press"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-md", bg, color)}>
          {Math.round((value/max)*100)}%
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, percentage, color }: { label: string, percentage: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-border/50">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000 ease-out-expo", color)}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
