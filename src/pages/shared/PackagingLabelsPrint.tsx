import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Button } from "@/components/ui/button";
import { useHydratedOrder } from "@/lib/v2/selectors/viewModels";
import { useLabelState } from "@/lib/v2/labelStore";
import type { ShippingLabel, ShipmentBatch } from "@/lib/types/v2/shipment";

interface PackagingLabelsPrintProps {
  userRole?: UserRole;
}

/**
 * Bridge type matching the legacy PackagingLabel shape expected by the
 * print template card.  Built from V2 ShippingLabel + ShipmentBatch data.
 */
interface PrintLabel {
  id: string;
  labelCode: string;
  qrPayload: string;
  orderId: string;
  doNumber: string;
  poLineNumber: string;
  productCode: string;
  productName: string;
  deliveredQty: number;
  uom: string;
  destinationCompanyName: string;
  destinationLocationName: string;
  destinationAddress: string;
  salesPointCode: string;
  projectName: string;
}

function toPrintLabel(
  label: ShippingLabel,
  orderRequestNumber: string,
  batches: ShipmentBatch[],
): PrintLabel {
  const batch = batches.find((b) => b.id === label.shipmentBatchId);
  const destination = batch?.destinationSnapshots.find(
    (d) => d.salesPointId === label.salesPointId,
  );

  return {
    id: label.id,
    labelCode: label.labelNumber,
    qrPayload: JSON.stringify(label.qrPayload),
    orderId: orderRequestNumber,
    doNumber: batch?.deliveryNoteNumber ?? "",
    poLineNumber: "",
    productCode: label.productCode,
    productName: label.productName,
    deliveredQty: label.quantity,
    uom: label.unitOfMeasure,
    destinationCompanyName: destination?.companyName ?? label.destinationName,
    destinationLocationName: destination?.salesPointName ?? label.destinationName,
    destinationAddress: label.destinationAddress,
    salesPointCode: destination?.salesPointCode ?? label.salesPointId,
    projectName: label.projectName,
  };
}

export function PackagingLabelsPrint({ userRole = "admin" }: PackagingLabelsPrintProps) {
  const { id } = useParams();
  const hydrated = useHydratedOrder(id);
  const { labels: allLabels } = useLabelState();

  const shipmentBatchIds = hydrated?.shipmentBatches.map((b) => b.id) ?? [];
  const v2Labels = allLabels.filter((l) => shipmentBatchIds.includes(l.shipmentBatchId));
  const printLabels = hydrated
    ? v2Labels.map((l) => toPrintLabel(l, hydrated.order.orderRequestNumber, hydrated.shipmentBatches))
    : [];

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (printLabels.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="font-semibold">No Packaging Labels</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Labels are generated when the order is ready to ship.
          </p>
        </div>
      </div>
    );
  }

  const backPath = userRole === "admin"
    ? `/admin/orders/${hydrated.order.id}`
    : `/${userRole}/orders/${hydrated.order.id}`;

  const docDoNumber = printLabels[0].doNumber || hydrated.order.orderRequestNumber;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header
          title={`Packaging Labels: ${docDoNumber}`}
          breadcrumbs={[
            { label: "All Orders", to: userRole === "admin" ? "/admin/orders" : `/${userRole}/orders` },
            { label: hydrated.order.orderRequestNumber, to: backPath },
            { label: `Packaging Labels: ${docDoNumber}` },
          ]}
          actions={
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Packaging Labels
            </Button>
          }
        />

        <main className="space-y-5 p-4 sm:p-6 lg:p-8">
          <article className="packaging-label-sheet mx-auto max-w-[1080px]">
            {printLabels.map((label) => (
              <PackagingLabelCard key={label.id} label={label} />
            ))}
          </article>
        </main>
      </ContentArea>
    </div>
  );
}

function PackagingLabelCard({ label }: { label: PrintLabel }) {
  return (
    <section className="packaging-label-card bg-white text-black shadow-xl" data-label-code={label.labelCode}>
      <div className="packaging-label-card__top">
        <div>
          <p className="packaging-label-kicker">Packaging Label</p>
          <h1 className="packaging-label-order">{label.orderId}</h1>
          <p className="packaging-label-project">{label.projectName}</p>
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
