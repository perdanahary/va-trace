import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Info, Package, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { mockProducts } from "@/lib/productMaster";
import { useSupplierStore } from "@/lib/supplierStore";
import { isValidHttpUrl, normalizeOrderReferenceLink, parseOrderTags } from "@/lib/orderMetadata";
import { cn } from "@/lib/utils";
import { useActor } from "@/lib/v2/useActor";
import { useSalesPoints } from "@/lib/v2/salesPointStore";
import { createSubmittedOrder, toApiError } from "@/lib/v2/workflows";

interface AdminCreateOrderProps {
  userRole?: UserRole;
}

type OrderItem = { id: string; productCode: string; quantity: number; poLineNumber: string };

export function AdminCreateOrder({ userRole = "admin" }: AdminCreateOrderProps) {
  const navigate = useNavigate();
  const exactDeadlineInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<OrderItem[]>([{ id: "item-1", productCode: "", quantity: 0, poLineNumber: "1" }]);
  const [clientPO, setClientPO] = useState("");
  const [picProjectName, setPicProjectName] = useState("");
  const [picProjectEmail, setPicProjectEmail] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("SUP-004");
  const [selectedSalesPoint, setSelectedSalesPoint] = useState("");
  const [customDeadline, setCustomDeadline] = useState("");
  const [note, setNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceTitle, setReferenceTitle] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { suppliers } = useSupplierStore();
  const salesPoints = useSalesPoints();
  
  const actor = useActor(userRole, "order-create");

  useEffect(() => {
    if (!selectedSalesPoint && salesPoints.length > 0) {
      setSelectedSalesPoint(salesPoints[0].id);
    }
  }, [salesPoints, selectedSalesPoint]);

  const salesPoint = salesPoints.find((entry) => entry.id === selectedSalesPoint) ?? salesPoints[0] ?? null;
  const selectedSupplierRecord = suppliers.find((supplier) => supplier.id === selectedSupplier) ?? null;
  const selectedSupplierName = selectedSupplierRecord?.name ?? "Not Selected";
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const parsedTags = useMemo(() => parseOrderTags(tagsInput), [tagsInput]);
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
        disabled: supplier.id !== "SUP-004",
        keywords: [supplier.id, supplier.name, supplier.picName, supplier.email, supplier.phone, supplier.type, supplier.status].filter(Boolean) as string[],
      })),
    [suppliers],
  );
  const salesPointOptions = useMemo(
    () =>
      salesPoints.map((entry) => ({
        value: entry.id,
        label: `${entry.wCode} - ${entry.name}`,
        description: `${entry.geography.region} · ${entry.geography.zone}`,
        keywords: [entry.wCode, entry.code, entry.name, entry.geography.area, entry.geography.region, entry.geography.zone].filter(Boolean) as string[],
      })),
    [salesPoints],
  );

  const deadlineLabel = formatDeadlineDate(customDeadline);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!clientPO.trim()) errors.push("PO number reference is required.");
    if (!picProjectName.trim()) errors.push("PIC Project Name is required.");
    if (!picProjectEmail.trim()) errors.push("PIC Project Email is required.");
    if (!selectedSupplierRecord) errors.push("Supplier assignment is required.");
    if (!salesPoint) errors.push("Sales point is required.");
    if (!customDeadline.trim()) errors.push("Deadline is required.");
    if (referenceUrl.trim() && !isValidHttpUrl(referenceUrl.trim())) errors.push("Link URL must be a valid http or https URL.");

    items.forEach((item, index) => {
      const product = mockProducts.find((entry) => entry.code === item.productCode);

      if (!item.productCode) errors.push(`Item ${index + 1}: select a product.`);
      if (!product) errors.push(`Item ${index + 1}: product code is not recognized.`);
      if (item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than zero.`);
    });

    return errors;
  }, [
    clientPO,
    customDeadline,
    deadlineLabel,
    items,
    picProjectEmail,
    picProjectName,
    salesPoint,
    selectedSupplierRecord,
    referenceUrl,
  ]);

  const addItem = () => {
    setItems((current) => [
      ...current,
      { id: `item-${Date.now()}`, productCode: "", quantity: 0, poLineNumber: String(current.length + 1) },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((current) =>
        current
          .filter((item) => item.id !== id)
          .map((item, index) => ({ ...item, poLineNumber: String(index + 1) })),
      );
    }
  };

  const updateItem = (id: string, field: "productCode" | "quantity" | "poLineNumber", value: string | number) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, [field]: field === "quantity" ? Number(value) || 0 : String(value) } : item)),
    );
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

    try {
      const productsById = new Map(
        mockProducts.map((product) => [
          product.code,
          {
            id: product.code,
            code: product.code,
            sku: product.code,
            materialCode: product.code,
            name: product.name,
            unitOfMeasure: "PCS" as const,
          },
        ]),
      );
      const clientRef = {
        id: salesPoint!.clientId,
        name: salesPoint!.clientName,
      };
      const referenceLink = referenceUrl.trim()
        ? normalizeOrderReferenceLink({
            url: referenceUrl,
            displayTitle: referenceTitle,
          })
        : undefined;
      if (referenceUrl.trim() && !referenceLink) {
        throw new Error("Link URL must be a valid http or https URL.");
      }
      const projectName = clientPO.trim() || "admin-order";
      const projectRef = {
        id: `project_${slug(projectName)}`,
        name: projectName,
        clientId: clientRef.id,
      };
      const v2 = createSubmittedOrder(
        {
          clientPoNumber: clientPO,
          tags: parsedTags,
          referenceLink,
          deadlineDate: customDeadline,
          remarks: note,
          refs: {
            client: clientRef,
            project: projectRef,
            vendor: { id: selectedSupplierRecord!.id, name: selectedSupplierName },
            requester: {
              userId: actor.userId,
              name: picProjectName.trim(),
              email: picProjectEmail.trim(),
              role: actor.role,
              organizationName: clientRef.name,
            },
            productsById,
          },
          items: items.map((item, index) => ({
            productId: item.productCode,
            lineNumber: Number(item.poLineNumber) || index + 1,
            description: productsById.get(item.productCode)?.name ?? item.productCode,
            orderedQuantity: item.quantity,
          })),
          allocations: items.map((item, index) => ({
            orderItemClientLineNumber: Number(item.poLineNumber) || index + 1,
            salesPointId: selectedSalesPoint,
            allocatedQuantity: item.quantity,
          })),
        },
        actor,
      );
      toast.success(`Order ${v2.order.orderRequestNumber} created and submitted.`);
      navigate(`/${userRole}/orders/${v2.order.id}`);
    } catch (error) {
      const apiError = toApiError(error);
      setSubmitError(apiError.message);
      toast.error(apiError.message);
      setIsSubmitting(false);
    }
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
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header
          title="Create Order Request"
          actions={
            <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
              {isSubmitting ? "Sending..." : "Approve & Send to Vendor"}
            </Button>
          }
        />

        <main className="mx-auto max-w-2xl space-y-6 px-8 py-8">
          {submitError ? (
            <p className="text-xs font-medium text-destructive">{submitError}</p>
          ) : null}

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-border">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
                <Package className="h-3 w-3 text-primary" />
              </div>
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Supplier &amp; Destination</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField label="Supplier" required>
                  <SearchableCombobox
                    value={selectedSupplier}
                    onValueChange={setSelectedSupplier}
                    options={supplierOptions}
                    placeholder="Select a supplier..."
                    searchPlaceholder="Search supplier, PIC, email, phone, or code..."
                    emptyText="No suppliers match your search."
                  />
                </FormField>
                <FormField label="Destination" required>
                  <SearchableCombobox
                    value={selectedSalesPoint}
                    onValueChange={setSelectedSalesPoint}
                    options={salesPointOptions}
                    placeholder="Select a sales point..."
                    searchPlaceholder="Search sales point, zone, region, or code..."
                    emptyText="No sales points match your search."
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-border">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
                <Info className="h-3 w-3 text-primary" />
              </div>
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Additional details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="PO number reference" required htmlFor="client-po">
                  <Input id="client-po" placeholder="e.g. 123928098" value={clientPO} onChange={(e) => setClientPO(e.target.value)} />
                </FormField>
                <FormField label="Deadline" required>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-between border-input bg-background px-3 py-2 text-left font-normal text-foreground shadow-xs hover:bg-accent",
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
              </div>

              <FormField label="PIC Project Name" required htmlFor="pic-name">
                <Input id="pic-name" placeholder="e.g. John Doe" value={picProjectName} onChange={(e) => setPicProjectName(e.target.value)} />
              </FormField>
              <FormField label="PIC Project Email" required htmlFor="pic-email">
                <Input id="pic-email" type="email" placeholder="e.g. john@company.com" value={picProjectEmail} onChange={(e) => setPicProjectEmail(e.target.value)} />
              </FormField>

              <FormField label="Notes to supplier" htmlFor="order-note">
                <Textarea
                  id="order-note"
                  placeholder="Add notes to supplier..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[64px] resize-none"
                />
              </FormField>
              <FormField label="Tags" htmlFor="order-tags">
                <Input
                  id="order-tags"
                  placeholder="e.g. urgent, bulk"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </FormField>
              <FormField label="Link" htmlFor="order-link-url">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    id="order-link-url"
                    type="url"
                    placeholder="https://..."
                    value={referenceUrl}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                  />
                  <Input
                    id="order-link-title"
                    placeholder="Display title (optional)"
                    value={referenceTitle}
                    onChange={(e) => setReferenceTitle(e.target.value)}
                  />
                </div>
              </FormField>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Add items</CardTitle>
              <CardAction>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-[9px] font-bold uppercase tracking-wider">#</TableHead>
                      <TableHead className="text-[9px] font-bold uppercase tracking-wider">Product</TableHead>
                      <TableHead className="w-24 text-[9px] font-bold uppercase tracking-wider">Qty</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No items yet. Click "Add Item" below.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => {
                        const product = mockProducts.find((p) => p.code === item.productCode);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="py-3 text-muted-foreground font-mono">{index + 1}</TableCell>
                            <TableCell className="py-3">
                              <SearchableCombobox
                                value={item.productCode}
                                onValueChange={(value) => updateItem(item.id, "productCode", value)}
                                options={productOptions}
                                placeholder="Select product..."
                                searchPlaceholder="Search product name, code, brand, or material..."
                                emptyText="No products match your search."
                                ariaLabel="Product"
                              />
                            </TableCell>
                            <TableCell className="py-3">
                              <Input
                                type="number"
                                placeholder="0"
                                value={item.quantity || ""}
                                onChange={(event) => updateItem(item.id, "quantity", event.target.value)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell className="py-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn("h-9 w-9", items.length === 1 && "opacity-20")}
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{items.length}</span> item{items.length !== 1 ? "s" : ""}
              </span>
              <span>
                Total: <span className="font-medium text-foreground">{totalQuantity}</span> qty
              </span>
            </CardFooter>
          </Card>

          <p className="text-center text-xs italic text-muted-foreground">
            By clicking send, the order will be sent to the vendor.
          </p>
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
    <div className="space-y-1.5">
      {htmlFor ? (
        <label className="mb-1.5 block text-sm font-medium" htmlFor={htmlFor}>
          {label} {required ? "*" : ""}
        </label>
      ) : (
        <p className="mb-1.5 block text-sm font-medium">
          {label} {required ? "*" : ""}
        </p>
      )}
      {children}
    </div>
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "project";
}
