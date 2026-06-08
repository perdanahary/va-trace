import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, FileSpreadsheet, Inbox, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getImportBatchSummary, useImportStore } from "@/lib/importStore";

interface ImportUploadPageProps {
  role?: UserRole;
}

export function ImportUploadPage({ role = "customer" }: ImportUploadPageProps) {
  const { batches, uploadWorkbook } = useImportStore();
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUploadedBatch, setLastUploadedBatch] = useState<Awaited<ReturnType<typeof uploadWorkbook>> | null>(null);

  const batchLinkBase = role === "customer" ? "/admin/imports" : `/${role}/imports`;
  const pageTitle = role === "customer" ? "Bulk PO Upload" : "Import Inbox";
  const visibleBatches = useMemo(() => batches.slice(0, 8), [batches]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;

    setErrorMessage(null);
    setLastUploadedBatch(null);
    setIsUploading(true);

    try {
      const nextBatch = await uploadWorkbook(file, role === "customer" ? "Customer Portal" : "Operations Desk");
      setLastUploadedBatch(nextBatch);
      toast.success(`Uploaded ${nextBatch.fileName}. Review the staged batch next.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title={pageTitle} />

        <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <Badge variant="outline" className="w-fit rounded-full text-[10px] uppercase tracking-[0.24em]">
                    Stage File
                  </Badge>
                  <CardTitle className="text-2xl">Import client PO for vendor dispatch</CardTitle>
                  <CardDescription>
                    Upload the original workbook. VA Trace finds the real header row, ignores tracking columns, matches rows against master data, and stages the batch for dispatch.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 p-6">
                  <label
                    onDragEnter={() => setDragActive(true)}
                    onDragLeave={() => setDragActive(false)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                      handleUpload(event.dataTransfer.files?.[0] ?? null);
                    }}
                    className={cn(
                      "flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-12 text-center transition-colors",
                      dragActive ? "border-primary bg-primary/5" : "border-border bg-background",
                    )}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                    </div>
                    <p className="mt-5 text-base font-semibold">Drop `.xlsx` file here or click to browse</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Only the first worksheet is imported. Keep the official PO header names unchanged.
                    </p>
                    <Badge variant="secondary" className="mt-4 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]">
                      Required sheet: Item Vendor Tracking
                    </Badge>
                    <input
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  {errorMessage ? (
                    <Alert className="border-destructive/20 bg-destructive/5">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <AlertTitle>Upload blocked</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  {lastUploadedBatch ? (
                    <Alert className="border-primary/20 bg-primary/5">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <AlertTitle>Batch staged successfully</AlertTitle>
                      <AlertDescription className="space-y-3">
                        <p>
                          {lastUploadedBatch.fileName} is now staged with {lastUploadedBatch.rows.length} rows. Operations can continue matching and dispatching without re-uploading.
                        </p>
                        <Button asChild className="w-fit gap-2">
                          <Link to={batchLinkBase}>
                            Open Dispatch Workspace
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoCard title="What gets staged" body="Each spreadsheet row becomes one import item with raw values kept for audit." />
                    <InfoCard title="What gets matched" body="Item code, sales point, category, brand, and geography are matched against existing masters." />
                    <InfoCard title="What happens next" body="Operations assigns rows to vendors, reviews duplicates, and dispatches ORs per vendor and Wcode." />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-6">
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardHeader>
                  <Badge variant="outline" className="w-fit rounded-full text-[10px] uppercase tracking-[0.24em]">
                    Routing
                  </Badge>
                  <CardTitle className="text-lg">Uploads do not create ORs directly</CardTitle>
                  <CardDescription>
                    Every file becomes a persistent working batch first. Operations can resume assignment later without re-uploading.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lastUploadedBatch ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {lastUploadedBatch.rows.length} rows staged from <span className="font-medium text-foreground">{lastUploadedBatch.fileName}</span>.
                      </p>
                      <Button asChild className="gap-2">
                        <Link to={batchLinkBase}>
                          Review staged batch
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Button asChild className="gap-2">
                      <Link to={batchLinkBase}>
                        Open Dispatch Workspace
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Recent Import Batches</CardTitle>
                  </div>
                  <CardDescription>Latest staged import jobs in local storage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-6">
                  {visibleBatches.map((batch) => {
                    const summary = getImportBatchSummary(batch);

                    return (
                      <Link
                        key={batch.id}
                        to={batchLinkBase}
                        className="block rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{batch.fileName}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                              {batch.stage} · {batch.rows.length} rows
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                            {summary.assignedRows} assigned
                          </Badge>
                        </div>
                        <Progress value={Math.max(batch.progressPercent, 6)} className="mt-3 h-2" />
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.aside>
          </section>
        </main>
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-border/70 bg-background shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-primary">
          <FileSpreadsheet className="h-4 w-4" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em]">{title}</p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
