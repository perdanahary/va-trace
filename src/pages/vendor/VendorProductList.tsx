import { useMemo, useState } from "react";
import {
  Box,
  Eye,
  Package,
  Search,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockProducts } from "@/lib/productMaster";

export function VendorProductList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return mockProducts;
    const query = searchQuery.toLowerCase();
    return mockProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.code.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.material?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const activeCount = useMemo(
    () => filteredProducts.filter((p) => p.status === "Active").length,
    [filteredProducts]
  );

  const inactiveCount = useMemo(
    () => filteredProducts.filter((p) => p.status === "Inactive").length,
    [filteredProducts]
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="vendor" />
      <ContentArea>
        <Header title="Product Catalog" />

        <main className="space-y-4 p-4 sm:p-6 lg:p-8">
          {/* Summary Cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/70 shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-semibold tracking-tight">
                    {filteredProducts.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/70 shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-semibold tracking-tight">
                    {activeCount}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/70 shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-semibold tracking-tight">
                    {inactiveCount}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Search */}
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products by name, code, brand, or material..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </section>

          {/* Product Table */}
          <Card className="border-border/70 p-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Information</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Unit Weight</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No products found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow
                        key={product.code}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/vendor/products/${product.code}`)
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                              <Box className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {product.name}
                              </p>
                              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                {product.code}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Tag className="h-3.5 w-3.5 text-primary/60" />
                            {product.brand}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.material || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5" />
                            {product.weight}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.status === "Active"
                                ? "success"
                                : "secondary"
                            }
                            className="rounded-full uppercase tracking-[0.18em]"
                          >
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/vendor/products/${product.code}`)
                            }
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
}
