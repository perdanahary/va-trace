import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Layers,
  Package,
  ArrowLeft,
  Tag,
  Ruler,
  Weight,
  Sparkles,
  CircleCheck,
} from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mockProducts } from "@/lib/productMaster";
import { mockBrands } from "@/lib/mockData";

export function VendorProductDetail() {
  const { code } = useParams();
  const navigate = useNavigate();

  const product = useMemo(() => {
    return mockProducts.find((p) => p.code === code);
  }, [code]);

  const brandSeed = useMemo(() => {
    if (!product) return null;
    return mockBrands.find((b) => b.name === product.brand || b.alias === product.brandCode);
  }, [product]);

  if (!product) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar role="vendor" />
        <ContentArea>
          <Header title="Product Not Found" />
          <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-2xl space-y-4 text-center">
              <h2 className="text-lg font-semibold">Product not found</h2>
              <p className="text-muted-foreground">
                The product you are looking for does not exist in the catalog.
              </p>
              <Button onClick={() => navigate("/vendor/products")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Button>
            </div>
          </main>
        </ContentArea>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="vendor" />
      <ContentArea>
        <Header
          title="Product Details"
          actions={
            <Button variant="outline" onClick={() => navigate("/vendor/products")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          }
        />

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Product Header */}
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-1 items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <Box className="h-7 w-7" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                      {product.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full font-mono text-[10px] uppercase tracking-[0.24em]"
                      >
                        {product.code}
                      </Badge>
                      <Badge
                        variant={
                          product.status === "Active" ? "success" : "secondary"
                        }
                        className="rounded-full uppercase tracking-[0.18em]"
                      >
                        {product.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Classification Card */}
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Classification</CardTitle>
                </div>
                <CardDescription>
                  Market and brand metadata used across the catalog and order workflows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <InfoRow
                  label="Client Group"
                  value={product.clientGroup || "—"}
                  icon={Tag}
                />
                <InfoRow
                  label="Product Type"
                  value={product.productType || "—"}
                  icon={Box}
                />
                <InfoRow
                  label="Orientation"
                  value={product.orientation || "—"}
                  icon={Ruler}
                />
                <InfoRow
                  label="Brand"
                  value={product.brand || "—"}
                  icon={Tag}
                />
                <InfoRow
                  label="Alias"
                  value={product.brandCode || "—"}
                  icon={Tag}
                />
                {brandSeed && (
                  <InfoRow
                    label="Brand Code"
                    value={brandSeed.alias || "—"}
                    icon={CircleCheck}
                  />
                )}
              </CardContent>
            </Card>

            {/* Technical Details Card */}
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Technical Details</CardTitle>
                </div>
                <CardDescription>
                  Physical dimensions and production-specific attributes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <InfoRow
                  label="Dimensions"
                  value={product.dimensions || "—"}
                  icon={Ruler}
                />
                <InfoRow
                  label="Material"
                  value={product.material || "—"}
                  icon={Sparkles}
                />
                <InfoRow
                  label="Weight"
                  value={product.weight || "—"}
                  icon={Weight}
                />
                <InfoRow
                  label="UOM"
                  value={product.uom || "—"}
                  icon={Package}
                />
                <InfoRow
                  label="Format Type"
                  value={product.formatType || "—"}
                  icon={Layers}
                />
                <InfoRow
                  label="Ink Technology"
                  value={product.inkTechnology || "—"}
                  icon={Sparkles}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </ContentArea>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
