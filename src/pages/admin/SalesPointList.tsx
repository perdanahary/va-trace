import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, ChevronDown, ChevronUp, MapPin, MoreHorizontal, Plus, RefreshCw, Search, X } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { AppliedFilterRow, FilterMenu } from "@/components/shared/AdvancedFilterBar";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type SalesPointMapping } from "@/lib/types";
import { useMappingStore } from "@/lib/mappingStore";
import { SalesPointEditModal } from "./SalesPointEditModal";
import { matchesFilterValue } from "@/components/shared/AdvancedFilterBar";

type SortField = keyof SalesPointMapping;
type SortDirection = "asc" | "desc";

export function SalesPointList() {
  const navigate = useNavigate();
  const { mappings, updateMapping, resetMapping } = useMappingStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState("All Zones");
  const [zoneOperator, setZoneOperator] = useState<"is" | "is not">("is");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [regionOperator, setRegionOperator] = useState<"is" | "is not">("is");
  const [selectedArea, setSelectedArea] = useState("All Areas");
  const [areaOperator, setAreaOperator] = useState<"is" | "is not">("is");
  const [selectedSubArea, setSelectedSubArea] = useState("All Sub Areas");
  const [subAreaOperator, setSubAreaOperator] = useState<"is" | "is not">("is");
  const [sortField, setSortField] = useState<SortField>("zone");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [editTarget, setEditTarget] = useState<SalesPointMapping | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const pageSize = 10;

  const handleEditSave = useCallback(
    (wcode: string, data: Partial<SalesPointMapping>) => {
      updateMapping(wcode, data);
      setEditOpen(false);
      setEditTarget(null);
    },
    [updateMapping],
  );

  const handleEditClose = useCallback(() => {
    setEditOpen(false);
    setEditTarget(null);
  }, []);

  const zones = useMemo(() => ["All Zones", ...Array.from(new Set(mappings.map((sp) => sp.zone)))], []);
  const regions = useMemo(() => {
    const filtered = selectedZone === "All Zones" ? mappings : mappings.filter((sp) => sp.zone === selectedZone);
    return ["All Regions", ...Array.from(new Set(filtered.map((sp) => sp.region)))];
  }, [selectedZone]);
  const areas = useMemo(() => {
    let filtered = mappings;
    if (selectedZone !== "All Zones") filtered = filtered.filter((sp) => sp.zone === selectedZone);
    if (selectedRegion !== "All Regions") filtered = filtered.filter((sp) => sp.region === selectedRegion);
    return ["All Areas", ...Array.from(new Set(filtered.map((sp) => sp.area)))];
  }, [selectedRegion, selectedZone]);

  const subAreas = useMemo(() => {
    let filtered = mappings;
    if (selectedZone !== "All Zones") filtered = filtered.filter((sp) => sp.zone === selectedZone);
    if (selectedRegion !== "All Regions") filtered = filtered.filter((sp) => sp.region === selectedRegion);
    if (selectedArea !== "All Areas") filtered = filtered.filter((sp) => sp.area === selectedArea);
    return ["All Sub Areas", ...Array.from(new Set(filtered.map((sp) => sp.subArea)))];
  }, [selectedRegion, selectedZone, selectedArea]);

  const filterGroups = useMemo(
    () => [
      {
        id: "zone",
        label: "Zone",
        operator: zoneOperator,
        value: selectedZone === "All Zones" ? null : selectedZone,
        onValueChange: (value: string | null) => {
          setSelectedZone(value ?? "All Zones");
          setSelectedRegion("All Regions");
          setSelectedArea("All Areas");
          setSelectedSubArea("All Sub Areas");
        },
        onOperatorChange: setZoneOperator,
        allLabel: "All zones",
        options: zones.slice(1).map((zone) => ({
          label: zone,
          value: zone,
          keywords: [zone],
        })),
      },
      {
        id: "region",
        label: "Region",
        operator: regionOperator,
        value: selectedRegion === "All Regions" ? null : selectedRegion,
        onValueChange: (value: string | null) => {
          setSelectedRegion(value ?? "All Regions");
          setSelectedArea("All Areas");
          setSelectedSubArea("All Sub Areas");
        },
        onOperatorChange: setRegionOperator,
        allLabel: "All regions",
        options: regions.slice(1).map((region) => ({
          label: region,
          value: region,
          keywords: [region],
        })),
      },
      {
        id: "area",
        label: "Area",
        operator: areaOperator,
        value: selectedArea === "All Areas" ? null : selectedArea,
        onValueChange: (value: string | null) => {
          setSelectedArea(value ?? "All Areas");
          setSelectedSubArea("All Sub Areas");
        },
        onOperatorChange: setAreaOperator,
        allLabel: "All areas",
        options: areas.slice(1).map((area) => ({
          label: area,
          value: area,
          keywords: [area],
        })),
      },
      {
        id: "sub-area",
        label: "Sub Area",
        operator: subAreaOperator,
        value: selectedSubArea === "All Sub Areas" ? null : selectedSubArea,
        onValueChange: (value: string | null) => setSelectedSubArea(value ?? "All Sub Areas"),
        onOperatorChange: setSubAreaOperator,
        allLabel: "All sub areas",
        options: subAreas.slice(1).map((subArea) => ({
          label: subArea,
          value: subArea,
          keywords: [subArea],
        })),
      },
    ],
    [areas, regions, selectedArea, selectedRegion, selectedSubArea, selectedZone, subAreas, zones],
  );

  const filteredData = useMemo(() => {
    const result = mappings.filter((sp) => {
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

      const matchesZone = selectedZone === "All Zones" || matchesFilterValue(zoneOperator, sp.zone, selectedZone);
      const matchesRegion = selectedRegion === "All Regions" || matchesFilterValue(regionOperator, sp.region, selectedRegion);
      const matchesArea = selectedArea === "All Areas" || matchesFilterValue(areaOperator, sp.area, selectedArea);
      const matchesSubArea = selectedSubArea === "All Sub Areas" || matchesFilterValue(subAreaOperator, sp.subArea, selectedSubArea);

      return matchesSearch && matchesZone && matchesRegion && matchesArea && matchesSubArea;
    });

    return [...result].sort((a, b) => {
      const aValue = String(a[sortField] ?? "").toLowerCase();
      const bValue = String(b[sortField] ?? "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [areaOperator, regionOperator, searchQuery, selectedZone, selectedRegion, selectedArea, selectedSubArea, sortField, sortDirection, subAreaOperator, zoneOperator]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const visibleData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [currentPage, filteredData]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedZone, selectedRegion, selectedArea, selectedSubArea]);

  const resetFilters = () => {
    setSelectedZone("All Zones");
    setZoneOperator("is");
    setSelectedRegion("All Regions");
    setRegionOperator("is");
    setSelectedArea("All Areas");
    setAreaOperator("is");
    setSelectedSubArea("All Sub Areas");
    setSubAreaOperator("is");
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
      <Sidebar userRole="admin" />
      <ContentArea>
        <Header title="Sales Point" />

        <main className="space-y-4 p-4 sm:p-6 lg:p-8">
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
                <FilterMenu groups={filterGroups} />
                <Button>
                  <Plus className="h-4 w-4" />
                  Add New Mapping
                </Button>
              </div>
            </div>

            <AppliedFilterRow groups={filterGroups} onClearAll={resetFilters} />
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
                  {visibleData.length > 0 ? (
                    visibleData.map((sp, index) => (
                      <TableRow key={`${sp.wcode}-${sp.salesPoint}-${index}`} className="cursor-pointer" onClick={() => navigate(`/admin/sales-points/${sp.wcode}`)}>
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
                        <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => navigate(`/admin/sales-points/${sp.wcode}`)}>View details</DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setEditTarget(sp);
                                  setEditOpen(true);
                                }}
                              >
                                Edit mapping
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => resetMapping(sp.wcode)}
                              >
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                Reset to default
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="py-12 text-center text-muted-foreground text-sm">
                        No sales points match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} rows
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

      <SalesPointEditModal isOpen={editOpen} onClose={handleEditClose} onSave={handleEditSave} mapping={editTarget} />
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
