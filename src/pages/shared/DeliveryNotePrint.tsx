import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { generateDeliveryNote, type DeliveryNoteLine } from "@/lib/deliveryNote";
import { useOrders } from "@/lib/orderStore";

interface DeliveryNotePrintProps {
  role?: UserRole;
}

export function DeliveryNotePrint({ role = "admin" }: DeliveryNotePrintProps) {
  const { id } = useParams();
  const orders = useOrders();
  const order = orders.find((entry) => entry.id === id) ?? orders[0];
  const deliveryNote = generateDeliveryNote(order);
  const backPath = role === "admin" ? `/admin/orders/${order.id}` : `/${role}/orders/${order.id}`;
  const qrTarget = `${window.location.origin}${role === "admin" ? `/admin/orders/${order.id}/delivery-note` : `/${role}/orders/${order.id}/delivery-note`}`;

  return (
    <div className="flex min-h-screen bg-canvas-white delivery-note-shell">
      <div className="delivery-note-chrome">
        <Sidebar role={role} />
      </div>
      <div className="flex-1">
        <div className="delivery-note-chrome">
          <Header title={`Delivery Note: ${deliveryNote.doNumber}`} />
        </div>

        <main className="p-8 space-y-5 delivery-note-main">
          <section className="delivery-note-chrome mx-auto flex max-w-[980px] items-center justify-between">
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
              Print Delivery Note
            </button>
          </section>

          {deliveryNote.missingRequiredFields.length > 0 && (
            <section className="delivery-note-chrome mx-auto max-w-[980px] rounded-lg border border-warning/30 bg-warning/10 p-4 text-xs text-foreground">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="font-bold">Missing data before print</p>
                  <p className="mt-1 text-muted-foreground">
                    Complete: {deliveryNote.missingRequiredFields.join(", ")}.
                  </p>
                </div>
              </div>
            </section>
          )}

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
                <p className="text-[17px] font-bold">DO Number : {deliveryNote.doNumber}</p>
                <Barcode value={deliveryNote.barcodeValue} />
              </div>
            </header>

            <section className="delivery-note-contact-row">
              <div className="delivery-note-sender">
                <h2>Sender</h2>
                <p className="font-bold">{deliveryNote.senderProfile.name}</p>
                {deliveryNote.senderProfile.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>{deliveryNote.senderProfile.phone}</p>
              </div>

              <div className="delivery-note-recipient">
                <KeyValue
                  label="HH Global PIC"
                  value={deliveryNote.hhGlobalContacts.map((contact) => `${contact.name}(${contact.label})`).join(" / ")}
                />
                <KeyValue
                  label="Email & Phone"
                  value={deliveryNote.hhGlobalContacts.map((contact) => `${contact.email}/${contact.phone}`).join("\n")}
                />
                <div className="h-4" />
                <KeyValue label="Deliver to" value={deliveryNote.deliverySnapshot.deliveryCompanyName} />
                <KeyValue label="Company" value={deliveryNote.deliverySnapshot.deliveryLocationName} />
                <KeyValue label="PIC Client" value={deliveryNote.deliverySnapshot.picClient} />
                <KeyValue label="Address" value={deliveryNote.deliverySnapshot.address} />
                <KeyValue label="Phone No." value={deliveryNote.deliverySnapshot.phone} />
                <KeyValue label="SO Number" value={deliveryNote.soNumber} />
              </div>
            </section>

            <section className="delivery-note-program">
              <KeyValue label="PO No" value={deliveryNote.poNumber} />
              <KeyValue label="Program" value={deliveryNote.programName} />
              <KeyValue label="PIC Program" value={deliveryNote.picProgram} />
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
                {deliveryNote.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.poLineNumber}</td>
                    <td className="font-bold">{formatMaterialCode(line.materialCode)}</td>
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
              {deliveryNote.note}
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
      </div>
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

function QuantityCell({ line, type }: { line: DeliveryNoteLine; type: "ordered" | "delivered" | "outstanding" }) {
  const quantity = type === "ordered" ? line.orderedQty : type === "delivered" ? line.deliveredQty : line.outstandingQty;
  const areaText = type === "ordered" ? line.orderedAreaText : type === "delivered" ? line.deliveredAreaText : line.outstandingAreaText;

  return (
    <td>
      <p>{quantity}{line.uom}</p>
      {areaText && <p>({areaText})</p>}
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
        <span
          key={`${character}-${index}`}
          style={{ width: `${(character.charCodeAt(0) % 4) + 1}px` }}
        />
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
