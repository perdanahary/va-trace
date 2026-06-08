import { useParams } from "react-router-dom";
import { AlertTriangle, Package, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { generatePackagingLabels, type PackagingLabel } from "@/lib/deliveryNote";
import { useOrders } from "@/lib/orderStore";

interface PackagingLabelsPrintProps {
  role?: UserRole;
}

export function PackagingLabelsPrint({ role = "admin" }: PackagingLabelsPrintProps) {
  const { id } = useParams();
  const orders = useOrders();
  const order = orders.find((entry) => entry.id === id) ?? orders[0];
  const labelsDocument = generatePackagingLabels(order);
  const backPath = role === "admin" ? `/admin/orders/${order.id}` : `/${role}/orders/${order.id}`;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header
          title={`Packaging Labels: ${labelsDocument.doNumber}`}
          breadcrumbs={[
            { label: "All Orders", to: role === "admin" ? "/admin/orders" : `/${role}/orders` },
            { label: order.id, to: backPath },
            { label: `Packaging Labels: ${labelsDocument.doNumber}` },
          ]}
          actions={
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Packaging Labels
            </Button>
          }
        />

        <main className="space-y-5 p-4 sm:p-6 lg:p-8">
          {labelsDocument.missingRequiredFields.length > 0 ? (
            <Alert className="mx-auto max-w-[1080px] border-warning/30 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertTitle>Missing data before print</AlertTitle>
              <AlertDescription>Complete: {labelsDocument.missingRequiredFields.join(", ")}.</AlertDescription>
            </Alert>
          ) : null}

          {labelsDocument.labels.length === 0 ? (
            <div className="mx-auto max-w-[1080px] rounded-lg border border-dashed border-border bg-background p-8 text-center shadow-sm">
              <div className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Package className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">No delivered items available for labeling</h2>
                <p className="text-sm text-muted-foreground">
                  Packaging labels are created only for lines with delivered quantity greater than zero.
                </p>
              </div>
            </div>
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
        <span key={`${character}-${index}`} style={{ width: `${(character.charCodeAt(0) % 4) + 1}px` }} />
      ))}
    </div>
  );
}
