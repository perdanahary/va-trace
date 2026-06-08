import { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Search, Plus, MoreVertical, MapPin, Download, Filter, X, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockSalesPoints, SalesPointMapping } from "@/lib/mockData";

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

  // Dynamic filter options based on parent selection
  const zones = useMemo(() => ["All Zones", ...Array.from(new Set(mockSalesPoints.map(sp => sp.zone)))], []);
  
  const regions = useMemo(() => {
    const filtered = selectedZone === "All Zones" 
      ? mockSalesPoints 
      : mockSalesPoints.filter(sp => sp.zone === selectedZone);
    return ["All Regions", ...Array.from(new Set(filtered.map(sp => sp.region)))];
  }, [selectedZone]);
  
  const areas = useMemo(() => {
    let filtered = mockSalesPoints;
    if (selectedZone !== "All Zones") filtered = filtered.filter(sp => sp.zone === selectedZone);
    if (selectedRegion !== "All Regions") filtered = filtered.filter(sp => sp.region === selectedRegion);
    return ["All Areas", ...Array.from(new Set(filtered.map(sp => sp.area)))];
  }, [selectedZone, selectedRegion]);

  const filteredData = useMemo(() => {
    const result = mockSalesPoints.filter(sp => {
      const matchesSearch = 
        sp.salesPoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sp.wcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sp.area.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesZone = selectedZone === "All Zones" || sp.zone === selectedZone;
      const matchesRegion = selectedRegion === "All Regions" || sp.region === selectedRegion;
      const matchesArea = selectedArea === "All Areas" || sp.area === selectedArea;

      return matchesSearch && matchesZone && matchesRegion && matchesArea;
    });

    // Apply Sorting
    return [...result].sort((a, b) => {
      const aValue = String(a[sortField] ?? "").toLowerCase();
      const bValue = String(b[sortField] ?? "").toLowerCase();
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [searchQuery, selectedZone, selectedRegion, selectedArea, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20 group-hover:opacity-50 transition-opacity" />;
    return sortDirection === "asc" 
      ? <ChevronUp className="w-3 h-3 ml-1 text-primary" /> 
      : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const resetFilters = () => {
    setSelectedZone("All Zones");
    setSelectedRegion("All Regions");
    setSelectedArea("All Areas");
    setSearchQuery("");
  };

  return (
    <div className="flex min-h-screen bg-canvas-white font-sans">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Sales Point Mapping" />
        
        <main className="p-8 space-y-6">
          <section className="space-y-4 animate-in-smart">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-96 group">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search by Sales Point, WCode, or Area..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 border rounded-md text-xs font-medium transition-all btn-press shadow-sm",
                    showFilters || selectedZone !== "All Zones" || selectedRegion !== "All Regions" || selectedArea !== "All Areas"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-white border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filters
                  {(selectedZone !== "All Zones" || selectedRegion !== "All Regions" || selectedArea !== "All Areas") && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-md text-xs font-medium hover:bg-accent transition-all btn-press shadow-sm">
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  Export CSV
                </button>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-all btn-press shadow-md">
                <Plus className="w-3.5 h-3.5" />
                Add New Mapping
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-white border border-border rounded-lg shadow-sm animate-in-smart">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Zone</label>
                  <select 
                    value={selectedZone}
                    onChange={(e) => {
                      setSelectedZone(e.target.value);
                      setSelectedRegion("All Regions");
                      setSelectedArea("All Areas");
                    }}
                    className="w-full px-3 py-2 bg-canvas-white border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                  >
                    {zones.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Region</label>
                  <select 
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setSelectedArea("All Areas");
                    }}
                    className="w-full px-3 py-2 bg-canvas-white border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                  >
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Area</label>
                  <select 
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas-white border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                  >
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <button 
                    onClick={resetFilters}
                    className="text-[10px] font-bold text-primary hover:underline px-1"
                  >
                    Reset all filters
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-border overflow-hidden shadow-sm animate-in-smart" style={{ animationDelay: '100ms' }}>
            <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-accent/50 transition-colors group select-none"
                      onClick={() => handleSort("zone")}
                    >
                      <div className="flex items-center">
                        Zone <SortIndicator field="zone" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-accent/50 transition-colors group select-none"
                      onClick={() => handleSort("region")}
                    >
                      <div className="flex items-center">
                        Region <SortIndicator field="region" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-accent/50 transition-colors group select-none"
                      onClick={() => handleSort("area")}
                    >
                      <div className="flex items-center">
                        Area <SortIndicator field="area" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-accent/50 transition-colors group select-none"
                      onClick={() => handleSort("wcode")}
                    >
                      <div className="flex items-center">
                        WCode <SortIndicator field="wcode" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-accent/50 transition-colors group select-none"
                      onClick={() => handleSort("salesPoint")}
                    >
                      <div className="flex items-center">
                        Sales Point <SortIndicator field="salesPoint" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.length > 0 ? (
                    filteredData.map((sp, index) => (
                      <tr 
                        key={`${sp.wcode}-${sp.salesPoint}-${index}`} 
                        className="hover:bg-accent/5 transition-colors group"
                      >
                        <td className="px-6 py-4 text-xs font-medium text-foreground">{sp.zone}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">{sp.region}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">{sp.area}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold border border-slate-200">
                            {sp.wcode}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-primary/70" />
                            <span className="text-xs font-bold text-foreground">{sp.salesPoint}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="p-1.5 hover:bg-accent rounded-md transition-colors btn-press">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Filter className="w-8 h-8 opacity-20" />
                          <p className="text-sm font-medium">No sales points match your filters</p>
                          <button 
                            onClick={resetFilters}
                            className="text-xs text-primary hover:underline font-bold mt-2"
                          >
                            Clear all filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-accent/10 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                Showing {filteredData.length} of {mockSalesPoints.length} total entries
              </span>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-white border border-border rounded text-[10px] font-bold text-muted-foreground hover:bg-accent disabled:opacity-50" disabled>Previous</button>
                <button className="px-3 py-1 bg-white border border-border rounded text-[10px] font-bold text-primary hover:bg-accent">Next</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
