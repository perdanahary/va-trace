import { useState } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockOrders } from "@/lib/mockData";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  History, 
  Plus, 
  Minus,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

export function VendorUpdateProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = mockOrders.find(o => o.id === id) || mockOrders[0];

  const [production, setProduction] = useState(200);
  const [ready, setReady] = useState(100);
  const [shipping, setShipping] = useState(100);

  const total = 750;

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role="vendor" />
      <div className="flex-1">
        <Header title={`Update Progress: ${order.id}`} />
        
        <main className="p-8 max-w-5xl mx-auto space-y-6">
          {/* Header Actions */}
          <section className="flex items-center justify-between animate-in-smart">
            <Link to="/vendor" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Discard Changes
            </Link>

            <button 
              onClick={() => navigate('/vendor')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-all shadow-md btn-press"
            >
              <Save className="w-3.5 h-3.5" />
              Save Progress
            </button>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Update Form */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-white rounded-lg border border-border shadow-sm overflow-hidden animate-in-smart" style={{ animationDelay: '100ms' }}>
                <div className="p-6 border-b border-border bg-accent/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold tracking-tight">{order.campaign}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">{order.id} · Total Quantity: {total}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="p-6 space-y-8">
                  <UpdateItem 
                    label="In Production" 
                    value={production} 
                    max={total} 
                    onChange={setProduction} 
                    color="text-primary"
                    bg="bg-primary/5"
                  />
                  <UpdateItem 
                    label="Ready to Ship" 
                    value={ready} 
                    max={production} 
                    onChange={setReady} 
                    color="text-processing"
                    bg="bg-processing/5"
                    helper="Must be ≤ In Production"
                  />
                  <UpdateItem 
                    label="On Delivery" 
                    value={shipping} 
                    max={ready} 
                    onChange={setShipping} 
                    color="text-processing"
                    bg="bg-processing/5"
                    helper="Must be ≤ Ready to Ship"
                  />
                </div>
              </section>

              {/* Conflict/Warning section if needed */}
              <section className="bg-warning/5 border border-warning/20 p-4 rounded-lg flex items-start gap-3 animate-in-smart" style={{ animationDelay: '200ms' }}>
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-warning uppercase tracking-widest">Update Policy</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Progress updates are sequential. You cannot mark items as "Ready to Ship" until they have been logged as "In Production".
                  </p>
                </div>
              </section>
            </div>

            {/* Live Summary Sidebar */}
            <div className="space-y-6">
              <section className="bg-white rounded-lg border border-border shadow-sm p-6 sticky top-24 animate-in-smart" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold tracking-tight">Fulfillment Summary</h3>
                </div>

                <div className="space-y-6">
                  <SummaryStat label="Production Rate" percentage={(production/total)*100} color="bg-primary" />
                  <SummaryStat label="Readiness" percentage={(ready/total)*100} color="bg-processing" />
                  <SummaryStat label="Delivery Completion" percentage={(shipping/total)*100} color="bg-success" />
                </div>

                <div className="mt-8 pt-6 border-t border-border flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-md">
                    <History className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">
                    Last updated <span className="font-bold text-foreground">2 hours ago</span> by <span className="font-bold text-foreground">Vendor Admin</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function UpdateItem({ label, value, max, onChange, color, bg, helper }: { label: string, value: number, max: number, onChange: (v: number) => void, color: string, bg: string, helper?: string }) {
  const increment = () => value < max && onChange(value + 1);
  const decrement = () => value > 0 && onChange(value - 1);

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/20 transition-all group">
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-foreground">{label}</h4>
        {helper && <p className="text-[10px] text-muted-foreground italic">{helper}</p>}
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total: {max}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center bg-accent/50 rounded-md p-1 border border-border shadow-inner">
          <button 
            onClick={decrement}
            className="p-1.5 hover:bg-white rounded shadow-sm text-muted-foreground hover:text-destructive transition-all btn-press"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input 
            type="number" 
            value={value}
            onChange={(e) => onChange(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-16 bg-transparent text-center text-sm font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button 
            onClick={increment}
            className="p-1.5 hover:bg-white rounded shadow-sm text-muted-foreground hover:text-primary transition-all btn-press"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-md", bg, color)}>
          {Math.round((value/max)*100)}%
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, percentage, color }: { label: string, percentage: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-border/50">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000 ease-out-expo", color)}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
