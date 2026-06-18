import { useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { mockProducts } from "@/lib/productMaster";
import { useSupplierStore } from "@/lib/supplierStore";
import { isValidHttpUrl, normalizeOrderReferenceLink, parseOrderTags } from "@/lib/orderMetadata";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/lib/projectStore";
import { useActor } from "@/lib/v2/useActor";
import { useSalesPoints } from "@/lib/v2/salesPointStore";
import { usePics } from "@/lib/v2/picStore";
import { createSubmittedOrder, toApiError } from "@/lib/v2/workflows";

interface AdminCreateOrderProps {
  userRole?: UserRole;
}

type OrderItem = { id: string; productCode: string; quantity: number; poLineNumber: string };

export function AdminCreateOrder({ userRole = "admin" }: AdminCreateOrderProps) {
  const navigate = useNavigate();
  const exactDeadlineInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [clientPO, setClientPO] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedSalesPoint, setSelectedSalesPoint] = useState("");
  const [customDeadline, setCustomDeadline] = useState("");
  const [note, setNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceTitle, setReferenceTitle] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedPicId, setSelectedPicId] = useState("");
  const [productToAdd, setProductToAdd] = useState("");
  const { suppliers } = useSupplierStore();
  const salesPoints = useSalesPoints();
  const { projects, addProject } = useProjectStore();
  const pics = usePics();

  const actor = useActor(userRole, "order-create");

  const salesPoint = selectedSalesPoint ? salesPoints.find((entry) => entry.id === selectedSalesPoint) ?? null : null;
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
      suppliers
        .map((supplier) => {
          const isInactive = supplier.status !== "ACTIVE";
          return {
            value: supplier.id,
            label: isInactive ? `${supplier.name} (inactive)` : supplier.name,
            description: supplier.id,
            disabled: isInactive,
            keywords: [supplier.id, supplier.name, supplier.picName, supplier.email, supplier.phone, supplier.type, supplier.status].filter(Boolean) as string[],
          };
        })
        .sort((a, b) => {
          if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
          return a.label.localeCompare(b.label);
        }),
    [suppliers],
  );
  const salesPointOptions = useMemo(() => {
    const seenIds = new Set<string>();
    const options = [];
    for (const entry of salesPoints) {
      if (!seenIds.has(entry.id)) {
        seenIds.add(entry.id);
        const isActive = entry.status === "ACTIVE";
        options.push({
          value: entry.id,
          label: isActive ? `${entry.wCode} - ${entry.name}` : `${entry.wCode} - ${entry.name} (${entry.status.toLowerCase()})`,
          description: `${entry.geography.subArea}, ${entry.geography.area}, ${entry.geography.region}, ${entry.geography.zone}`,
          disabled: !isActive,
          keywords: [entry.wCode, entry.code, entry.name, entry.geography.area, entry.geography.region, entry.geography.zone, entry.geography.subArea, entry.clientName, entry.address.city, entry.address.province, entry.status].filter(Boolean) as string[],
        });
      }
    }
    return options;
  }, [salesPoints]);
  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        value: project,
        label: project,
        keywords: [project],
      })),
    [projects],
  );
  const picOptions = useMemo(
    () =>
      pics
        .map((pic) => ({
          value: pic.id,
          label: `${pic.code} - ${pic.name}`,
          description: pic.email,
          keywords: [pic.code, pic.name, pic.email],
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [pics],
  );

  const deadlineLabel = formatDeadlineDate(customDeadline);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!clientPO.trim()) errors.push("PO number reference is required.");
    if (!selectedProject.trim()) errors.push("Project / Campaign is required.");
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
    salesPoint,
    selectedSupplierRecord,
    referenceUrl,
  ]);

  const addItemByProductCode = (code: string) => {
    if (!code) return;
    setItems((current) => [
      ...current,
      { id: `item-${Date.now()}`, productCode: code, quantity: 1, poLineNumber: String(current.length + 1) },
    ]);
    setProductToAdd("");
  };

  const removeItem = (id: string) => {
    setItems((current) =>
      current
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, poLineNumber: String(index + 1) })),
    );
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
      const resolvedPic = selectedPicId ? pics.find((p) => p.id === selectedPicId) : undefined;
      const projectRef = {
        id: `project_${slug(selectedProject)}`,
        name: selectedProject,
        clientId: clientRef.id,
        picId: resolvedPic?.id,
        picName: resolvedPic?.name,
        picEmail: resolvedPic?.email,
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
              name: "",
              email: "",
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
            <>
              <Button variant="outline" size="sm" onClick={() => setDiscardDialogOpen(true)}>
                Discard
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
                {isSubmitting ? "Sending..." : "Send to Vendor"}
              </Button>
              <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Discard order?</DialogTitle>
                    <DialogDescription>
                      This order has not been saved. Are you sure you want to discard it?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDiscardDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDiscardDialogOpen(false);
                        navigate(`/${userRole}/orders`);
                      }}
                    >
                      Discard
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          }
        />

        <main className="mx-auto max-w-5xl space-y-6 px-8 py-8">
          {submitError ? (
            <p className="text-xs font-medium text-destructive">{submitError}</p>
          ) : null}

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Supplier &amp; Destination</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
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
                  {selectedSupplierRecord?.addressLines && selectedSupplierRecord.addressLines.length > 0 ? (
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">Address</p>
                      {selectedSupplierRecord.addressLines.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  ) : null}
                  {selectedSupplierRecord?.vendorPICs && selectedSupplierRecord.vendorPICs.length > 0 ? (
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">PICs</p>
                      {selectedSupplierRecord.vendorPICs.map((pic, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="font-medium">{pic.name}</span>
                          <span>{pic.phone}</span>
                          <span className="text-[10px]">{pic.email}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {selectedSupplierRecord ? (
                    <button
                      type="button"
                      onClick={() => window.open(`/${userRole}/suppliers/${selectedSupplierRecord.id}`, "_blank")}
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      View supplier &rarr;
                    </button>
                  ) : null}
                </div>
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
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Add items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <SearchableCombobox
                value={productToAdd}
                onValueChange={addItemByProductCode}
                options={productOptions}
                placeholder="Search and select a product to add..."
                searchPlaceholder="Search product name, code, brand, or material..."
                emptyText="No products match your search."
                ariaLabel="Add product"
              />
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          Search a product above to add it to the list.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => {
                        const product = mockProducts.find((p) => p.code === item.productCode);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="py-3 font-mono text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="py-3">
                              <p className="text-sm font-medium leading-tight">{product?.name ?? item.productCode}</p>
                              <p className="font-mono text-xs text-muted-foreground">{item.productCode}</p>
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
                                className="h-9 w-9"
                                onClick={() => removeItem(item.id)}
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

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Project / Campaign" required>
                <SearchableCombobox
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                  options={projectOptions}
                  placeholder="Select a project..."
                  searchPlaceholder="Search project name..."
                  emptyText="No projects found."
                  allowCreate
                  createLabel="Add project"
                  onCreate={(name) => addProject(name)}
                />
              </FormField>
              <FormField label="Project PIC">
                <SearchableCombobox
                  value={selectedPicId}
                  onValueChange={setSelectedPicId}
                  options={picOptions}
                  placeholder="Select a PIC (optional)..."
                  searchPlaceholder="Search PIC by code, name, or email..."
                  emptyText="No PICs found. Add PICs from the PIC Management page."
                />
              </FormField>
              {selectedPicId ? (
                (() => {
                  const pic = pics.find((p) => p.id === selectedPicId);
                  if (!pic) return null;
                  return (
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">Selected PIC</p>
                      <p><span className="font-medium">{pic.name}</span> — {pic.email}</p>
                    </div>
                  );
                })()
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Additional details</CardTitle>
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
