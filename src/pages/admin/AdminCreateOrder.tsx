import { useState, type HTMLInputTypeAttribute } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar, UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { mockSalesPoints } from "@/lib/mockData";
import { mockProducts } from "@/lib/productMaster";
import { getSalesPointDeliveryProfile } from "@/lib/deliveryNote";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  Info,
  CheckCircle,
  Package,
  UserCheck,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupplierStore } from "@/lib/supplierStore";

interface AdminCreateOrderProps {
  role?: UserRole;
}

export function AdminCreateOrder({ role = 'admin' }: AdminCreateOrderProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState([{ id: 1, product: '', quantity: 0 }]);
  const [clientPO, setClientPO] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [soNumber, setSoNumber] = useState('');
  const [picProgramName, setPicProgramName] = useState('');
  const [picProgramEmail, setPicProgramEmail] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedSalesPoint, setSelectedSalesPoint] = useState('WH020');
  const [deadlinePreset, setDeadlinePreset] = useState('7-days');
  const [customDeadline, setCustomDeadline] = useState('');
  const { suppliers } = useSupplierStore();
  const salesPoint = mockSalesPoints.find((entry) => entry.wcode === selectedSalesPoint) ?? mockSalesPoints[0];
  const deliveryProfile = getSalesPointDeliveryProfile(selectedSalesPoint);
  const selectedSupplierName = selectedSupplier ? suppliers.find((supplier) => supplier.id === selectedSupplier)?.name ?? 'Not Selected' : 'Not Selected';
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);

  const addItem = () => {
    setItems([...items, { id: Date.now(), product: '', quantity: 0 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: 'product' | 'quantity', value: string | number) => {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          [field]: field === 'quantity' ? Number(value) || 0 : value,
        };
      }),
    );
  };

  const returnPath = role === 'admin' ? '/admin/orders' : `/${role}/orders`;
  const submitPath = role === 'admin' ? '/admin/orders' : `/${role}/orders`;

  return (
    <div className="flex min-h-screen bg-canvas-white font-sans">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title={`Create Order Request (${role.charAt(0).toUpperCase() + role.slice(1)})`} />
        
        <main className="p-8 max-w-5xl mx-auto space-y-8">
          <section className="flex items-center justify-between animate-in-smart">
            <Link to={returnPath} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Discard and Return
            </Link>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Project & Assignment Info */}
              <section className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-6 animate-in-smart" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-2 pb-4 border-b border-border">
                  <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center">
                    <Info className="w-3 h-3 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-widest text-[10px]">Project & Supplier Info</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Customer PO Ref" placeholder="e.g. 123928098" required value={clientPO} onChange={setClientPO} />
                  <FormInput label="Campaign Name" placeholder="e.g. Sunscreen Q2" required value={campaignName} onChange={setCampaignName} />
                  <FormInput label="SO Number" placeholder="e.g. SO123928" required value={soNumber} onChange={setSoNumber} />
                  <FormInput label="PIC Program Name" placeholder="e.g. Chandra Sadikin" required value={picProgramName} onChange={setPicProgramName} />
                  <FormInput
                    label="PIC Program Email"
                    placeholder="e.g. chandra.sadikin@sampoerna.com"
                    required
                    type="email"
                    value={picProgramEmail}
                    onChange={setPicProgramEmail}
                  />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sales Point *</label>
                    <div className="relative group">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <select
                        className="w-full pl-9 pr-8 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm appearance-none"
                        value={selectedSalesPoint}
                        onChange={(e) => setSelectedSalesPoint(e.target.value)}
                      >
                        {mockSalesPoints.map((entry) => (
                          <option key={`${entry.wcode}-${entry.salesPoint}`} value={entry.wcode}>
                            {entry.wcode} - {entry.salesPoint}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  
                  {/* Supplier Assignment - Admin Exclusive */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assign Supplier *</label>
                    <div className="relative group">
                      <UserCheck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <select 
                        className="w-full pl-9 pr-8 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm appearance-none"
                        value={selectedSupplier}
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                      >
                        <option value="">Select a supplier...</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deadline *</label>
                    <div className="space-y-2">
                      <div className="relative group">
                        <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <select
                          className="w-full pl-9 pr-8 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm appearance-none"
                          value={deadlinePreset}
                          onChange={(e) => setDeadlinePreset(e.target.value)}
                        >
                          <option value="3-days">Due in 3 days</option>
                          <option value="7-days">Due in 1 week</option>
                          <option value="14-days">Due in 2 weeks</option>
                          <option value="30-days">Due in 1 month</option>
                          <option value="custom">Pick exact date</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>

                      {deadlinePreset === 'custom' && (
                        <div className="relative group">
                          <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="date"
                            value={customDeadline}
                            onChange={(e) => setCustomDeadline(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                          />
                        </div>
                      )}

                      <p className="text-[10px] leading-relaxed text-muted-foreground">
                        Most order requests are short-horizon. Choose a relative due time first; use an exact date only when the year matters.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-6 animate-in-smart" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center gap-2 pb-4 border-b border-border">
                  <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-widest text-[10px]">Delivery Note Alignment</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AlignmentPreviewItem label="Program" value={campaignName || 'Campaign name will map here'} note="Maps from Campaign Name" />
                  <AlignmentPreviewItem label="SO Number" value={soNumber || 'SO number is required for delivery note'} note="Shown on order detail and print" />
                  <AlignmentPreviewItem
                    label="PIC Program"
                    value={picProgramName || picProgramEmail ? `${picProgramName}${picProgramEmail ? `(${picProgramEmail})` : ''}` : 'PIC program name and email will map here'}
                    note="Built from PIC Program Name + Email"
                  />
                  <AlignmentPreviewItem label="Deliver To" value={deliveryProfile.deliveryCompanyName} note={deliveryProfile.deliveryLocationName} />
                  <AlignmentPreviewItem label="Address" value={deliveryProfile.address} note={deliveryProfile.phone || 'No phone mapped'} />
                  <AlignmentPreviewItem label="PIC Client" value={deliveryProfile.picClient || 'Client PIC not mapped'} note={deliveryProfile.wcode} />
                </div>
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
                  <button onClick={addItem} className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors btn-press">
                    <Plus className="w-3 h-3" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {items.map((item, index) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-12 gap-3 items-end overflow-hidden mb-4"
                      >
                        <div className="col-span-7 space-y-1.5">
                          {index === 0 && <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Product</label>}
                          <select
                            className="w-full px-3 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                            value={item.product}
                            onChange={(event) => updateItem(item.id, 'product', event.target.value)}
                          >
                            <option value="">Select product...</option>
                            {mockProducts.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4 space-y-1.5">
                          {index === 0 && <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Quantity</label>}
                          <input
                            type="number"
                            placeholder="0"
                            value={item.quantity || ''}
                            onChange={(event) => updateItem(item.id, 'quantity', event.target.value)}
                            className="w-full px-3 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                          />
                        </div>
                        <div className="col-span-1 pb-1">
                          <button onClick={() => removeItem(item.id)} className={cn("p-2 text-muted-foreground hover:text-destructive rounded-md transition-all btn-press", items.length === 1 && "opacity-20 cursor-not-allowed")}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="bg-primary p-6 rounded-lg text-white shadow-xl shadow-primary/20 sticky top-24 animate-in-smart" style={{ animationDelay: '300ms' }}>
                <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Review & Assign
                </h3>
                <div className="space-y-4 text-xs">
                  <div className="pb-4 border-b border-white/20 space-y-2 text-[11px]">
                    <div className="flex justify-between opacity-80 italic">
                      <span>Assigned Supplier</span>
                      <span className="font-bold">{selectedSupplierName}</span>
                    </div>
                    <div className="flex justify-between opacity-80 italic">
                      <span>Sales Point</span>
                      <span className="font-bold">{salesPoint.wcode} - {salesPoint.salesPoint}</span>
                    </div>
                    <div className="flex justify-between opacity-80 italic gap-4">
                      <span>SO Number</span>
                      <span className="font-bold text-right">{soNumber || 'Missing'}</span>
                    </div>
                    <div className="flex justify-between opacity-80 italic gap-4">
                      <span>PIC Program</span>
                      <span className="font-bold text-right">{picProgramName || 'Missing'}</span>
                    </div>
                    <div className="flex justify-between opacity-80 italic gap-4">
                      <span>Total Qty</span>
                      <span className="font-bold text-right">{totalQuantity} qty</span>
                    </div>
                    <div className="flex justify-between opacity-80 italic">
                      <span>Deadline</span>
                      <span className="font-bold">
                        {deadlinePreset === 'custom'
                          ? (customDeadline || 'Exact date')
                          : deadlineOptions.find(option => option.value === deadlinePreset)?.label}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md border border-white/20 bg-white/10 p-3 text-[11px] leading-relaxed">
                    <p className="font-bold uppercase tracking-widest text-[10px] mb-2">Delivery Note Snapshot</p>
                    <p>{deliveryProfile.deliveryCompanyName}</p>
                    <p>{deliveryProfile.deliveryLocationName}</p>
                    <p>{deliveryProfile.address}</p>
                  </div>
                  <button onClick={() => navigate(submitPath)} className="w-full py-3 bg-white text-primary rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all btn-press shadow-md shadow-black/10">
                    Approve & Send to Vendor
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const deadlineOptions = [
  { value: '3-days', label: 'Due in 3 days' },
  { value: '7-days', label: 'Due in 1 week' },
  { value: '14-days', label: 'Due in 2 weeks' },
  { value: '30-days', label: 'Due in 1 month' },
];

function FormInput({
  label,
  placeholder,
  required = false,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  required?: boolean;
  type?: HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {label} {required && '*'}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
      />
    </div>
  );
}

function AlignmentPreviewItem({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-accent/5 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-xs font-bold text-foreground break-words">{value}</p>
      {note && <p className="mt-1 text-[10px] text-muted-foreground break-words">{note}</p>}
    </div>
  );
}
