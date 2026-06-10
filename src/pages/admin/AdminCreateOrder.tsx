import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle, ChevronDown, ChevronUp, GripVertical, Info, Package, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { getSalesPointClientBinding, mockSalesPoints } from "@/lib/mockData";
import { useProjectStore } from "@/lib/projectStore";
import { mockProducts } from "@/lib/productMaster";
import { appendOrders, createManualOrder } from "@/lib/orderStore";
import { useSupplierStore } from "@/lib/supplierStore";
import { cn } from "@/lib/utils";

interface AdminCreateOrderProps {
  role?: UserRole;
}

type OrderItem = { id: string; productCode: string; quantity: number; poLineNumber: string };

export function AdminCreateOrder({ role = "admin" }: AdminCreateOrderProps) {
  const navigate = useNavigate();
  const exactDeadlineInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<OrderItem[]>([{ id: "item-1", productCode: "", quantity: 0, poLineNumber: "1" }]);
  const [clientPO, setClientPO] = useState("");
  const [campaignName, setCampaignName] = useState("");

  const [picProjectName, setPicProjectName] = useState("");
  const [picProjectEmail, setPicProjectEmail] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedSalesPoint, setSelectedSalesPoint] = useState("WH020");
  const [customDeadline, setCustomDeadline] = useState("");
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { suppliers } = useSupplierStore();
  const { projects, addProject } = useProjectStore();

  const salesPoint = mockSalesPoints.find((entry) => entry.wcode === selectedSalesPoint) ?? mockSalesPoints[0];
  const salesPointClient = getSalesPointClientBinding(salesPoint.wcode);
  const selectedSupplierRecord = suppliers.find((supplier) => supplier.id === selectedSupplier) ?? null;
  const selectedSupplierName = selectedSupplierRecord?.name ?? "Not Selected";
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const returnPath = role === "admin" ? "/admin/orders" : `/${role}/orders`;
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const productOptions = useMemo(
    () =>
      mockProducts.map((product) => ({
        value: product.code,
        label: product.name,
        description: product.code,
        keywords: [product.code, product.brand, product.material, product.dimensions].filter(Boolean) as string[],
      })),
    [],
  );
  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
        description: supplier.id,
        keywords: [supplier.id, supplier.name, supplier.picName, supplier.email, supplier.phone, supplier.type, supplier.status].filter(Boolean) as string[],
      })),
    [suppliers],
  );
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
  const salesPointOptions = useMemo(
    () =>
      mockSalesPoints.map((entry) => ({
        value: entry.wcode,
        label: `${entry.wcode} - ${entry.salesPoint}`,
        description: `${entry.region} · ${entry.zone}`,
        keywords: [entry.wcode, entry.salesPoint, entry.area, entry.region, entry.zone].filter(Boolean) as string[],
      })),
    [],
  );

  const deadlineLabel = formatDeadlineDate(customDeadline);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!clientPO.trim()) errors.push("Client PO Ref is required.");
    if (!campaignName.trim()) errors.push("Project is required.");

    if (!picProjectName.trim()) errors.push("PIC Project Name is required.");
    if (!picProjectEmail.trim()) errors.push("PIC Project Email is required.");
    if (!selectedSupplierRecord) errors.push("Supplier assignment is required.");
    if (!selectedSalesPoint) errors.push("Sales point is required.");
    if (!customDeadline.trim()) errors.push("Deadline is required.");

    items.forEach((item, index) => {
      const product = mockProducts.find((entry) => entry.code === item.productCode);

      if (!item.productCode) errors.push(`Item ${index + 1}: select a product.`);
      if (!product) errors.push(`Item ${index + 1}: product code is not recognized.`);
      if (item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than zero.`);
    });

    return errors;
  }, [
    campaignName,
    clientPO,
    customDeadline,
    deadlineLabel,
    items,
    picProjectEmail,
    picProjectName,
    selectedSalesPoint,
    selectedSupplierRecord,
  ]);

  const addItem = () => {
    setItems((current) => [
      ...current,
      { id: `item-${Date.now()}`, productCode: "", quantity: 0, poLineNumber: String(current.length + 1) },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((current) => renumberItems(current.filter((item) => item.id !== id)));
    }
  };

  const updateItem = (id: string, field: "productCode" | "quantity" | "poLineNumber", value: string | number) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, [field]: field === "quantity" ? Number(value) || 0 : String(value) } : item)),
    );
  };

  const handlePointerDown = (id: string, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedItemId(id);
    setDropTargetId(id);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!draggedItemId) return;

    const target = document.elementFromPoint(event.clientX, event.clientY);
    const row = target?.closest<HTMLElement>("[data-item-row='true']");
    const targetId = row?.dataset.itemId;

    if (targetId && targetId !== draggedItemId) {
      setDropTargetId(targetId);
    }
  };

  const handlePointerUp = () => {
    if (!draggedItemId || !dropTargetId || draggedItemId === dropTargetId) {
      setDraggedItemId(null);
      setDropTargetId(null);
      return;
    }

    setItems((current) => {
      return reorderItems(current, draggedItemId, dropTargetId);
    });

    setDraggedItemId(null);
    setDropTargetId(null);
  };

  const handlePointerCancel = () => {
    setDraggedItemId(null);
    setDropTargetId(null);
  };

  const moveItem = (id: string, direction: -1 | 1) => {
    setDraggedItemId(null);
    setDropTargetId(null);
    setItems((current) => reorderItemsByOffset(current, id, direction));
  };

  const handleSubmit = () => {
    if (validationErrors.length > 0) {
      const message = "Fix the required fields before sending this order.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const order = createManualOrder({
      campaign: campaignName,
      clientPO,
      supplier: selectedSupplierName,
      salesPointId: selectedSalesPoint,
      picProjectName,
      picProjectEmail,
      deadline: deadlineLabel,
      note,
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
    navigate(`/admin/orders/${order.id}`);
  };

  const openExactDeadlinePicker = () => {
    const input = exactDeadlineInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <ContentArea>
        <Header title={`Create Order Request (${role.charAt(0).toUpperCase() + role.slice(1)})`} />

        <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
          {submitError ? (
            <Alert className="items-start gap-4 border-destructive/20 bg-destructive/5 text-foreground">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div className="flex-1">
                <AlertTitle className="text-base font-semibold leading-none">Cannot send yet</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="font-medium text-muted-foreground">{submitError}</p>
                  {validationErrors.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
                      {validationErrors.map((error) => (
                        <li key={error} className="text-foreground/80">{error}</li>
                      ))}
                    </ul>
                  ) : null}
                </AlertDescription>
              </div>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Project & Supplier Info</CardTitle>
                  </div>
                  <CardDescription>Capture the order request and supplier assignment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Client PO Ref" required htmlFor="client-po">
                      <Input id="client-po" placeholder="e.g. 123928098" value={clientPO} onChange={(e) => setClientPO(e.target.value)} />
                    </FormField>

                    <FormField label="Project" required>
                      <SearchableCombobox
                        value={campaignName}
                        onValueChange={setCampaignName}
                        onCreate={(project) => addProject(project)}
                        options={projectOptions}
                        placeholder="Select or create a project..."
                        searchPlaceholder="Search or type a new project name..."
                        emptyText="No matching projects found."
                        allowCreate
                        ariaLabel="Project"
                        createLabel="Create project"
                      />
                    </FormField>
                    <FormField label="Deadline" required>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-between border-input bg-background px-3 py-2.5 text-left font-normal text-foreground shadow-none hover:bg-accent",
                            !customDeadline && "text-muted-foreground",
                          )}
                          onClick={openExactDeadlinePicker}
                        >
                          <span>{customDeadline ? formatDeadlineDate(customDeadline) : "Pick a date"}</span>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Input
                          ref={exactDeadlineInputRef}
                          id="custom-deadline"
                          type="date"
                          value={customDeadline}
                          onChange={(e) => setCustomDeadline(e.target.value)}
                          className="sr-only"
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      </div>
                    </FormField>
                    <FormField label="PIC Project Email" required htmlFor="pic-project-email">
                      <Input
                        id="pic-project-email"
                        type="email"
                        placeholder="e.g. chandra.sadikin@sampoerna.com"
                        value={picProjectEmail}
                        onChange={(e) => setPicProjectEmail(e.target.value)}
                      />
                    </FormField>
                    <FormField label="PIC Project Name" required htmlFor="pic-project-name">
                      <Input id="pic-project-name" placeholder="e.g. Chandra Sadikin" value={picProjectName} onChange={(e) => setPicProjectName(e.target.value)} />
                    </FormField>
                    <FormField label="Assign Supplier" required>
                      <SearchableCombobox
                        value={selectedSupplier}
                        onValueChange={setSelectedSupplier}
                        options={supplierOptions}
                        placeholder="Select a supplier..."
                        searchPlaceholder="Search supplier, PIC, email, phone, or code..."
                        emptyText="No suppliers match your search."
                      />
                    </FormField>
                    <FormField label="Sales Point" required>
                      <SearchableCombobox
                        value={selectedSalesPoint}
                        onValueChange={setSelectedSalesPoint}
                        options={salesPointOptions}
                        placeholder="Select a sales point..."
                        searchPlaceholder="Search sales point, zone, region, or code..."
                        emptyText="No sales points match your search."
                      />
                    </FormField>
                    <FormField label="Internal Notes" htmlFor="order-note">
                      <Textarea
                        id="order-note"
                        placeholder="Add any internal notes about this order..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </FormField>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">Items</CardTitle>
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
                      <ItemRow
                        key={item.id}
                        id={item.id}
                        index={index}
                        itemCount={items.length}
                        isDragging={draggedItemId === item.id}
                        isDropTarget={dropTargetId === item.id}
                        productCode={item.productCode}
                        productOptions={productOptions}
                        quantity={item.quantity}
                        poLineNumber={item.poLineNumber}
                        canMoveUp={index > 0}
                        canMoveDown={index < items.length - 1}
                        onProductChange={(value) => updateItem(item.id, "productCode", value)}
                        onQuantityChange={(value) => updateItem(item.id, "quantity", value)}
                        onRemove={() => removeItem(item.id)}
                        onMoveUp={() => moveItem(item.id, -1)}
                        onMoveDown={() => moveItem(item.id, 1)}
                        onPointerDown={(event) => handlePointerDown(item.id, event)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                      />
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
                    <ReviewRow
                      label="Client"
                      value={
                        salesPointClient
                          ? `${salesPointClient.clientName} · ${salesPointClient.clientEntityName}`
                          : "Unbound"
                      }
                    />

                    <ReviewRow label="PIC Project" value={picProjectName || "Missing"} />
                    <ReviewRow label="Total Qty" value={`${totalQuantity} qty`} />
                    <ReviewRow
                      label="Deadline"
                      value={deadlineLabel || "Unknown"}
                    />
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-white text-primary hover:bg-slate-50 disabled:opacity-70"
                  >
                    {isSubmitting ? "Sending..." : "Approve & Send to Vendor"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </ContentArea>
    </div>
  );
}


function formatDeadlineDate(value: string) {
  if (!value.trim()) {
    return "";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FormField({
  label,
  required = false,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium" htmlFor={htmlFor}>
        {label} {required ? "*" : ""}
      </label>
      {children}
    </div>
  );
}

function ItemRow({
  id,
  index,
  itemCount,
  isDragging,
  isDropTarget,
  productCode,
  productOptions,
  quantity,
  poLineNumber,
  canMoveUp,
  canMoveDown,
  onProductChange,
  onQuantityChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  id: string;
  index: number;
  itemCount: number;
  isDragging: boolean;
  isDropTarget: boolean;
  productCode: string;
  productOptions: ComboboxOption[];
  quantity: number;
  poLineNumber: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onProductChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      data-item-row="true"
      data-item-id={id}
      className={cn(
        "grid gap-3 overflow-visible md:grid-cols-12 md:items-end",
        isDragging && "z-10 opacity-80",
        isDropTarget && !isDragging && "rounded-lg ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-end gap-2 md:col-span-1 md:pb-0.5">
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          style={{ touchAction: "none", cursor: "grab" }}
          aria-label={`Reorder line ${poLineNumber}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2 md:col-span-2">
        {index === 0 ? <label className="text-xs font-medium">Line</label> : null}
        <div className="flex items-stretch gap-2">
          <Input value={poLineNumber} readOnly tabIndex={-1} className="h-10 bg-muted/40" placeholder="1" />
          <div className="flex h-10 w-9 shrink-0 flex-col overflow-hidden rounded-md border border-input bg-background">
            <Button
              type="button"
              variant="ghost"
              className="h-1/2 w-full rounded-none border-0 px-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label={`Move line ${poLineNumber} up`}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-1/2 w-full rounded-none border-0 border-t border-input px-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label={`Move line ${poLineNumber} down`}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-2 md:col-span-6">
        {index === 0 ? <label className="text-xs font-medium">Product</label> : null}
        <SearchableCombobox
          value={productCode}
          onValueChange={onProductChange}
          options={productOptions}
          placeholder="Select product..."
          searchPlaceholder="Search product name, code, brand, or material..."
          emptyText="No products match your search."
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        {index === 0 ? <label className="text-xs font-medium">Quantity</label> : null}
        <Input
          type="number"
          placeholder="0"
          value={quantity || ""}
          onChange={(event) => onQuantityChange(event.target.value)}
          className="h-10"
        />
      </div>
      <div className="md:col-span-1 md:pb-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10", itemCount === 1 && "opacity-20")}
          onClick={onRemove}
          disabled={itemCount === 1}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function renumberItems(items: OrderItem[]) {
  return items.map((item, index) => ({
    ...item,
    poLineNumber: String(index + 1),
  }));
}

function reorderItems(items: OrderItem[], sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return renumberItems(nextItems);
}

function reorderItemsByOffset(items: OrderItem[], itemId: string, offset: -1 | 1) {
  const currentIndex = items.findIndex((item) => item.id === itemId);
  const nextIndex = currentIndex + offset;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  nextItems.splice(nextIndex, 0, movedItem);
  return renumberItems(nextItems);
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="italic opacity-80">{label}</span>
      <span className="max-w-[60%] text-right font-semibold">{value}</span>
    </div>
  );
}
