import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { mockBrands } from "@/lib/mockData";
import { Search, Plus, MoreVertical, Bookmark } from "lucide-react";
import { useMemo, useState } from "react";

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
    <div className="flex min-h-screen bg-canvas-white font-sans">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Brand Management" />
        
        <main className="p-8 space-y-6">
          <section className="flex items-center justify-between animate-in-smart">
            <div className="relative w-96 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search brands..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-all btn-press shadow-md">
              <Plus className="w-3.5 h-3.5" />
              Register New Brand
            </button>
          </section>

          <section className="bg-white rounded-lg border border-border overflow-hidden shadow-sm animate-in-smart" style={{ animationDelay: '100ms' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                    <th className="px-6 py-4">Brand Information</th>
                    <th className="px-6 py-4">Alias</th>
                    <th className="px-6 py-4">Price Label</th>
                    <th className="px-6 py-4">System Name</th>
                    <th className="px-6 py-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBrands.map((brand, index) => (
                    <tr
                      key={`${brand.alias}-${brand.sysname}-${index}`}
                      className="hover:bg-accent/10 transition-colors group animate-in-smart"
                      style={{ animationDelay: `${150 + (index * 20)}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 border border-border">
                            <Bookmark className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">{brand.name}</p>
                            <p className="text-[10px] text-muted-foreground/80 mt-1 font-mono uppercase tracking-tighter">
                              Brand master record
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-foreground font-mono whitespace-nowrap">
                          {brand.alias}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {brand.priceLabel ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-primary/10 text-primary">
                            {brand.priceLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-muted-foreground font-mono">{brand.sysname}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-1.5 hover:bg-accent rounded-md transition-colors btn-press">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredBrands.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                        No brands match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-accent/10 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                Showing {filteredBrands.length} of {mockBrands.length} brands
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Brand Directory
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
