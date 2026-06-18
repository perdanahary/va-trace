import { useParams } from "react-router-dom";
import { AlertTriangle, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHydratedOrder } from "@/lib/v2/selectors/viewModels";
import { getSalesPointById } from "@/lib/v2/salesPointStore";
import { resolveVendorDeliveryAddress } from "@/lib/v2/selectors/deliveryAddress";
import type { DeliveryNote as V2DeliveryNote, DeliveryNoteItem } from "@/lib/types/v2/deliveryNote";

interface DeliveryNotePrintProps {
  userRole?: UserRole;
}

interface DeliveryNotePrintLine {
  id: string;
  poLineNumber: string;
  materialCode: string;
  description: string;
  orderedQty: number;
  deliveredQty: number;
  outstandingQty: number;
  uom: string;
  orderedAreaText?: string;
  deliveredAreaText?: string;
  outstandingAreaText?: string;
}

export function DeliveryNotePrint({ userRole = "admin" }: DeliveryNotePrintProps) {
  const { id } = useParams();
  const hydrated = useHydratedOrder(id);
  const v2DeliveryNote: V2DeliveryNote | undefined = hydrated?.deliveryNotes[0];
  const deliveryAddress = hydrated ? resolveVendorDeliveryAddress(hydrated, getSalesPointById) : null;

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }
  if (!v2DeliveryNote) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="font-semibold">Delivery Note Not Available</p>
          <p className="mt-2 text-sm text-muted-foreground">A delivery note is generated when the first shipment batch is dispatched.</p>
        </div>
      </div>
    );
  }

  const order = hydrated.order;
  const printLines = v2DeliveryNote.items.map((item: DeliveryNoteItem) => ({
    id: item.id,
    poLineNumber: String(item.poLineNumber),
    materialCode: item.materialCode,
    description: item.description,
    orderedQty: item.orderedQuantity,
    deliveredQty: item.shippedQuantity,
    outstandingQty: item.outstandingQuantityAfterShipment,
    uom: item.unitOfMeasure,
  }));

  const signatureFields = v2DeliveryNote.signatureFields;

  const missingRequiredFields: string[] = [];
  if (!v2DeliveryNote.clientPoNumber) missingRequiredFields.push("PO Number");
  if (!v2DeliveryNote.salesOrderNumber) missingRequiredFields.push("SO Number");
  if (!deliveryAddress?.address) missingRequiredFields.push("Delivery Address");
  if (v2DeliveryNote.items.length === 0) missingRequiredFields.push("Line Items");

  const backPath = userRole === "admin" ? `/admin/orders/${order.id}` : `/${userRole}/orders/${order.id}`;
  const qrTarget = `${window.location.origin}${userRole === "admin" ? `/admin/orders/${order.id}/delivery-note` : `/${userRole}/orders/${order.id}/delivery-note`}`;
  const hhGlobalContacts = v2DeliveryNote.destinationSnapshots[0]?.contacts ?? [];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header
          title={`Delivery Note: ${v2DeliveryNote.deliveryNoteNumber}`}
          breadcrumbs={[
            { label: "All Orders", to: userRole === "admin" ? "/admin/orders" : `/${userRole}/orders` },
            { label: order.id, to: backPath },
            { label: `Delivery Note: ${v2DeliveryNote.deliveryNoteNumber}` },
          ]}
          actions={
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Delivery Note
            </Button>
          }
        />

        <main className="space-y-5 p-4 sm:p-6 lg:p-8">
          {missingRequiredFields.length > 0 ? (
            <Alert className="mx-auto max-w-[980px] border-warning/30 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertTitle>Missing data before print</AlertTitle>
              <AlertDescription>Complete: {missingRequiredFields.join(", ")}.</AlertDescription>
            </Alert>
          ) : null}

          <article className="delivery-note-page mx-auto bg-white text-black shadow-xl">
            <header className="delivery-note-header">
              <div className="space-y-3">
                <QrCode value={qrTarget} />
                <div className="text-[30px] font-black tracking-tighter text-neutral-800">
                  hh<span className="font-semibold">global</span>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-[18px] font-bold">Delivery Note</h1>
              </div>

              <div className="space-y-2 text-right">
                <p className="text-[17px] font-bold">DO Number : {v2DeliveryNote.deliveryNoteNumber}</p>
                <Barcode value={v2DeliveryNote.deliveryNoteNumber} />
              </div>
            </header>

            <section className="delivery-note-contact-row">
              <div className="delivery-note-sender">
                <h2>Sender</h2>
                <p className="font-bold">{v2DeliveryNote.vendor.name}</p>
                <p>{v2DeliveryNote.vendor.phone ?? ""}</p>
              </div>

              <div className="delivery-note-recipient">
                <KeyValue label="HH Global PIC" value={hhGlobalContacts.map((contact) => `${contact.name}(${contact.role})`).join(" / ")} />
                <KeyValue label="Email & Phone" value={hhGlobalContacts.map((contact) => `${contact.email ?? ""}/${contact.phone ?? ""}`).join("\n")} />
                <div className="h-4" />
                <KeyValue label="Deliver to" value={deliveryAddress?.companyName ?? v2DeliveryNote.destinationSnapshots[0]?.salesPointName ?? ""} />
                <KeyValue label="Company" value={deliveryAddress?.salesPointName ?? v2DeliveryNote.destinationSnapshots[0]?.salesPointName ?? ""} />
                <KeyValue label="PIC Client" value={deliveryAddress?.picName ?? ""} />
                <KeyValue label="Address" value={deliveryAddress?.address ?? v2DeliveryNote.destinationSnapshots[0]?.address ?? ""} />
                <KeyValue label="Phone No." value={deliveryAddress?.phone ?? ""} />
                <KeyValue label="SO Number" value={v2DeliveryNote.salesOrderNumber ?? ""} />
              </div>
            </section>

            <section className="delivery-note-project">
              <KeyValue label="PO No" value={v2DeliveryNote.clientPoNumber ?? ""} />
              <KeyValue label="Project" value={v2DeliveryNote.projectName} />
              {v2DeliveryNote.picName ? (
                <KeyValue label="PIC" value={`${v2DeliveryNote.picName}${v2DeliveryNote.picEmail ? ` (${v2DeliveryNote.picEmail})` : ""}`} />
              ) : null}
            </section>

            <table className="delivery-note-table">
              <thead>
                <tr>
                  <th>PO LINE #</th>
                  <th>Material Code</th>
                  <th>Description</th>
                  <th>Ordered</th>
                  <th>Delivered</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {printLines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.poLineNumber}</td>
                    <td className="font-bold">
                      {formatMaterialCode(line.materialCode)}
                    </td>
                    <td className="text-left">{line.description}</td>
                    <QuantityCell line={line} type="ordered" />
                    <QuantityCell line={line} type="delivered" />
                    <QuantityCell line={line} type="outstanding" />
                  </tr>
                ))}
              </tbody>
            </table>

            <section className="delivery-note-note">
              <span>Note : </span>
              {v2DeliveryNote.notes ?? ""}
            </section>

            <section className="delivery-note-signatures">
              <SignatureColumn title="Delivered by," />
              <SignatureColumn title="Received by," />
            </section>

            <footer className="delivery-note-footer">
              <p className="font-bold">Untuk diperhatikan:</p>
              <p>* Complain kekurangan barang dapat kami terima dalam 2 minggu/10 hari kerja dari tanggal penerimaan barang di gudang.</p>
              <p>* Nama lengkap, tanggal, dan stempel wajib dicantumkan pada saat Delivery Note ini di tanda tangani.</p>
            </footer>
          </article>
        </main>
      </ContentArea>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="delivery-note-key-value">
      <span>{label}</span>
      <strong>:</strong>
      <p>{value}</p>
    </div>
  );
}

