import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Package, Printer, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { mockOrders } from "@/lib/mockData";
import { generatePackagingLabels, type PackagingLabel } from "@/lib/deliveryNote";

interface PackagingLabelsPrintProps {
  role?: UserRole;
}

export function PackagingLabelsPrint({ role = "admin" }: PackagingLabelsPrintProps) {
  const { id } = useParams();
  const order = mockOrders.find((entry) => entry.id === id) ?? mockOrders[0];
  const labelsDocument = generatePackagingLabels(order);
  const backPath = role === "admin" ? `/admin/orders/${order.id}` : `/${role}/orders/${order.id}`;

  return (
    <div className="flex min-h-screen bg-canvas-white packaging-label-shell">
      <div className="packaging-label-chrome">
        <Sidebar role={role} />
      </div>
      <div className="flex-1">
        <div className="packaging-label-chrome">
          <Header title={`Packaging Labels: ${labelsDocument.doNumber}`} />
        </div>

        <main className="p-8 space-y-5 packaging-label-main">
          <section className="packaging-label-chrome mx-auto flex max-w-[1080px] items-center justify-between">
            <Link to={backPath} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Order
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-primary/90 btn-press"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Packaging Labels
            </button>
          </section>

          {labelsDocument.missingRequiredFields.length > 0 && (
            <section className="packaging-label-chrome mx-auto max-w-[1080px] rounded-lg border border-warning/30 bg-warning/10 p-4 text-xs text-foreground">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="font-bold">Missing data before print</p>
                  <p className="mt-1 text-muted-foreground">
                    Complete: {labelsDocument.missingRequiredFields.join(", ")}.
                  </p>
                </div>
              </div>
            </section>
          )}

          {labelsDocument.labels.length === 0 ? (
            <section className="packaging-label-chrome mx-auto max-w-[1080px] rounded-2xl border border-dashed border-border bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-muted-foreground">
                <Package className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground">No delivered items available for labeling</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Packaging labels are created only for lines with delivered quantity greater than zero.
              </p>
            </section>
          ) : (
            <article className="packaging-label-sheet mx-auto max-w-[1080px]">
              {labelsDocument.labels.map((label) => (
                <PackagingLabelCard key={label.id} label={label} />
              ))}
            </article>
          )}
        </main>
      </div>
    </div>
  );
}

function PackagingLabelCard({ label }: { label: PackagingLabel }) {
  return (
    <section className="packaging-label-card bg-white text-black shadow-xl" data-label-code={label.labelCode}>
      <div className="packaging-label-card__top">
        <div>
          <p className="packaging-label-kicker">Packaging Label</p>
          <h1 className="packaging-label-order">{label.orderId}</h1>
          <p className="packaging-label-program">{label.programName}</p>
        </div>
        <div className="packaging-label-code-block">
          <p className="packaging-label-kicker">Label Code</p>
          <p className="packaging-label-code">{label.labelCode}</p>
          <VisualBarcode value={label.labelCode} />
        </div>
      </div>

      <div className="packaging-label-card__body">
        <div className="packaging-label-qr" aria-label={`QR code for ${label.labelCode}`} data-qr-payload={label.qrPayload}>
          <QRCodeSVG value={label.qrPayload} size={88} level="M" includeMargin={true} bgColor="#ffffff" fgColor="#111111" />
        </div>

        <div className="packaging-label-fields">
          <Field label="DO Number" value={label.doNumber} />
          <Field label="PO Line" value={label.poLineNumber} />
          <Field label="Product Code" value={label.productCode} mono />
          <Field label="Product Name" value={label.productName} />
          <Field label="Delivered Qty" value={`${label.deliveredQty} ${label.uom}`} />
          <Field label="Destination" value={`${label.destinationCompanyName} / ${label.destinationLocationName}`} />
          <Field label="Sales Point" value={label.salesPointCode} />
          <Field label="Address" value={label.destinationAddress} />
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="packaging-label-field">
      <span>{label}</span>
      <p className={mono ? "font-mono" : undefined}>{value}</p>
    </div>
  );
}

function VisualBarcode({ value }: { value: string }) {
  return (
    <div className="packaging-label-barcode" aria-label={`Barcode ${value}`}>
      {Array.from(value).map((character, index) => (
        <span
          key={`${character}-${index}`}
          style={{ width: `${(character.charCodeAt(0) % 4) + 1}px` }}
        />
      ))}
    </div>
  );
}
