import { useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { mockProducts } from "@/lib/productMaster";
import { cn } from "@/lib/utils";
import { useActor } from "@/lib/v2/useActor";
import { toApiError } from "@/lib/v2/workflows";
import { amendOrderRequest, useOrderRequests } from "@/lib/v2/orderRequestStore";
import type { OrderItem } from "@/lib/types/v2/orderRequest";

interface AdminAmendOrderProps {
  userRole?: UserRole;
}

type DraftItem = { id: string; productCode: string; quantity: number; description: string };

export function AdminAmendOrder({ userRole = "admin" }: AdminAmendOrderProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const orders = useOrderRequests();
  const order = orders.find((o) => o.id === id);

  const actor = useActor(userRole, "order-amend");

  const [clientPO, setClientPO] = useState(order?.clientPoNumber ?? "");
  const [customDeadline, setCustomDeadline] = useState(order?.deadlineDate ?? "");
  const [note, setNote] = useState(order?.remarks ?? "");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>(
    order?.items.map((item) => ({
      id: item.id,
      productCode: item.productId,
      quantity: item.orderedQuantity,
      description: item.description,
    })) ?? [],
  );
  const [productToAdd, setProductToAdd] = useState("");

  const exactDeadlineInputRef = useRef<HTMLInputElement>(null);

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

  const totalQuantity = draftItems.reduce((total, item) => total + item.quantity, 0);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!clientPO.trim()) errors.push("PO number reference is required.");
    if (!customDeadline.trim()) errors.push("Deadline is required.");
    if (!amendmentReason.trim()) errors.push("Amendment reason is required.");
    draftItems.forEach((item, index) => {
      if (!item.productCode) errors.push(`Item ${index + 1}: product code is missing.`);
      if (item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than zero.`);
    });
    return errors;
  }, [clientPO, customDeadline, amendmentReason, draftItems]);

  const addItemByProductCode = (code: string) => {
    if (!code) return;
    const product = mockProducts.find((p) => p.code === code);
    if (!product) return;
    setDraftItems((current) => [
      ...current,
      { id: `item-${Date.now()}`, productCode: code, quantity: 1, description: product.name },
    ]);
    setProductToAdd("");
  };

  const removeItem = (itemId: string) => {
    setDraftItems((current) => current.filter((item) => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setDraftItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  };

  const deadlineLabel = formatDeadlineDate(customDeadline);

  const handleSubmit = () => {
    if (!order) return;
    if (validationErrors.length > 0) {
      const message = "Fix the required fields before submitting this amendment.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const originalItemMap = new Map(order.items.map((item) => [item.id, item]));

      const itemChanges = draftItems
        .filter((draft) => {
          const original = originalItemMap.get(draft.id);
          if (!original) return true;
          return original.orderedQuantity !== draft.quantity;
        })
        .map((draft) => ({
          id: draft.id,
          orderedQuantity: draft.quantity,
          description: draft.description,
        }));

      amendOrderRequest(
        {
          orderRequestId: order.id,
          expectedVersion: order.version,
          metadataChanges: {
            clientPoNumber: clientPO,
            deadlineDate: customDeadline,
            remarks: note || null,
          },
          itemChanges,
          amendmentReason,
        },
        actor,
      );

      toast.success("Order amended successfully.");
      navigate(`/${userRole}/orders/${order.id}`);
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

  if (!order) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole={userRole} />
        <ContentArea>
          <Header
            title="Amend Order"
            breadcrumbs={[
              { label: "All Orders", to: `/${userRole}/orders` },
              { label: "Amend Order" },
            ]}
          />
          <main className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-5xl">
              <Alert>
                <AlertTitle>Order not found</AlertTitle>
                <AlertDescription>
                  The requested order could not be found or is not in an amendable state.
                </AlertDescription>
              </Alert>
            </div>
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
          title={`Amend ${order.orderRequestNumber}`}
          breadcrumbs={[
            { label: "All Orders", to: `/${userRole}/orders` },
            { label: order.orderRequestNumber, to: `/${userRole}/orders/${order.id}` },
            { label: "Amend" },
          ]}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setDiscardDialogOpen(true)}>
                Discard
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
                {isSubmitting ? "Saving..." : "Submit Amendment"}
              </Button>
              <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Discard amendment?</DialogTitle>
                    <DialogDescription>
                      Your changes have not been saved. Are you sure you want to discard this amendment?
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
                        navigate(`/${userRole}/orders/${order.id}`);
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

          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">Amendment Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Explain why this order is being amended..."
                value={amendmentReason}
                onChange={(e) => setAmendmentReason(e.target.value)}
                className="min-h-[80px] resize-none border-destructive/30 focus-visible:ring-destructive/50"
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Items</CardTitle>
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
                    {draftItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No items in this order.
                        </TableCell>
                      </TableRow>
                    ) : (
                      draftItems.map((item, index) => {
                        const product = mockProducts.find((p) => p.code === item.productCode);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="py-3 font-mono text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="py-3">
                              <p className="text-sm font-medium leading-tight">{product?.name ?? item.description}</p>
                              <p className="font-mono text-xs text-muted-foreground">{item.productCode}</p>
                            </TableCell>
                            <TableCell className="py-3">
                              <Input
                                type="number"
                                placeholder="0"
                                value={item.quantity || ""}
                                onChange={(event) => updateItemQuantity(item.id, Number(event.target.value) || 0)}
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
                <span className="font-medium text-foreground">{draftItems.length}</span> item{draftItems.length !== 1 ? "s" : ""}
              </span>
              <span>
                Total: <span className="font-medium text-foreground">{totalQuantity}</span> qty
              </span>
            </CardFooter>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
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

              <FormField label="Notes" htmlFor="order-note">
                <Textarea
                  id="order-note"
                  placeholder="Add notes to supplier..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[64px] resize-none"
                />
              </FormField>
            </CardContent>
          </Card>

          <p className="text-center text-xs italic text-muted-foreground">
            By clicking submit, the order will be updated with the changes above.
          </p>
        </main>
      </ContentArea>
    </div>
  );
}

function formatDeadlineDate(value: string) {
  if (!value.trim()) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
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
