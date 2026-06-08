import { useState, type HTMLInputTypeAttribute } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, CheckCircle, ChevronDown, Info, Package, Plus, Search, Trash2, UserCheck, ArrowLeft } from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { mockSalesPoints } from "@/lib/mockData";
import { mockProducts } from "@/lib/productMaster";
import { getSalesPointDeliveryProfile } from "@/lib/deliveryNote";
import { useSupplierStore } from "@/lib/supplierStore";
import { cn } from "@/lib/utils";

interface AdminCreateOrderProps {
  role?: UserRole;
}

type OrderItem = { id: number; product: string; quantity: number };

export function AdminCreateOrder({ role = "admin" }: AdminCreateOrderProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<OrderItem[]>([{ id: 1, product: "", quantity: 0 }]);
  const [clientPO, setClientPO] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [soNumber, setSoNumber] = useState("");
  const [picProgramName, setPicProgramName] = useState("");
  const [picProgramEmail, setPicProgramEmail] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedSalesPoint, setSelectedSalesPoint] = useState("WH020");
  const [deadlinePreset, setDeadlinePreset] = useState("7-days");
  const [customDeadline, setCustomDeadline] = useState("");
  const { suppliers } = useSupplierStore();

  const salesPoint = mockSalesPoints.find((entry) => entry.wcode === selectedSalesPoint) ?? mockSalesPoints[0];
  const deliveryProfile = getSalesPointDeliveryProfile(selectedSalesPoint);
  const selectedSupplierName = selectedSupplier ? suppliers.find((supplier) => supplier.id === selectedSupplier)?.name ?? "Not Selected" : "Not Selected";
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const returnPath = role === "admin" ? "/admin/orders" : `/${role}/orders`;
  const submitPath = role === "admin" ? "/admin/orders" : `/${role}/orders`;

  const addItem = () => setItems([...items, { id: Date.now(), product: "", quantity: 0 }]);
  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id));
  };
  const updateItem = (id: number, field: "product" | "quantity", value: string | number) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, [field]: field === "quantity" ? Number(value) || 0 : value } : item)),
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title={`Create Order Request (${role.charAt(0).toUpperCase() + role.slice(1)})`} />

        <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
          <Button asChild variant="ghost" className="w-fit justify-start gap-2 px-0">
            <Link to={returnPath}>
              <ArrowLeft className="h-4 w-4" />
              Discard and Return
            </Link>
          </Button>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Project & Supplier Info</CardTitle>
                  </div>
                  <CardDescription>Capture the order request, supplier assignment, and delivery-note aligned metadata.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Customer PO Ref" required>
                      <Input placeholder="e.g. 123928098" value={clientPO} onChange={(e) => setClientPO(e.target.value)} />
                    </FormField>
                    <FormField label="Campaign Name" required>
                      <Input placeholder="e.g. Sunscreen Q2" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                    </FormField>
                    <FormField label="SO Number" required>
                      <Input placeholder="e.g. SO123928" value={soNumber} onChange={(e) => setSoNumber(e.target.value)} />
                    </FormField>
                    <FormField label="PIC Program Name" required>
                      <Input placeholder="e.g. Chandra Sadikin" value={picProgramName} onChange={(e) => setPicProgramName(e.target.value)} />
                    </FormField>
                    <FormField label="PIC Program Email" required>
                      <Input
                        type="email"
                        placeholder="e.g. chandra.sadikin@sampoerna.com"
                        value={picProgramEmail}
                        onChange={(e) => setPicProgramEmail(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Sales Point" required>
                      <Select value={selectedSalesPoint} onValueChange={setSelectedSalesPoint}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mockSalesPoints.map((entry) => (
                            <SelectItem key={`${entry.wcode}-${entry.salesPoint}`} value={entry.wcode}>
                              {entry.wcode} - {entry.salesPoint}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Assign Supplier" required>
                      <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supplier..." />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Deadline" required>
                      <Select value={deadlinePreset} onValueChange={setDeadlinePreset}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {deadlineOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    {deadlinePreset === "custom" ? (
                      <FormField label="Custom Deadline" required>
                        <Input type="date" value={customDeadline} onChange={(e) => setCustomDeadline(e.target.value)} />
                      </FormField>
                    ) : null}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Most order requests are short-horizon. Choose a relative due time first; use an exact date only when the year matters.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Delivery Note Alignment</CardTitle>
                  </div>
                  <CardDescription>Preview the data that will carry into delivery-note and print workflows.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <AlignmentPreviewItem label="Program" value={campaignName || "Campaign name will map here"} note="Maps from Campaign Name" />
                    <AlignmentPreviewItem label="SO Number" value={soNumber || "SO number is required for delivery note"} note="Shown on order detail and print" />
                    <AlignmentPreviewItem
                      label="PIC Program"
                      value={
                        picProgramName || picProgramEmail
                          ? `${picProgramName}${picProgramEmail ? ` (${picProgramEmail})` : ""}`
                          : "PIC program name and email will map here"
                      }
                      note="Built from PIC Program Name + Email"
                    />
                    <AlignmentPreviewItem label="Deliver To" value={deliveryProfile.deliveryCompanyName} note={deliveryProfile.deliveryLocationName} />
                    <AlignmentPreviewItem label="Address" value={deliveryProfile.address} note={deliveryProfile.phone || "No phone mapped"} />
                    <AlignmentPreviewItem label="PIC Client" value={deliveryProfile.picClient || "Client PIC not mapped"} note={deliveryProfile.wcode} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">Item Specification</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AnimatePresence initial={false}>
                    {items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid gap-3 overflow-hidden md:grid-cols-12 md:items-end"
                      >
                        <div className="space-y-2 md:col-span-7">
                          {index === 0 ? <label className="text-xs font-medium">Product</label> : null}
                          <Select value={item.product} onValueChange={(value) => updateItem(item.id, "product", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product..." />
                            </SelectTrigger>
                            <SelectContent>
                              {mockProducts.map((product) => (
                                <SelectItem key={product.code} value={product.code}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-4">
                          {index === 0 ? <label className="text-xs font-medium">Quantity</label> : null}
                          <Input type="number" placeholder="0" value={item.quantity || ""} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} />
                        </div>
                        <div className="md:col-span-1 md:pb-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn("h-10 w-10", items.length === 1 && "opacity-20")}
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-24 border-primary/20 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-4 w-4" />
                    Review & Assign
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80">Confirm the request before sending it to the vendor.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2 border-b border-white/20 pb-4 text-xs">
                    <ReviewRow label="Assigned Supplier" value={selectedSupplierName} />
                    <ReviewRow label="Sales Point" value={`${salesPoint.wcode} - ${salesPoint.salesPoint}`} />
                    <ReviewRow label="SO Number" value={soNumber || "Missing"} />
                    <ReviewRow label="PIC Program" value={picProgramName || "Missing"} />
                    <ReviewRow label="Total Qty" value={`${totalQuantity} qty`} />
                    <ReviewRow
                      label="Deadline"
                      value={
                        deadlinePreset === "custom"
                          ? customDeadline || "Exact date"
                          : deadlineOptions.find((option) => option.value === deadlinePreset)?.label ?? "Unknown"
                      }
                    />
                  </div>
                  <div className="rounded-md border border-white/20 bg-white/10 p-3 text-xs leading-relaxed">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em]">Delivery Note Snapshot</p>
                    <p>{deliveryProfile.deliveryCompanyName}</p>
                    <p>{deliveryProfile.deliveryLocationName}</p>
                    <p>{deliveryProfile.address}</p>
                  </div>
                  <Button onClick={() => navigate(submitPath)} className="w-full bg-white text-primary hover:bg-slate-50">
                    Approve & Send to Vendor
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const deadlineOptions = [
  { value: "3-days", label: "Due in 3 days" },
  { value: "7-days", label: "Due in 1 week" },
  { value: "14-days", label: "Due in 2 weeks" },
  { value: "30-days", label: "Due in 1 month" },
  { value: "custom", label: "Pick exact date" },
];

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">
        {label} {required ? "*" : ""}
      </label>
      {children}
    </div>
  );
}

function AlignmentPreviewItem({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
      {note ? <p className="mt-1 break-words text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="italic opacity-80">{label}</span>
      <span className="max-w-[60%] text-right font-semibold">{value}</span>
    </div>
  );
}
