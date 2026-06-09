import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Download, Filter, MapPin, MoreHorizontal, Phone, Plus, Search, User, X } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { FilterField, FilterSection } from "@/components/shared/FilterSection";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockSalesPoints, type SalesPointMapping } from "@/lib/mockData";

type SortField = keyof SalesPointMapping;
type SortDirection = "asc" | "desc";

export function SalesPointList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState("All Zones");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedArea, setSelectedArea] = useState("All Areas");
  const [selectedSubArea, setSelectedSubArea] = useState("All Sub Areas");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("zone");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedDetail, setSelectedDetail] = useState<SalesPointMapping | null>(null);

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

  const subAreas = useMemo(() => {
    let filtered = mockSalesPoints;
    if (selectedZone !== "All Zones") filtered = filtered.filter((sp) => sp.zone === selectedZone);
    if (selectedRegion !== "All Regions") filtered = filtered.filter((sp) => sp.region === selectedRegion);
    if (selectedArea !== "All Areas") filtered = filtered.filter((sp) => sp.area === selectedArea);
    return ["All Sub Areas", ...Array.from(new Set(filtered.map((sp) => sp.subArea)))];
  }, [selectedRegion, selectedZone, selectedArea]);

  const filteredData = useMemo(() => {
    const result = mockSalesPoints.filter((sp) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        sp.salesPoint.toLowerCase().includes(q) ||
        sp.subArea.toLowerCase().includes(q) ||
        sp.wcode.toLowerCase().includes(q) ||
        sp.area.toLowerCase().includes(q) ||
        sp.clientName.toLowerCase().includes(q) ||
        sp.clientEntityName.toLowerCase().includes(q) ||
        sp.pic1.name.toLowerCase().includes(q) ||
        sp.pic2.name.toLowerCase().includes(q) ||
        sp.remarks.toLowerCase().includes(q) ||
        sp.note.toLowerCase().includes(q);

      const matchesZone = selectedZone === "All Zones" || sp.zone === selectedZone;
      const matchesRegion = selectedRegion === "All Regions" || sp.region === selectedRegion;
      const matchesArea = selectedArea === "All Areas" || sp.area === selectedArea;
      const matchesSubArea = selectedSubArea === "All Sub Areas" || sp.subArea === selectedSubArea;

      return matchesSearch && matchesZone && matchesRegion && matchesArea && matchesSubArea;
    });

    return [...result].sort((a, b) => {
      const aValue = String(a[sortField] ?? "").toLowerCase();
      const bValue = String(b[sortField] ?? "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [searchQuery, selectedZone, selectedRegion, selectedArea, selectedSubArea, sortField, sortDirection]);

  const resetFilters = () => {
    setSelectedZone("All Zones");
    setSelectedRegion("All Regions");
    setSelectedArea("All Areas");
    setSelectedSubArea("All Sub Areas");
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
      <ContentArea>
        <Header title="Sales Point Mapping" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Sales Point, Sub Area, WCode, PIC, Remarks, or Note..."
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
                  variant={showFilters || selectedZone !== "All Zones" || selectedRegion !== "All Regions" || selectedArea !== "All Areas" || selectedSubArea !== "All Sub Areas" ? "secondary" : "outline"}
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
              <FilterSection
                contentClassName="grid-cols-2 md:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
                actions={
                  <>
                    <Button
                      variant="ghost"
                      onClick={resetFilters}
                      className="h-auto px-0 font-normal text-muted-foreground hover:bg-transparent hover:text-primary hover:underline"
                    >
                      Reset all filters
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowFilters(false)}
                      className="h-auto px-0 font-normal text-muted-foreground hover:bg-transparent hover:text-primary hover:underline"
                    >
                      Hide filters
                    </Button>
                  </>
                }
              >
                <FilterField label="Zone">
                  <Select
                    value={selectedZone}
                    onValueChange={(value) => {
                      setSelectedZone(value);
                      setSelectedRegion("All Regions");
                      setSelectedArea("All Areas");
                      setSelectedSubArea("All Sub Areas");
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
                </FilterField>
                <FilterField label="Region">
                  <Select
                    value={selectedRegion}
                    onValueChange={(value) => {
                      setSelectedRegion(value);
                      setSelectedArea("All Areas");
                      setSelectedSubArea("All Sub Areas");
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
                </FilterField>
                <FilterField label="Area">
                  <Select
                    value={selectedArea}
                    onValueChange={(value) => {
                      setSelectedArea(value);
                      setSelectedSubArea("All Sub Areas");
                    }}
                  >
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
                </FilterField>
                <FilterField label="Sub Area">
                  <Select value={selectedSubArea} onValueChange={setSelectedSubArea}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subAreas.map((subArea) => (
                        <SelectItem key={subArea} value={subArea}>
                          {subArea}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              </FilterSection>
            ) : null}
          </div>

          <Card className="p-0 border-border/70 shadow-sm overflow-x-auto">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead field="zone" currentField={sortField} direction={sortDirection} onSort={handleSort} label="Zone" />
                    <SortableHead field="region" currentField={sortField} direction={sortDirection} onSort={handleSort} label="Region" />
                    <SortableHead field="area" currentField={sortField} direction={sortDirection} onSort={handleSort} label="Area" />
                    <TableHead>Sub Area</TableHead>
                    <SortableHead field="wcode" currentField={sortField} direction={sortDirection} onSort={handleSort} label="WCode" />
                    <SortableHead field="salesPoint" currentField={sortField} direction={sortDirection} onSort={handleSort} label="Sales Point" />
                    <TableHead>PIC 1</TableHead>
                    <TableHead>PIC 2</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Remarks</TableHead>
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
                        <TableCell className="text-sm text-muted-foreground">{sp.subArea}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full font-mono text-[10px] uppercase tracking-[0.18em]">
                            {sp.wcode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            <span className="text-sm font-medium">{sp.salesPoint}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sp.pic1.name ? (
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{sp.pic1.name}</p>
                              <p className="text-xs text-muted-foreground">{sp.pic1.email}</p>
                              <p className="text-xs text-muted-foreground">{sp.pic1.phone}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sp.pic2.name ? (
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{sp.pic2.name}</p>
                              <p className="text-xs text-muted-foreground">{sp.pic2.email}</p>
                              <p className="text-xs text-muted-foreground">{sp.pic2.phone}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{sp.clientName}</p>
                            <p className="text-xs text-muted-foreground">{sp.clientEntityName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={sp.note}>
                          {sp.note || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate" title={sp.remarks}>
                          {sp.remarks || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setSelectedDetail(sp)}>View details</DropdownMenuItem>
                              <DropdownMenuItem>Edit mapping</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                          <Filter className="h-8 w-8 opacity-20" />
                          <p className="text-sm font-medium">No sales points match your filters</p>
                          <Button 
                            variant="ghost" 
                            onClick={resetFilters} 
                            className="mt-2 h-auto px-0 font-normal text-muted-foreground hover:bg-transparent hover:text-primary hover:underline"
                          >
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
      </ContentArea>

      <Sheet open={!!selectedDetail} onOpenChange={(open) => { if (!open) setSelectedDetail(null); }}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          {selectedDetail ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {selectedDetail.salesPoint}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6 px-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Location</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Zone</span>
                      <p className="font-medium">{selectedDetail.zone}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Region</span>
                      <p className="font-medium">{selectedDetail.region}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Area</span>
                      <p className="font-medium">{selectedDetail.area}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Sub Area</span>
                      <p className="font-medium">{selectedDetail.subArea}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">WCode</span>
                      <Badge variant="secondary" className="rounded-full font-mono text-[10px] uppercase tracking-[0.18em]">
                        {selectedDetail.wcode}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">PIC 1</h4>
                  {selectedDetail.pic1.name ? (
                    <div className="space-y-2 text-sm">
                      <DetailRow label="Name" value={selectedDetail.pic1.name} />
                      <DetailRow label="Email" value={selectedDetail.pic1.email} />
                      <DetailRow label="Phone" value={selectedDetail.pic1.phone} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No PIC 1 assigned</p>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">PIC 2</h4>
                  {selectedDetail.pic2.name ? (
                    <div className="space-y-2 text-sm">
                      <DetailRow label="Name" value={selectedDetail.pic2.name} />
                      <DetailRow label="Email" value={selectedDetail.pic2.email} />
                      <DetailRow label="Phone" value={selectedDetail.pic2.phone} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No PIC 2 assigned</p>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Remarks & Notes</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Remarks</span>
                      <p className="font-medium">{selectedDetail.remarks || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Note</span>
                      <p className="font-medium whitespace-pre-wrap">{selectedDetail.note || "—"}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Shipping Address</h4>
                  <div className="space-y-2 text-sm">
                    <DetailRow label="Provinsi" value={selectedDetail.shippingAddress.provinsi} />
                    <DetailRow label="Kota/Kabupaten" value={selectedDetail.shippingAddress.kotaKabupaten} />
                    <DetailRow label="Kecamatan" value={selectedDetail.shippingAddress.kecamatan} />
                    <DetailRow label="Alamat" value={selectedDetail.shippingAddress.alamat} />
                    <DetailRow label="Kode Pos" value={selectedDetail.shippingAddress.kodePos} />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Client</h4>
                  <div className="space-y-2 text-sm">
                    <DetailRow label="Name" value={selectedDetail.clientName} />
                    <DetailRow label="Entity" value={selectedDetail.clientEntityName} />
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="font-medium">{value || "—"}</p>
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
