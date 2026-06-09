import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, CheckCircle, Info, Package, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { cn } from "@/lib/utils";
import { getSalesPointClientBinding, mockProducts, mockSalesPoints } from "@/lib/mockData";
import { appendOrders, createManualOrder } from "@/lib/orderStore";
import { useProjectStore } from "@/lib/projectStore";

export function CreateOrder() {
  const navigate = useNavigate();
  const [items, setItems] = useState([{ id: "item-1", productCode: "", quantity: 0, poLineNumber: "1" }]);
  const [clientPO, setClientPO] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [soNumber, setSoNumber] = useState("");
  const [selectedSalesPoint, setSelectedSalesPoint] = useState("WH020");
  const [deadline, setDeadline] = useState("");
  const [linkFA, setLinkFA] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { projects, addProject } = useProjectStore();

  const salesPoint = mockSalesPoints.find((entry) => entry.wcode === selectedSalesPoint) ?? mockSalesPoints[0];
  const salesPointClient = getSalesPointClientBinding(salesPoint.wcode);
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        value: project,
        label: project,
        description: "Shared project record",
        keywords: project.split(/\s+/).filter(Boolean),
      })),
    [projects],
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!clientPO.trim()) errors.push("Client PO Ref is required.");
    if (!campaignName.trim()) errors.push("Campaign Name is required.");
    if (!soNumber.trim()) errors.push("SO Number is required.");
    if (!selectedSalesPoint) errors.push("Sales point is required.");
    if (!deadline.trim()) errors.push("Deadline is required.");

    items.forEach((item, index) => {
      const product = mockProducts.find((entry) => entry.code === item.productCode);

      if (!item.productCode) errors.push(`Item ${index + 1}: select a product.`);
      if (!product) errors.push(`Item ${index + 1}: product code is not recognized.`);
      if (item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than zero.`);
    });

    return errors;
  }, [campaignName, clientPO, deadline, items, selectedSalesPoint, soNumber]);

  const addItem = () => {
    setItems((current) => [
      ...current,
      { id: `item-${Date.now()}`, productCode: "", quantity: 0, poLineNumber: String(current.length + 1) },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: "productCode" | "quantity" | "poLineNumber", value: string | number) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: field === "quantity" ? Number(value) || 0 : String(value) } : item)),
    );
  };

  const handleSubmit = () => {
    if (validationErrors.length > 0) {
      const message = "Fix the required fields before creating this order request.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const order = createManualOrder({
      campaign: campaignName,
      clientPO,
      soNumber,
      supplier: "Pending",
      salesPointId: selectedSalesPoint,
      picProjectName: "Client Submitted",
      picProjectEmail: "",
      deadline,
      items: items.map((item, index) => {
        const product = mockProducts.find((entry) => entry.code === item.productCode);

        return {
          productCode: item.productCode,
          name: product?.name ?? item.productCode,
          quantity: item.quantity,
          poLineNumber: item.poLineNumber || String(index + 1),
        };
      }),
    });

    appendOrders([order]);
    addProject(campaignName);
    toast.success(`Order ${order.id} created.`);
    navigate("/client");
  };

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role="client" />
      <ContentArea>
        <Header title="New Order Request" />

        <main className="mx-auto max-w-4xl space-y-8 p-8">
          <section className="flex items-center justify-between animate-in-smart">
            <Link to="/client" className="flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary group">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Discard and Return
            </Link>
          </section>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-8 md:col-span-2">
              <section className="space-y-6 rounded-lg border border-border bg-white p-6 shadow-sm animate-in-smart" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Project Details</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormInput id="client-po" label="Client PO Ref" placeholder="e.g. 123928098" required value={clientPO} onChange={setClientPO} />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Campaign Name *
                    </label>
                    <SearchableCombobox
                      value={campaignName}
                      onValueChange={setCampaignName}
                      onCreate={(project) => addProject(project)}
                      options={projectOptions}
                      placeholder="Select or create a project..."
                      searchPlaceholder="Search or type a new project name..."
                      emptyText="No matching projects found."
                      allowCreate
                      ariaLabel="Campaign Name"
                      createLabel="Create project"
                    />
                  </div>
                  <FormInput id="so-number" label="SO Number" placeholder="e.g. SO123928" required value={soNumber} onChange={setSoNumber} />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="sales-point">
                      Sales Point *
                    </label>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <select
                        id="sales-point"
                        value={selectedSalesPoint}
                        onChange={(event) => setSelectedSalesPoint(event.target.value)}
                        className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-4 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
                      >
                        {mockSalesPoints.map((entry) => (
                          <option key={`${entry.wcode}-${entry.salesPoint}`} value={entry.wcode}>
                            {entry.wcode} - {entry.salesPoint}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="deadline">
                      Deadline *
                    </label>
                    <div className="relative group">
                      <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="deadline"
                        type="date"
                        value={deadline}
                        onChange={(event) => setDeadline(event.target.value)}
                        className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-4 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <FormInput id="link-fa" label="Link FA (Optional)" placeholder="https://..." value={linkFA} onChange={setLinkFA} />
              </section>

              <section className="space-y-6 rounded-lg border border-border bg-white p-6 shadow-sm animate-in-smart" style={{ animationDelay: "200ms" }}>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
                      <Package className="h-3 w-3 text-primary" />
                    </div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Item Specification</h3>
                  </div>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold text-primary transition-colors hover:bg-primary/5 btn-press"
                  >
                    <Plus className="h-3 w-3" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="grid grid-cols-12 items-end gap-3 overflow-hidden"
                      >
                        <div className="col-span-7 space-y-1.5">
                          {index === 0 ? <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Product</label> : null}
                          <Select value={item.productCode} onValueChange={(value) => updateItem(item.id, "productCode", value)}>
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
                        <div className="col-span-4 space-y-1.5">
                          {index === 0 ? <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Quantity</label> : null}
                          <input
                            type="number"
                            value={item.quantity || ""}
                            onChange={(event) => updateItem(item.id, "quantity", event.target.value)}
                            placeholder="0"
                            className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-1 pb-1">
                          <button
                            onClick={() => removeItem(item.id)}
                            className={cn(
                              "rounded-md p-2 text-muted-foreground transition-all hover:bg-destructive/5 hover:text-destructive btn-press",
                              items.length === 1 && "pointer-events-none cursor-not-allowed opacity-20",
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="sticky top-24 rounded-lg bg-primary p-6 text-white shadow-xl shadow-primary/20 animate-in-smart" style={{ animationDelay: "300ms" }}>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-tight">
                  <CheckCircle className="h-4 w-4" />
                  Order Summary
                </h3>

                <div className="space-y-4 text-xs">
                  {submitError ? (
                    <Alert className="border-destructive/20 bg-destructive/5 text-foreground">
                      <AlertTitle>Cannot create yet</AlertTitle>
                      <AlertDescription>
                        {submitError}
                        {validationErrors.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {validationErrors.slice(0, 5).map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="space-y-2 border-b border-white/20 pb-4">
                    <div className="flex justify-between italic opacity-80">
                      <span>Total Items</span>
                      <span>{items.length} items</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total Qty</span>
                      <span>{totalQuantity} qty</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Campaign</span>
                      <span className="ml-4 truncate">{campaignName || "Sunscreen Q2..."}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Destination</p>
                    <p className="font-medium">
                      {salesPoint.wcode} - {salesPoint.salesPoint}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest opacity-70">
                      Client: {salesPointClient?.clientName ?? "Unbound"} · {salesPointClient?.clientEntityName ?? "No entity"}
                    </p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-md bg-white py-3 text-xs font-bold uppercase tracking-widest text-primary shadow-md shadow-black/10 transition-all hover:bg-slate-50 disabled:opacity-70 btn-press"
                  >
                    {isSubmitting ? "Creating..." : "Create Order Request"}
                  </button>
                  <p className="text-center text-[10px] italic opacity-70">By clicking create, the order will be sent to the admin for review.</p>
                </div>
              </section>
            </div>
          </div>
        </main>
      </ContentArea>
    </div>
  );
}

function FormInput({
  id,
  label,
  placeholder,
  required = false,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor={id}>
        {label} {required && "*"}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
