import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Download, Filter, MapPin, MoreHorizontal, Plus, Search, X } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockSalesPoints, type SalesPointMapping } from "@/lib/mockData";
import { cn } from "@/lib/utils";

type SortField = keyof SalesPointMapping;
type SortDirection = "asc" | "desc";

export function SalesPointList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState("All Zones");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedArea, setSelectedArea] = useState("All Areas");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("zone");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const zones = useMemo(() => ["All Zones", ...Array.from(new Set(mockSalesPoints.map((sp) => sp.zone)))], []);
  const regions = useMemo(() => {
    const filtered = selectedZone === "All Zones" ? mockSalesPoints : mockSalesPoints.filter((sp) => sp.zone === selectedZone);
    return ["All Regions", ...Array.from(new Set(filtered.map((sp) => sp.region)))];
  }, [selectedZone]);
  const areas = useMemo(() => {
    let filtered = mockSalesPoints;
    if (selectedZone !== "All Zones") filtered = filtered.filter((sp) => sp.zone === selectedZone);
    if (selectedRegion !== "All Regions") filtered = filtered.filter((sp) => sp.region === selectedRegion);
    return ["All Areas", ...Array.from(new Set(filtered.map((sp) => sp.area)))];
  }, [selectedRegion, selectedZone]);

  const filteredData = useMemo(() => {
    const result = mockSalesPoints.filter((sp) => {
      const matchesSearch =
        sp.salesPoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sp.wcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sp.area.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesZone = selectedZone === "All Zones" || sp.zone === selectedZone;
      const matchesRegion = selectedRegion === "All Regions" || sp.region === selectedRegion;
      const matchesArea = selectedArea === "All Areas" || sp.area === selectedArea;

      return matchesSearch && matchesZone && matchesRegion && matchesArea;
    });

    return [...result].sort((a, b) => {
      const aValue = String(a[sortField] ?? "").toLowerCase();
      const bValue = String(b[sortField] ?? "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [searchQuery, selectedZone, selectedRegion, selectedArea, sortField, sortDirection]);

  const resetFilters = () => {
    setSelectedZone("All Zones");
    setSelectedRegion("All Regions");
    setSelectedArea("All Areas");
    setSearchQuery("");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Sales Point Mapping" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">Sales Point Directory</CardTitle>
              <CardDescription>Search, filter, and sort the mapping data used by import and delivery workflows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full xl:max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Sales Point, WCode, or Area..."
                    className="pl-9 pr-10"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={showFilters || selectedZone !== "All Zones" || selectedRegion !== "All Regions" || selectedArea !== "All Areas" ? "secondary" : "outline"}
                    onClick={() => setShowFilters((value) => !value)}
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button>
                    <Plus className="h-4 w-4" />
                    Add New Mapping
                  </Button>
                </div>
              </div>

              {showFilters ? (
                <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-3 xl:grid-cols-4">
                  <Field label="Zone">
                    <Select
                      value={selectedZone}
                      onValueChange={(value) => {
                        setSelectedZone(value);
                        setSelectedRegion("All Regions");
                        setSelectedArea("All Areas");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map((zone) => (
                          <SelectItem key={zone} value={zone}>
                            {zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Region">
                    <Select
                      value={selectedRegion}
                      onValueChange={(value) => {
                        setSelectedRegion(value);
                        setSelectedArea("All Areas");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Area">
                    <Select value={selectedArea} onValueChange={setSelectedArea}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={resetFilters} className="px-0">
                      Reset all filters
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20">
              <div>
                <CardTitle className="text-base">Mappings</CardTitle>
                <CardDescription>
                  Showing {filteredData.length} of {mockSalesPoints.length} total entries
                </CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                Sorted by {sortField}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead field="zone" currentField={sortField} direction={sortDirection} onSort={handleSort} label="Zone" />
                    <SortableHead field="region" currentField={sortField} direction={sortDirection} onSort={handleSort} label="Region" />
                    <SortableHead field="area" currentField={sortField} direction={sortDirection} onSort={handleSort} label="Area" />
                    <SortableHead field="wcode" currentField={sortField} direction={sortDirection} onSort={handleSort} label="WCode" />
                    <SortableHead field="salesPoint" currentField={sortField} direction={sortDirection} onSort={handleSort} label="Sales Point" />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((sp, index) => (
                      <TableRow key={`${sp.wcode}-${sp.salesPoint}-${index}`}>
                        <TableCell className="text-sm">{sp.zone}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{sp.region}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{sp.area}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full font-mono text-[10px] uppercase tracking-[0.18em]">
                            {sp.wcode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-primary/70" />
                            <span className="text-sm font-medium">{sp.salesPoint}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Open mapping</DropdownMenuItem>
                              <DropdownMenuItem>Edit mapping</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                          <Filter className="h-8 w-8 opacity-20" />
                          <p className="text-sm font-medium">No sales points match your filters</p>
                          <Button variant="ghost" onClick={resetFilters} className="mt-2 px-0">
                            Clear all filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SortableHead({
  field,
  currentField,
  direction,
  onSort,
  label,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  label: string;
}) {
  const isActive = currentField === field;

  return (
    <TableHead>
      <button onClick={() => onSort(field)} className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground">
        {label}
        {isActive ? direction === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
      </button>
    </TableHead>
  );
}
