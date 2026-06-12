import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { mockBrands } from "@/lib/mockData";
import { Bookmark, MoreHorizontal, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BrandList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredBrands = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return mockBrands;
    return mockBrands.filter((brand) => {
      return (
        brand.name.toLowerCase().includes(query) ||
        brand.alias.toLowerCase().includes(query) ||
        brand.sysname.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / pageSize));
  const visibleBrands = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBrands.slice(start, start + pageSize);
  }, [currentPage, filteredBrands]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />
      <ContentArea>
        <Header title="Brand Management" />

        <main className="space-y-4 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Register New Brand
            </Button>
          </section>

          <Card className="border-border/70 shadow-sm p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand Information</TableHead>
                    <TableHead>Alias</TableHead>
                    <TableHead>System Name</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleBrands.map((brand, index) => (
                    <TableRow
                      key={`${brand.alias}-${brand.sysname}-${index}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                            <Bookmark className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{brand.name}</p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              Brand master record
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground font-mono">
                          {brand.alias}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground font-mono">{brand.sysname}</span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Brand</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete Brand</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {visibleBrands.length === 0 && (
                <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                  No brands match your search.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredBrands.length)} of {filteredBrands.length} rows
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <Button variant="outline" onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          </div>
        </main>
      </ContentArea>
    </div>
  );
}