function QuantityCell({ line, type }: { line: DeliveryNotePrintLine; type: "ordered" | "delivered" | "outstanding" }) {
  const quantity = type === "ordered" ? line.orderedQty : type === "delivered" ? line.deliveredQty : line.outstandingQty;
  const areaText = type === "ordered" ? line.orderedAreaText : type === "delivered" ? line.deliveredAreaText : line.outstandingAreaText;

  return (
    <td>
      <p>
        {quantity}
        {line.uom}
      </p>
      {areaText ? <p>({areaText})</p> : null}
    </td>
  );
}

function SignatureColumn({ title }: { title: string }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <div className="delivery-note-signature-line">
        <span>Date</span>
        <b>:</b>
      </div>
      <div className="delivery-note-signature-space" />
      <div className="delivery-note-signature-line">
        <span>Signature & Stamp</span>
        <b>:</b>
      </div>
      <div className="delivery-note-signature-line">
        <span>Name</span>
        <b>:</b>
      </div>
    </div>
  );
}

function QrCode({ value }: { value: string }) {
  return (
    <div className="delivery-note-qr" aria-label={`QR code linking to ${value}`} data-qr-target={value}>
      <QRCodeSVG value={value} size={88} level="M" includeMargin={true} bgColor="#ffffff" fgColor="#111111" />
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  return (
    <div className="delivery-note-barcode" aria-label={`Barcode ${value}`}>
      {Array.from(value).map((character, index) => (
        <span key={`${character}-${index}`} style={{ width: `${(character.charCodeAt(0) % 4) + 1}px` }} />
      ))}
    </div>
  );
}

function formatMaterialCode(value: string) {
  const splitIndex = value.lastIndexOf("-");

  if (splitIndex <= 0) {
    return value;
  }

  return `${value.slice(0, splitIndex)}-\n${value.slice(splitIndex + 1)}`;
}
