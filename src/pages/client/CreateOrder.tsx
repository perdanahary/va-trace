import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Calendar, Info, Search, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSalesPointClientBinding, mockProducts, mockSalesPoints } from "@/lib/mockData";
import { appendOrders, createManualOrder } from "@/lib/orderStore";
import { useCurrentUser } from "@/lib/authStore";
import { useClientStore } from "@/lib/clientStore";

export function CreateOrder() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const { clients } = useClientStore();
  const [items, setItems] = useState([{ id: "item-1", productCode: "", quantity: 0, poLineNumber: "1" }]);
  const [clientPO, setClientPO] = useState("");

  const linkedClient = useMemo(
    () => (currentUser ? clients.find((c) => c.linkedUserId === currentUser.id) : null),
    [currentUser, clients],
  );

  const clientSalesPoints = useMemo(
    () => (linkedClient ? mockSalesPoints.filter((sp) => sp.clientId === linkedClient.id) : []),
    [linkedClient],
  );

  const [selectedSalesPoint, setSelectedSalesPoint] = useState("WH020");
  const [deadline, setDeadline] = useState("");
  const [linkFA, setLinkFA] = useState("");
  const [note, setNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const salesPoint = mockSalesPoints.find((entry) => entry.wcode === selectedSalesPoint) ?? mockSalesPoints[0];
  const salesPointClient = getSalesPointClientBinding(salesPoint.wcode);
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return mockProducts;
    const q = searchQuery.toLowerCase();
    return mockProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!clientPO.trim()) errors.push("PO number reference is required.");

    if (!deadline.trim()) errors.push("Deadline is required.");

    items.forEach((item, index) => {
      const product = mockProducts.find((entry) => entry.code === item.productCode);

      if (!item.productCode) errors.push(`Item ${index + 1}: select a product.`);
      if (!product) errors.push(`Item ${index + 1}: product code is not recognized.`);
      if (item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than zero.`);
    });

    return errors;
  }, [clientPO, deadline, items]);

  const selectProduct = (productCode: string) => {
    const exists = items.find((item) => item.productCode === productCode);
    if (exists) {
      toast.info("Product already in list.");
      return;
    }
    setItems((current) => [
      ...current,
      { id: `item-${Date.now()}`, productCode, quantity: 1, poLineNumber: String(current.length + 1) },
    ]);
    setSearchQuery("");
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

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const order = createManualOrder({
      campaign: clientPO || "Direct Entry",
      clientPO,
      // soNumber is auto-generated when vendor starts production
      supplier: "Pending",
      salesPointId: selectedSalesPoint,
      deadline,
      note: note.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      referenceLink: linkFA.trim() ? { url: linkFA.trim() } : undefined,
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
    toast.success(`Order ${order.id} created.`);
    navigate("/client");
  };

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar userRole="client" />
      <ContentArea>
        <Header
          title="New Order Request"
          actions={
            <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
              {isSubmitting ? "Creating..." : "Create Order Request"}
            </Button>
          }
        />

        <main className="mx-auto max-w-2xl space-y-6 px-8 py-8">
          <div className="flex items-center justify-between">
            <Link to="/client" className="flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary group">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Discard and Return
            </Link>
            {submitError ? (
              <p className="text-xs font-medium text-destructive">{submitError}</p>
            ) : null}
          </div>

          {currentUser || linkedClient ? (
            <Card className="border-border/70 bg-muted/20 shadow-sm">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-medium">{currentUser?.name}</p>
                  <p className="text-muted-foreground">
                    {linkedClient?.entityName ?? currentUser?.company}
                    {linkedClient ? <span className="font-mono"> &middot; {linkedClient.id}</span> : null}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 rounded-full text-[9px] uppercase tracking-[0.2em]">
                  Client
                </Badge>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-border">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
                <Truck className="h-3 w-3 text-primary" />
              </div>
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Supplier &amp; Destination</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Supplier</p>
                  <p className="text-sm font-medium text-muted-foreground italic">Pending</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destination</p>
                  <p className="text-sm font-medium">
                    {salesPoint.wcode} - {salesPoint.salesPoint}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Client: {salesPointClient?.clientName ?? "Unbound"} &middot; {salesPointClient?.clientEntityName ?? "No entity"}
                  </p>
                </div>
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
                <FormInput id="client-po" label="PO number reference" placeholder="e.g. 123928098" required value={clientPO} onChange={setClientPO} />
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

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="note">
                  Notes to supplier
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add notes to supplier..."
                  className="h-16 w-full rounded-md border border-border bg-white px-3 py-2 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <FormInput id="tags" label="Tags" placeholder="e.g. urgent, bulk" value={tagsInput} onChange={setTagsInput} />

              <FormInput id="link" label="Link" placeholder="https://..." value={linkFA} onChange={setLinkFA} />
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Add items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="relative pt-5">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item"
                  className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-4 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
                />
                {searchQuery && filteredProducts.length > 0 ? (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-md border border-border bg-white shadow-lg">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.code}
                        onClick={() => selectProduct(product.code)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                      >
                        <span className="font-medium">{product.name}</span>
                        <span className="text-muted-foreground font-mono">{product.code}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-[9px] font-bold uppercase tracking-wider">#</TableHead>
                      <TableHead className="text-[9px] font-bold uppercase tracking-wider">Product</TableHead>
                      <TableHead className="w-20 text-[9px] font-bold uppercase tracking-wider">Qty</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No items yet. Search and select a product.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => {
                        const product = mockProducts.find((p) => p.code === item.productCode);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="py-2.5 text-muted-foreground font-mono">{index + 1}</TableCell>
                            <TableCell className="py-2.5">
                              {product ? (
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-muted-foreground font-mono text-[10px]">{product.code}</p>
                                </div>
                              ) : (
                                <span className="italic text-muted-foreground">Select a product</span>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <input
                                type="number"
                                value={item.quantity || ""}
                                onChange={(event) => updateItem(item.id, "quantity", event.target.value)}
                                placeholder="0"
                                className="w-full rounded border border-border bg-white px-2 py-1 text-xs outline-none transition-all focus:ring-1 focus:ring-primary"
                              />
                            </TableCell>
                            <TableCell className="py-2.5">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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
            By clicking create, the order will be sent to the admin for review.
          </p>
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
