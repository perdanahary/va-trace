import { Box, MoreHorizontal, Package, Plus, Search, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockProducts } from "@/lib/productMaster";

export function ProductList() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Product Catalog" />

        <main className="space-y-4 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search products by name or code..." className="pl-9" />
            </div>
            <Button onClick={() => navigate("/admin/products/new")}>
              <Plus className="h-4 w-4" />
              Add New Product
            </Button>
          </section>

          <Card className="border-border/70 shadow-sm p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Information</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Unit Weight</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockProducts.map((product) => (
                    <TableRow
                      key={product.code}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/products/${product.code}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                            <Box className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
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
                      <TableCell className="text-sm text-muted-foreground">{product.material || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" />
                          {product.weight}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.status === "Active" ? "success" : "secondary"} className="rounded-full uppercase tracking-[0.18em]">
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Open product</DropdownMenuItem>
                            <DropdownMenuItem>Edit product</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
