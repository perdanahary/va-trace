import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { mockProducts } from "@/lib/productMaster";
import { Search, Plus, MoreVertical, Tag, Package, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export function ProductList() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-canvas-white font-sans">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Product Catalog" />
        
        <main className="p-8 space-y-6">
          <section className="flex items-center justify-between animate-in-smart">
            <div className="relative w-96 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search products by name or code..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
              />
            </div>
            <button 
              onClick={() => navigate('/admin/products/new')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-all btn-press shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Product
            </button>
          </section>

          <section className="bg-white rounded-lg border border-border overflow-hidden shadow-sm animate-in-smart" style={{ animationDelay: '100ms' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                    <th className="px-6 py-4 text-foreground">Product Information</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Material</th>
                    <th className="px-6 py-4">Unit Weight</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockProducts.map((product, index) => (
                    <tr 
                      key={product.code} 
                      className="hover:bg-accent/10 transition-colors group animate-in-smart cursor-pointer"
                      style={{ animationDelay: `${150 + (index * 0)}ms` }}
                      onClick={() => navigate(`/admin/products/${product.code}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 border border-border">
                            <Box className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight max-w-xs">{product.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-tighter">
                              {product.clientGroup} · {product.productType}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-mono uppercase tracking-tighter">
                              {product.code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-primary/60" />
                          <span className="text-xs font-medium text-foreground">{product.brand}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-muted-foreground">{product.material || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <Package className="w-3 h-3" />
                          {product.weight}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                          product.status === 'Active' ? "bg-success/10 text-success" : "bg-slate-100 text-slate-400"
                        )}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button className="p-1.5 hover:bg-accent rounded-md transition-colors btn-press">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
