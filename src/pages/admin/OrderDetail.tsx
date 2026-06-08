import { Sidebar, UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { generateDeliveryNote } from "@/lib/deliveryNote";
import { getBaseOrderStatus } from "@/lib/orderStatus";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  FileText,
  Clock,
  Edit3,
  Trash2,
  ChevronDown,
  History,
  Printer,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrders } from "@/lib/orderStore";

interface OrderDetailProps {
  role?: UserRole;
}

export function OrderDetail({ role = "admin" }: OrderDetailProps) {
  const { id } = useParams();
  const orders = useOrders();
  const order = orders.find((entry) => entry.id === id) ?? orders[0];
  const deliveryNote = generateDeliveryNote(order);
  const deliverySnapshot = deliveryNote.deliverySnapshot;
  const fulfillmentStatus = getBaseOrderStatus(order.status);
  const totalOrdered = getTotalQuantity(order);
  const totalDelivered = deliveryNote.lines.reduce((total, line) => total + line.deliveredQty, 0);
  const totalOutstanding = deliveryNote.lines.reduce((total, line) => total + line.outstandingQty, 0);
  const backPath = role === "admin" ? "/admin/orders" : `/${role}/orders`;
  const deliveryNotePath = role === "admin" ? `/admin/orders/${order.id}/delivery-note` : `/${role}/orders/${order.id}/delivery-note`;
  const packagingLabelsPath = role === "admin" ? `/admin/orders/${order.id}/packaging-labels` : `/${role}/orders/${order.id}/packaging-labels`;

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title={`Order Details: ${order.id}`} />
        
        <main className="p-8 max-w-7xl mx-auto space-y-6">
          {/* Back Button & Actions */}
          <section className="flex items-center justify-between animate-in-smart">
            <Link to={backPath} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to All Orders
            </Link>

            <div className="flex items-center gap-2">
              <Link to={deliveryNotePath} className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-colors btn-press">
                <Printer className="w-3.5 h-3.5" />
                Delivery Note
              </Link>
              <Link to={packagingLabelsPath} className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-md text-xs font-bold hover:bg-accent transition-colors btn-press">
                <Package className="w-3.5 h-3.5" />
                Packaging Labels
              </Link>
              <button className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-md text-xs font-bold hover:bg-accent transition-colors btn-press">
                <Edit3 className="w-3.5 h-3.5" />
                Edit Order
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-white border border-destructive text-destructive rounded-md text-xs font-bold hover:bg-destructive/10 transition-colors btn-press">
                <Trash2 className="w-3.5 h-3.5" />
                Cancel OR
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Core Info & Line Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Overview Card */}
              <section className="bg-white rounded-lg border border-border shadow-sm overflow-hidden animate-in-smart" style={{ animationDelay: '100ms' }}>
                <div className="p-6 border-b border-border flex items-center justify-between bg-accent/5">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} className="px-3 py-1 text-xs" />
                    <span className="text-xs font-mono text-muted-foreground">OR Reference: {order.id}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      Created: {order.createdDate}
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <InfoItem label="Supplier" value={order.supplier} icon={User} />
                  <InfoItem label="Customer PO Ref" value={order.clientPO} icon={FileText} />
                  <InfoItem label="Destination" value={`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`} icon={MapPin} />
                  <InfoItem label="Deadline" value={order.deadline} icon={Clock} color={order.deadline === 'Overdue' ? 'text-destructive' : 'text-foreground'} />
                </div>
              </section>

              <section className="bg-white rounded-lg border border-border shadow-sm overflow-hidden animate-in-smart" style={{ animationDelay: '150ms' }}>
                <div className="p-6 border-b border-border flex items-center justify-between bg-accent/5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold tracking-tight">Order to Delivery Alignment</h3>
                    <p className="text-[10px] text-muted-foreground">
                      Values below are derived from the same data used by the delivery note.
                    </p>
                  </div>
                  {deliveryNote.missingRequiredFields.length > 0 ? (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-warning">
                      {deliveryNote.missingRequiredFields.length} missing field(s)
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-success">
                      Ready for print
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  {deliveryNote.missingRequiredFields.length > 0 && (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-xs text-foreground">
                      <p className="font-bold">Missing data before print</p>
                      <p className="mt-1 text-muted-foreground">
                        Complete: {deliveryNote.missingRequiredFields.join(", ")}.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AlignmentItem label="Program" value={deliveryNote.programName} note="Mapped from campaign name on create form" />
                    <AlignmentItem label="SO Number" value={deliveryNote.soNumber} note="Used by the delivery note" />
                    <AlignmentItem label="PIC Program" value={deliveryNote.picProgram} note="Entered alongside the order request" />
                    <AlignmentItem label="Deliver to" value={deliverySnapshot.deliveryCompanyName} note={deliverySnapshot.deliveryLocationName} />
                    <AlignmentItem label="Address" value={deliverySnapshot.address} note={deliverySnapshot.phone} />
                    <AlignmentItem label="PIC Client" value={deliverySnapshot.picClient} note={deliverySnapshot.wcode} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
                    <AlignmentStat label="Ordered Qty" value={`${totalOrdered} pcs`} />
                    <AlignmentStat label="Delivered Qty" value={`${totalDelivered} pcs`} />
                    <AlignmentStat label="Outstanding Qty" value={`${totalOutstanding} pcs`} />
                  </div>
                </div>
              </section>

              {/* Line Items Table */}
              <section className="bg-white rounded-lg border border-border shadow-sm overflow-hidden animate-in-smart" style={{ animationDelay: '200ms' }}>
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-tight">Line Items</h3>
                  <div className="text-[10px] text-muted-foreground font-bold uppercase bg-accent px-2 py-1 rounded">
                    Total Qty: {totalOrdered} Qty
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                        <th className="px-6 py-3">Product Name</th>
                        <th className="px-6 py-3">PO Line</th>
                        <th className="px-6 py-3">Quantity</th>
                        <th className="px-6 py-3">Delivered</th>
                        <th className="px-6 py-3">Outstanding</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.items.map((item) => {
                        const deliveryLine = deliveryNote.lines.find((line) => line.id === item.id);

                        return (
                        <tr key={item.id} className="hover:bg-accent/5 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold leading-tight">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono">{item.productCode}</p>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono">{item.poLineNumber}</td>
                          <td className="px-6 py-4 text-xs">{item.quantity} Qty</td>
                          <td className="px-6 py-4 text-xs">{deliveryLine?.deliveredQty ?? 0} Qty</td>
                          <td className="px-6 py-4 text-xs">{deliveryLine?.outstandingQty ?? item.quantity} Qty</td>
                          <td className="px-6 py-4 text-xs font-medium">{item.status}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Progress Tracking (Conditional UI for In Production/Ready to Ship) */}
                {(fulfillmentStatus === 'In Production' || fulfillmentStatus === 'Ready to Ship' || fulfillmentStatus === 'Overdue') && (
                  <div className="p-6 bg-accent/5 border-t border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fulfillment Progress</h4>
                      <button className="flex items-center gap-1 text-[10px] font-bold text-primary">
                        <ChevronDown className="w-3 h-3" />
                        8 Progress Logs
                      </button>
                    </div>

                    <div className="space-y-3">
                      <ProgressBar label="Production" current={200} total={750} color="bg-primary" />
                      <ProgressBar label="Ready to Ship" current={100} total={750} color="bg-processing" />
                      <ProgressBar label="On Delivery" current={0} total={750} color="bg-processing" opacity />
                      <ProgressBar label="Delivered" current={0} total={750} color="bg-success" opacity />
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Timeline & Meta */}
            <div className="space-y-6">
              <section className="bg-white rounded-lg border border-border shadow-sm p-6 animate-in-smart" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-2 mb-6">
                  <History className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold tracking-tight">Timeline Tracking</h3>
                </div>

                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-px before:bg-border">
                  <TimelineItem 
                    status="Created" 
                    actor="CUSTOMER (Brand Manager)" 
                    date="June 01, 2026" 
                    time="14:30" 
                    isLast 
                  />
                  <TimelineItem 
                    status="Assigned" 
                    actor="ADMIN (Procurement Manager)" 
                    date="June 02, 2026" 
                    time="09:15" 
                  />
                  <TimelineItem 
                    status="Accepted" 
                    actor="VENDOR (Supplier)" 
                    date="June 02, 2026" 
                    time="11:45" 
                  />
                  {fulfillmentStatus === 'Ready to Ship' && (
                    <TimelineItem 
                      status="Ready to Ship" 
                      actor="VENDOR" 
                      date="June 05, 2026" 
                      time="10:00"
                      note="Auto-advanced (partial progress)"
                      active
                    />
                  )}
                </div>
              </section>

              <section className="bg-primary/5 rounded-lg border border-primary/20 p-6 animate-in-smart" style={{ animationDelay: '400ms' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Internal Notes</h3>
                <p className="text-xs text-muted-foreground leading-relaxed italic italic">
                  {deliveryNote.note}
                </p>
              </section>
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

function InfoItem({ label, value, icon: Icon, color = "text-foreground" }: { label: string, value: string, icon: any, color?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xs font-medium truncate", color)}>{value}</p>
    </div>
  );
}

function AlignmentItem({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-accent/5 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-xs font-bold text-foreground break-words">{value}</p>
      {note && <p className="mt-1 text-[10px] text-muted-foreground break-words">{note}</p>}
    </div>
  );
}

function AlignmentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function ProgressBar({ label, current, total, color, opacity = false }: { label: string, current: number, total: number, color: string, opacity?: boolean }) {
  const percentage = (current / total) * 100;
  return (
    <div className={cn("space-y-1.5", opacity && "opacity-40")}>
      <div className="flex justify-between text-[10px] font-bold">
        <span>{label}</span>
        <span>{current}/{total}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000 ease-out-expo", color)}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function TimelineItem({ status, actor, date, time, note, isLast = false, active = false }: { status: string, actor: string, date: string, time: string, note?: string, isLast?: boolean, active?: boolean }) {
  return (
    <div className="relative pl-8">
      <div className={cn(
        "absolute left-0 top-1 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10",
        active ? "bg-primary" : "bg-border"
      )}></div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className={cn("text-xs font-bold", active ? "text-primary" : "text-foreground")}>{status}</p>
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium">{actor}</p>
        <p className="text-[10px] text-muted-foreground">{date}</p>
        {note && <p className="text-[10px] text-primary font-bold italic mt-1 tracking-tight">“{note}”</p>}
      </div>
    </div>
  );
}
