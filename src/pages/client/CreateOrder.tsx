import { useState } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  Info,
  CheckCircle,
  Package
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { mockSalesPoints } from "@/lib/mockData";

export function CreateOrder() {
  const navigate = useNavigate();
  const [items, setItems] = useState([{ id: 1, product: '', quantity: 0 }]);
  const [selectedSalesPoint, setSelectedSalesPoint] = useState("WH020");
  const salesPoint = mockSalesPoints.find((entry) => entry.wcode === selectedSalesPoint) ?? mockSalesPoints[0];

  const addItem = () => {
    setItems([...items, { id: Date.now(), product: '', quantity: 0 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role="customer" />
      <div className="flex-1">
        <Header title="New Order Request" />
        
        <main className="p-8 max-w-4xl mx-auto space-y-8">
          {/* Header Actions */}
          <section className="flex items-center justify-between animate-in-smart">
            <Link to="/customer" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Discard and Return
            </Link>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="md:col-span-2 space-y-8">
              {/* Destination & Project Info */}
              <section className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-6 animate-in-smart" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-2 pb-4 border-b border-border">
                  <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center">
                    <Info className="w-3 h-3 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-widest text-[10px]">Project Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Customer PO Ref" placeholder="e.g. 123928098" required />
                  <FormInput label="Campaign Name" placeholder="e.g. Sunscreen Q2" required />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sales Point *</label>
                    <div className="relative group">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <select
                        value={selectedSalesPoint}
                        onChange={(event) => setSelectedSalesPoint(event.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                      >
                        {mockSalesPoints.map((entry) => (
                          <option key={`${entry.wcode}-${entry.salesPoint}`} value={entry.wcode}>
                            {entry.wcode} - {entry.salesPoint}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deadline *</label>
                    <div className="relative group">
                      <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="date" 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <FormInput label="Link FA (Optional)" placeholder="https://..." />
              </section>

              {/* Item Specification */}
              <section className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-6 animate-in-smart" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center">
                      <Package className="w-3 h-3 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-widest text-[10px]">Item Specification</h3>
                  </div>
                  <button 
                    onClick={addItem}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors btn-press"
                  >
                    <Plus className="w-3 h-3" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {items.map((item, index) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="grid grid-cols-12 gap-3 items-end overflow-hidden"
                      >
                        <div className="col-span-7 space-y-1.5">
                          {index === 0 && <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Product</label>}
                          <div className="relative group">
                            <input 
                              type="text" 
                              placeholder="Select product..." 
                              className="w-full px-3 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                            />
                          </div>
                        </div>
                        <div className="col-span-4 space-y-1.5">
                          {index === 0 && <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Quantity</label>}
                          <input 
                            type="number" 
                            placeholder="0" 
                            className="w-full px-3 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                          />
                        </div>
                        <div className="col-span-1 pb-1">
                          <button 
                            onClick={() => removeItem(item.id)}
                            className={cn(
                              "p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md transition-all btn-press",
                              items.length === 1 && "opacity-20 cursor-not-allowed pointer-events-none"
                            )}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
              <section className="bg-primary p-6 rounded-lg text-white shadow-xl shadow-primary/20 sticky top-24 animate-in-smart" style={{ animationDelay: '300ms' }}>
                <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Order Summary
                </h3>
                
                <div className="space-y-4 text-xs">
                  <div className="pb-4 border-b border-white/20 space-y-2">
                    <div className="flex justify-between opacity-80 italic">
                      <span>Total Items</span>
                      <span>{items.length} items</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Campaign</span>
                      <span className="truncate ml-4">Sunscreen Q2...</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Destination</p>
                    <p className="font-medium">{salesPoint.wcode} - {salesPoint.salesPoint}</p>
                  </div>

                  <button 
                    onClick={() => navigate('/customer')}
                    className="w-full py-3 bg-white text-primary rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all btn-press shadow-md shadow-black/10 mt-4"
                  >
                    Create Order Request
                  </button>
                  <p className="text-[10px] text-center opacity-70 italic">By clicking create, the order will be sent to the admin for review.</p>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function FormInput({ label, placeholder, required = false }: { label: string, placeholder: string, required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {label} {required && '*'}
      </label>
      <input 
        type="text" 
        placeholder={placeholder} 
        className="w-full px-3 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
      />
    </div>
  );
}
