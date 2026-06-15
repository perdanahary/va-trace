import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Plus, Save, Trash2 } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSupplierStore } from "@/lib/supplierStore";
import type { Supplier, VendorPIC } from "@/lib/supplierStore";

const emptyForm: Omit<Supplier, "id"> = {
  name: "",
  type: "PT",
  phone: "",
  picName: "",
  email: "",
  status: "ACTIVE",
  addressLines: [],
  vendorPICs: [{ name: "", phone: "", email: "" }],
};

export function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSupplierStore();
  const isNew = id === "new";

  const existingSupplier = !isNew ? suppliers.find((s) => s.id === id) : undefined;

  const [formData, setFormData] = useState<Omit<Supplier, "id">>(emptyForm);
  const [addressText, setAddressText] = useState("");
  const initialized = useRef(false);
  const prevId = useRef(id);

  if (id !== prevId.current) {
    prevId.current = id;
    initialized.current = false;
  }

  if (existingSupplier && !initialized.current) {
    initialized.current = true;
    setFormData({
      name: existingSupplier.name,
      type: existingSupplier.type,
      phone: existingSupplier.phone,
      picName: existingSupplier.picName,
      email: existingSupplier.email,
      status: existingSupplier.status,
      addressLines: existingSupplier.addressLines ?? [],
      vendorPICs:
        existingSupplier.vendorPICs && existingSupplier.vendorPICs.length > 0
          ? existingSupplier.vendorPICs
          : [{ name: existingSupplier.picName, phone: existingSupplier.phone, email: existingSupplier.email }],
    });
    setAddressText((existingSupplier.addressLines ?? []).join("\n"));
  } else if (isNew && !initialized.current) {
    initialized.current = true;
    setFormData(emptyForm);
    setAddressText("");
  }

  if (!isNew && !existingSupplier) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole="admin" />
        <ContentArea>
          <Header title="Supplier Not Found" />
          <main className="p-4 sm:p-6 lg:p-8">
            <Card className="border-border/70 mx-auto max-w-lg shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                <p className="text-muted-foreground">
                  Supplier with ID <span className="font-mono font-medium text-foreground">{id}</span> was not found.
                </p>
                <Button variant="outline" onClick={() => navigate("/admin/suppliers")}>
                  Back to Suppliers
                </Button>
              </CardContent>
            </Card>
          </main>
        </ContentArea>
      </div>
    );
  }

  const handleSave = () => {
    const addressLines = addressText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const validPICs = (formData.vendorPICs ?? []).filter((pic) => pic.name.trim());
    const primaryPIC = validPICs[0] ?? { name: "", phone: "", email: "" };

    const payload = {
      ...formData,
      picName: primaryPIC.name,
      phone: primaryPIC.phone || formData.phone,
      email: primaryPIC.email || formData.email,
      vendorPICs: validPICs.length > 0 ? validPICs : undefined,
      addressLines: addressLines.length ? addressLines : undefined,
    };

    if (isNew) {
      addSupplier(payload);
      navigate("/admin/suppliers");
    } else if (existingSupplier) {
      updateSupplier(existingSupplier.id, payload);
    }
  };

  const handleDelete = () => {
    if (existingSupplier && confirm("Delete this supplier?")) {
      deleteSupplier(existingSupplier.id);
      navigate("/admin/suppliers");
    }
  };

  const handleRemovePIC = (index: number) => {
    const updated = (formData.vendorPICs ?? []).filter((_, i) => i !== index);
    setFormData({ ...formData, vendorPICs: updated });
  };

  const handleAddPIC = () => {
    const updated = [...(formData.vendorPICs ?? []), { name: "", phone: "", email: "" }];
    setFormData({ ...formData, vendorPICs: updated });
  };

  const handlePICChange = (index: number, field: keyof VendorPIC, value: string) => {
    const updated = [...(formData.vendorPICs ?? [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, vendorPICs: updated });
  };

  const title = isNew ? "Register New Supplier" : existingSupplier!.name;

  const headerActions = (
    <>
      {!isNew && (
        <Button variant="outline" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      )}
      <Button onClick={handleSave}>
        <Save className="h-4 w-4" />
        {isNew ? "Create Supplier" : "Save Changes"}
      </Button>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />
      <ContentArea>
        <Header title={title} actions={headerActions} />

        <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
          <Tabs defaultValue="company">
            <TabsList>
              <TabsTrigger value="company">Company Information</TabsTrigger>
              <TabsTrigger value="pics">Vendor PICs ({(formData.vendorPICs ?? []).length})</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="space-y-6">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Company Name" required>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. PT Print Solusi Indonesia"
                      />
                    </Field>
                    <Field label="Business Type" required>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as Supplier["type"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PT">PT</SelectItem>
                          <SelectItem value="CV">CV</SelectItem>
                          <SelectItem value="Personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Phone Number" required>
                      <Input
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. 02188997766"
                      />
                    </Field>
                    <Field label="Status" required>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as Supplier["status"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Address Lines">
                        <Textarea
                          value={addressText}
                          onChange={(e) => setAddressText(e.target.value)}
                          placeholder={"One line per row\nStreet address\nCity / postal code"}
                          className="min-h-28"
                        />
                        <p className="text-xs text-muted-foreground">Optional. Use one line per row for delivery-note formatting.</p>
                      </Field>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pics" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Minimum 1 PIC. Maximum 2 PICs.
                </p>
                {(formData.vendorPICs ?? []).length < 2 && (
                  <Button variant="outline" size="sm" onClick={handleAddPIC}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add PIC {((formData.vendorPICs ?? []).length) + 1}
                  </Button>
                )}
              </div>

              {(formData.vendorPICs ?? []).map((pic, index) => (
                <Card key={index} className="border-border/70 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-3">
                    <CardTitle className="text-sm font-medium">PIC {index + 1}</CardTitle>
                    {(formData.vendorPICs ?? []).length > 1 && (
                      <Button variant="ghost" size="icon-xs" onClick={() => handleRemovePIC(index)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="PIC Name" required>
                        <Input
                          required
                          value={pic.name}
                          onChange={(e) => handlePICChange(index, "name", e.target.value)}
                          placeholder="e.g. Marco Polo"
                        />
                      </Field>
                      <Field label="PIC Phone" required>
                        <Input
                          required
                          value={pic.phone}
                          onChange={(e) => handlePICChange(index, "phone", e.target.value)}
                          placeholder="e.g. 02188997766"
                        />
                      </Field>
                      <Field label="PIC Email" required>
                        <Input
                          required
                          type="email"
                          value={pic.email}
                          onChange={(e) => handlePICChange(index, "email", e.target.value)}
                          placeholder="e.g. pic@supplier.co.id"
                        />
                      </Field>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </main>
      </ContentArea>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label} {required ? "*" : ""}
      </label>
      {children}
    </div>
  );
}
