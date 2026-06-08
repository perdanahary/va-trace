import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { mockBrands } from "@/lib/mockData";
import { Search, Plus, MoreHorizontal, Bookmark } from "lucide-react";
import { useMemo, useState } from "react";
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

  const filteredBrands = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return mockBrands;

    return mockBrands.filter((brand) => {
      return (
        brand.name.toLowerCase().includes(query) ||
        brand.alias.toLowerCase().includes(query) ||
        brand.sysname.toLowerCase().includes(query) ||
        brand.priceLabel?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Brand Management" />
        
        <main className="space-y-4 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between animate-in-smart">
            <div className="relative w-full xl:max-w-xl group">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
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

          <Card className="border-border/70 shadow-sm p-0 animate-in-smart" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand Information</TableHead>
                    <TableHead>Alias</TableHead>
                    <TableHead>Price Label</TableHead>
                    <TableHead>System Name</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrands.map((brand, index) => (
                    <TableRow
                      key={`${brand.alias}-${brand.sysname}-${index}`}
                      className="group animate-in-smart"
                      style={{ animationDelay: `${150 + (index * 20)}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                            <Bookmark className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-tight">{brand.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-tighter">
                              Brand master record
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground font-mono whitespace-nowrap">
                          {brand.alias}
                        </span>
                      </TableCell>
                      <TableCell>
                        {brand.priceLabel ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-primary/10 text-primary">
                            {brand.priceLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground font-mono">{brand.sysname}</span>
                      </TableCell>
                      <TableCell className="text-right">
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
              {filteredBrands.length === 0 && (
                <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                  No brands match your search.
                </div>
              )}
            </CardContent>
            <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                Showing {filteredBrands.length} of {mockBrands.length} brands
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Brand Directory
              </span>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
