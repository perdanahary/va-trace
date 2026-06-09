import { useState, type ChangeEvent, type ComponentType, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Edit3,
  Layers,
  Package,
  Save,
  X,
  Box,
} from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockBrands } from "@/lib/mockData";
import { mockProducts, type ProductRecord } from "@/lib/productMaster";

export function ProductDetail() {
  const { code } = useParams();
  const navigate = useNavigate();
  const isNew = code === "new";
  const [isEditing, setIsEditing] = useState(isNew);

  const initialProduct: ProductRecord = isNew
    ? {
        code: "",
        name: "",
        sourceName: "",
        clientGroup: "",
        productType: "",
        orientation: "",
        dimensions: "",
        material: "",
        brand: "",
        brandCode: "",
        weight: "",
        uom: "qty",
        status: "Active",
        formatType: "",
        inkTechnology: "",
        lengthCm: "",
        widthCm: "",
        referenceUrl: "",
      }
    : mockProducts.find((product) => product.code === code) || mockProducts[0];

  const [product, setProduct] = useState<ProductRecord>(initialProduct);

  const handleSave = () => {
    setIsEditing(false);
    console.log("Saving product:", product);
    if (isNew) {
      navigate("/admin/products");
    }
  };

  const handleCancel = () => {
    if (isNew) {
      navigate("/admin/products");
      return;
    }

    setProduct(initialProduct);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this product?")) {
      console.log("Deleting product:", product.code);
      navigate("/admin/products");
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar role="admin" />
      <ContentArea>
        <Header
          title={isNew ? "Add New Product" : `Product Details: ${product.code}`}
          actions={
            !isEditing ? (
              <>
                <Button variant="destructive" onClick={handleDelete}>
                  <X className="h-4 w-4" />
                  Delete
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4" />
                  Edit Product
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4" />
                  {isNew ? "Create Product" : "Save Changes"}
                </Button>
              </>
            )
          }
        />

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-1 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <Box className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-3">
                    {isEditing ? (
                      <Field label="Product Name">
                        <Input name="name" value={product.name} onChange={handleChange} placeholder="Enter product name..." />
                      </Field>
                    ) : (
                      <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full font-mono text-[10px] uppercase tracking-[0.24em]">
                        {product.code || "New product"}
                      </Badge>
                      <Badge variant={product.status === "Active" ? "success" : "secondary"} className="rounded-full uppercase tracking-[0.18em]">
                        {product.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Classification" icon={Package} description="Market and brand metadata used across the catalog and order workflows.">
              <Field label="Client Group">
                <Input name="clientGroup" value={product.clientGroup} onChange={handleChange} disabled={!isEditing} />
              </Field>
              <Field label="Product Type">
                <Input name="productType" value={product.productType} onChange={handleChange} disabled={!isEditing} />
              </Field>
              <Field label="Orientation">
                <SelectField
                  name="orientation"
                  value={product.orientation || "-"}
                  onChange={handleChange}
                  options={["-", "H", "V"]}
                  disabled={!isEditing}
                />
              </Field>
              <Field label="Brand">
                <SelectField
                  name="brand"
                  value={product.brand || "-"}
                  onChange={handleChange}
                  options={["-", ...mockBrands.map((brand) => brand.name)]}
                  disabled={!isEditing}
                />
              </Field>
              <Field label="Alias">
                <SelectField
                  name="brandCode"
                  value={product.brandCode || "-"}
                  onChange={handleChange}
                  options={["-", ...mockBrands.map((brand) => brand.alias)]}
                  disabled={!isEditing}
                />
              </Field>
            </SectionCard>

            <SectionCard title="Technical Details" icon={Layers} description="Physical dimensions and production-specific attributes.">
              <Field label="Dimensions">
                <Input name="dimensions" value={product.dimensions} onChange={handleChange} disabled={!isEditing} />
              </Field>
              <Field label="Material">
                <Input name="material" value={product.material} onChange={handleChange} disabled={!isEditing} />
              </Field>
              <Field label="Weight">
                <Input name="weight" value={product.weight} onChange={handleChange} disabled={!isEditing} />
              </Field>
              <Field label="UOM">
                <Input name="uom" value={product.uom} onChange={handleChange} disabled={!isEditing} />
              </Field>
              <Field label="Format Type">
                <Input name="formatType" value={product.formatType || "-"} onChange={handleChange} disabled={!isEditing} />
              </Field>
              <Field label="Ink Technology">
                <Input name="inkTechnology" value={product.inkTechnology || "-"} onChange={handleChange} disabled={!isEditing} />
              </Field>
            </SectionCard>
          </div>

          {isNew ? (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertTitle>New product record</AlertTitle>
              <AlertDescription>The product will be saved into the catalog once you submit the form.</AlertDescription>
            </Alert>
          ) : null}
        </main>
      </ContentArea>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6">{children}</CardContent>
    </Card>
  );
}

function SelectField({
  name,
  value,
  onChange,
  options,
  disabled,
}: {
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) =>
        onChange({
          target: { name, value: nextValue },
        } as ChangeEvent<HTMLSelectElement>)
      }
    >
      <SelectTrigger disabled={disabled}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
