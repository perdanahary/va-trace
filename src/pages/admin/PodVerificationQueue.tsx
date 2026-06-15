import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DeliveryConfirmationStatusBadge } from "@/components/domain/badges/badges";
import { PodQueueTable } from "@/components/domain/tables/PodQueueTable";
import { useDeliveryConfirmations } from "@/lib/v2/podStore";
import { usePodQueueRows } from "@/lib/v2/selectors/viewModels";
import { useActor } from "@/lib/v2/useActor";
import { toApiError, verifyBatchPod } from "@/lib/v2/workflows";

interface PodVerificationQueueProps {
  userRole?: UserRole;
}

/**
 * P2-19/P3-25 — Admin POD verification queue with evidence drawer,
 * quantity comparison, and verify / reject / request-correction decisions.
 */
export function PodVerificationQueue({ userRole = "admin" }: PodVerificationQueueProps) {
  const actor = useActor(userRole, "pod-verification");
  const confirmations = useDeliveryConfirmations();
  const rows = usePodQueueRows();

  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [verifiedQuantities, setVerifiedQuantities] = useState<Record<string, number>>({});

  const pendingRows = useMemo(
    () => rows.filter((row) => ["SUBMITTED", "PENDING_VERIFICATION", "RESUBMITTED"].includes(row.status)),
    [rows],
  );
  const historyRows = useMemo(
    () => rows.filter((row) => !["SUBMITTED", "PENDING_VERIFICATION", "RESUBMITTED"].includes(row.status)),
    [rows],
  );
  const selected = confirmations.find((confirmation) => confirmation.id === openId);
  const isAdmin = userRole === "admin";

  const decide = (decision: "VERIFY" | "REJECT" | "REQUEST_CORRECTION") => {
    if (!selected) return;
    if ((decision === "REJECT" || decision === "REQUEST_CORRECTION") && !reason.trim()) {
      toast.error("A reason is required to reject or request correction.");
      return;
    }
    try {
      verifyBatchPod(
        {
          deliveryConfirmationId: selected.id,
          decision,
          reviewReason: reason.trim() || undefined,
          itemVerifications: selected.itemConfirmations.map((item) => ({
            deliveryConfirmationItemId: item.id,
            verifiedReceivedQuantity: verifiedQuantities[item.id] ?? item.claimedReceivedQuantity,
          })),
        },
        actor,
      );
      toast.success(
        decision === "VERIFY"
          ? "Proof of Delivery (POD) verified. Received quantities applied."
          : decision === "REJECT"
            ? "Proof of Delivery (POD) rejected and returned to the vendor."
            : "Correction requested from the vendor.",
      );
      setOpenId(null);
      setReason("");
      setVerifiedQuantities({});
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title="Proof of Delivery (POD) Verification" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Pending Verification ({pendingRows.length})</CardTitle>
              <CardDescription>
                Only verified Proof of Delivery (POD) updates received quantities and derived distribution status.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <PodQueueTable rows={pendingRows} onOpen={setOpenId} emptyMessage="No Proof of Delivery (POD) submissions awaiting verification." />
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
              <CardDescription>Verified, rejected, and correction-requested submissions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <PodQueueTable rows={historyRows} onOpen={setOpenId} openLabel="Open" emptyMessage="No reviewed Proof of Delivery (POD) records yet." />
            </CardContent>
          </Card>
        </main>
      </ContentArea>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Proof of Delivery (POD) Evidence
                  <DeliveryConfirmationStatusBadge status={selected.status} />
                </SheetTitle>
                <SheetDescription>
                  {selected.salesPointName} · DN {selected.deliveryNoteNumber || "—"} · received {selected.receivedDate} by{" "}
                  {selected.receiverName || "unknown receiver"}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 py-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Evidence</p>
                  {selected.evidence.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">No evidence files attached.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {selected.evidence.map((file) => (
                        <li key={file.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span className="truncate">{file.fileName}</span>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">{file.type}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quantity comparison</p>
                  <div className="mt-1 rounded-md border">
                    <div className="grid grid-cols-[1fr_4.5rem_4.5rem_5.5rem] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <span>Material</span>
                      <span className="text-right">Shipped</span>
                      <span className="text-right">Claimed</span>
                      <span className="text-right">Verified</span>
                    </div>
                    {selected.itemConfirmations.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[1fr_4.5rem_4.5rem_5.5rem] items-center gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-b-0"
                      >
                        <span className="truncate font-mono text-xs">{item.materialCode}</span>
                        <span className="text-right tabular-nums">{item.expectedShippedQuantity}</span>
                        <span className="text-right tabular-nums">{item.claimedReceivedQuantity}</span>
                        {isAdmin && ["SUBMITTED", "PENDING_VERIFICATION", "RESUBMITTED"].includes(selected.status) ? (
                          <Input
                            type="number"
                            min={0}
                            value={verifiedQuantities[item.id] ?? item.claimedReceivedQuantity}
                            onChange={(event) =>
                              setVerifiedQuantities((current) => ({
                                ...current,
                                [item.id]: Math.max(0, Number(event.target.value) || 0),
                              }))
                            }
                            className="h-8 text-right"
                            aria-label={`Verified quantity for ${item.materialCode}`}
                          />
                        ) : (
                          <span className="text-right tabular-nums">{item.verifiedReceivedQuantity ?? "—"}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selected.notes ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vendor notes</p>
                    <p className="mt-1 text-sm">{selected.notes}</p>
                  </div>
                ) : null}

                {isAdmin && ["SUBMITTED", "PENDING_VERIFICATION", "RESUBMITTED"].includes(selected.status) ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="pod-reason">Decision reason (required for reject / correction)</Label>
                    <Input
                      id="pod-reason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Reason or correction instruction"
                    />
                  </div>
                ) : null}
              </div>

              {isAdmin && ["SUBMITTED", "PENDING_VERIFICATION", "RESUBMITTED"].includes(selected.status) ? (
                <SheetFooter className="flex-row justify-end gap-2">
                  <Button variant="outline" onClick={() => decide("REQUEST_CORRECTION")}>
                    Request Correction
                  </Button>
                  <Button variant="destructive" onClick={() => decide("REJECT")}>
                    Reject
                  </Button>
                  <Button onClick={() => decide("VERIFY")}>Verify</Button>
                </SheetFooter>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
