import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { mockBrands } from "@/lib/mockData";
import { mockProducts, type ProductRecord } from "@/lib/productMaster";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  Tag,
  Box,
  Package,
  Layers,
  Maximize,
  Weight,
  ClipboardList,
  Building2,
  Hash,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductDetail() {
  const { code } = useParams();
  const navigate = useNavigate();
  const isNew = code === "new";
  const [isEditing, setIsEditing] = useState(isNew);

  const initialProduct: ProductRecord = isNew
    ? {
        code: "",
        name: "",
        sourceName: "",
        clientGroup: "",
        productType: "",
        orientation: "",
        dimensions: "",
        material: "",
        brand: "",
        brandCode: "",
        weight: "",
        uom: "qty",
        status: "Active",
        formatType: "",
        inkTechnology: "",
        lengthCm: "",
        widthCm: "",
        referenceUrl: "",
      }
    : mockProducts.find((product) => product.code === code) || mockProducts[0];

  const [product, setProduct] = useState<ProductRecord>(initialProduct);

  const handleToggleEdit = () => setIsEditing(!isEditing);

  const handleSave = () => {
    setIsEditing(false);
    console.log("Saving product:", product);
    if (isNew) {
      navigate("/admin/products");
    }
  };

  const handleCancel = () => {
    if (isNew) {
      navigate("/admin/products");
    } else {
      setProduct(initialProduct);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this product?")) {
      console.log("Deleting product:", product.code);
      navigate("/admin/products");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex min-h-screen bg-canvas-white font-sans">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title={isNew ? "Add New Product" : `Product Details: ${product.code}`} />

        <main className="p-8 max-w-5xl mx-auto space-y-6">
          <section className="flex items-center justify-between animate-in-smart">
            <Link to="/admin/products" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Catalog
            </Link>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-destructive text-destructive rounded-md text-xs font-bold hover:bg-destructive/10 transition-all btn-press"
                  >
                    <X className="w-3.5 h-3.5" />
                    Delete
                  </button>
                  <button
                    onClick={handleToggleEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-all btn-press shadow-md"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Product
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-md text-xs font-bold hover:bg-accent transition-all btn-press"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-all btn-press shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isNew ? "Create Product" : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="bg-white rounded-lg border border-border shadow-sm p-6 animate-in-smart" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-border shrink-0">
                  <Box className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-3">
                  {isEditing ? (
                    <EditableField
                      label="Product Name"
                      name="name"
                      value={product.name}
                      icon={ClipboardList}
                      isEditing={isEditing}
                      onChange={handleChange}
                      placeholder="Enter product name..."
                    />
                  ) : (
                    <h1 className="text-lg font-bold leading-tight">{product.name}</h1>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {isEditing ? (
                      <EditableField
                        label="Item Code"
                        name="code"
                        value={product.code}
                        icon={Hash}
                        isEditing={isEditing}
                        onChange={handleChange}
                        placeholder="e.g. 2026-0000-0000"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{product.code}</p>
                    )}
                    <div className="flex items-center justify-start md:justify-end">
                      {isEditing ? (
                        <SelectField
                          label="Status"
                          name="status"
                          value={product.status}
                          icon={Warehouse}
                          isEditing={isEditing}
                          onChange={handleChange}
                          options={["Active", "Inactive"]}
                        />
                      ) : (
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                          product.status === "Active" ? "bg-success/10 text-success" : "bg-slate-100 text-slate-400"
                        )}>
                          {product.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-lg border border-border shadow-sm overflow-hidden animate-in-smart" style={{ animationDelay: "200ms" }}>
              <div className="p-4 border-b border-border bg-accent/5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  Classification
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <EditableField
                  label="Client Group"
                  name="clientGroup"
                  value={product.clientGroup}
                  icon={Building2}
                  isEditing={isEditing}
                  onChange={handleChange}
                />
                <EditableField
                  label="Product Type"
                  name="productType"
                  value={product.productType}
                  icon={Tag}
                  isEditing={isEditing}
                  onChange={handleChange}
                />
                <SelectField
                  label="Orientation"
                  name="orientation"
                  value={product.orientation || "-"}
                  icon={Layers}
                  isEditing={isEditing}
                  onChange={handleChange}
                  options={["-", "H", "V"]}
                />
                <SelectField
                  label="Brand"
                  name="brand"
                  value={product.brand || "-"}
                  icon={Tag}
                  isEditing={isEditing}
                  onChange={handleChange}
                  options={["-", ...mockBrands.map((brand) => brand.name)]}
                />
                <SelectField
                  label="Brand Code"
                  name="brandCode"
                  value={product.brandCode || "-"}
                  icon={Hash}
                  isEditing={isEditing}
                  onChange={handleChange}
                  options={["-", ...mockBrands.map((brand) => brand.alias)]}
                />
              </div>
            </section>

            <section className="bg-white rounded-lg border border-border shadow-sm overflow-hidden animate-in-smart" style={{ animationDelay: "300ms" }}>
              <div className="p-4 border-b border-border bg-accent/5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  Technical Details
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <EditableField
                  label="Dimensions"
                  name="dimensions"
                  value={product.dimensions}
                  icon={Maximize}
                  isEditing={isEditing}
                  onChange={handleChange}
                />
                <EditableField
                  label="Material"
                  name="material"
                  value={product.material}
                  icon={Package}
                  isEditing={isEditing}
                  onChange={handleChange}
                />
                <EditableField
                  label="Weight"
                  name="weight"
                  value={product.weight}
                  icon={Weight}
                  isEditing={isEditing}
                  onChange={handleChange}
                />
                <EditableField
                  label="UOM"
                  name="uom"
                  value={product.uom}
                  icon={ClipboardList}
                  isEditing={isEditing}
                  onChange={handleChange}
                />
                <EditableField
                  label="Format Type"
                  name="formatType"
                  value={product.formatType || "-"}
                  icon={ClipboardList}
                  isEditing={isEditing}
                  onChange={handleChange}
                />
                <EditableField
                  label="Ink Technology"
                  name="inkTechnology"
                  value={product.inkTechnology || "-"}
                  icon={ClipboardList}
                  isEditing={isEditing}
                  onChange={handleChange}
                />
              </div>
            </section>
          </div>

          <section className="bg-white rounded-lg border border-border shadow-sm overflow-hidden animate-in-smart" style={{ animationDelay: "400ms" }}>
            <div className="p-4 border-b border-border bg-accent/5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                Seed Trace
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <InfoCard label="Source Name" value={product.sourceName || "-"} />
              <InfoCard label="Length" value={product.lengthCm || "-"} />
              <InfoCard label="Width" value={product.widthCm || "-"} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function EditableField({
  label,
  name,
  value,
  icon: Icon,
  isEditing,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  icon: any;
  isEditing: boolean;
  onChange: (e: any) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <label className="text-[10px] font-bold uppercase tracking-wider">{label}</label>
      </div>
      {isEditing ? (
        <input
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-slate-50 border border-border rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      ) : (
        <p className="text-xs font-medium pl-5">{value || "-"}</p>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  icon: Icon,
  isEditing,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  icon: any;
  isEditing: boolean;
  onChange: (e: any) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <label className="text-[10px] font-bold uppercase tracking-wider">{label}</label>
      </div>
      {isEditing ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full bg-slate-50 border border-border rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-xs font-medium pl-5">{value || "-"}</p>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5 rounded-md border border-border p-4 bg-accent/5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-medium break-words">{value}</p>
    </div>
  );
}
