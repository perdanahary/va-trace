import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  FileSpreadsheet,
  Inbox,
  Loader2,
  Upload,
} from "lucide-react";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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

  const batchLinkBase = role === "customer" ? "/admin/imports" : `/${role}/imports`;
  const pageTitle = role === "customer" ? "Bulk PO Upload" : "Import Inbox";

  const visibleBatches = useMemo(() => batches.slice(0, 8), [batches]);

  const handleUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      await uploadWorkbook(file, role === "customer" ? "Customer Portal" : "Operations Desk");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title={pageTitle} />

        <main className="mx-auto max-w-7xl space-y-8 p-8">
          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
            >
              <div className="border-b border-border bg-accent/20 p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Stage File</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Import client PO for vendor dispatch</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Upload the official workbook. VA Trace reads the first sheet, matches rows against deployed master data,
                  and places everything in a resumable dispatch workspace for operations.
                </p>
              </div>

              <div className="space-y-6 p-6">
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
                    dragActive ? "border-primary bg-primary/5" : "border-border bg-canvas-white",
                  )}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                  </div>
                  <p className="mt-5 text-base font-bold text-foreground">Drop `.xlsx` file here or click to browse</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Only the first worksheet is imported. Keep the official header names unchanged.
                  </p>
                  <p className="mt-4 inline-flex rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Required sheet: Item Vendor Tracking
                  </p>
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
                  />
                </label>

                {errorMessage && (
                  <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-xs text-foreground">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      <p className="font-bold text-destructive">Upload blocked</p>
                      <p className="mt-1 text-muted-foreground">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <InfoCard
                    title="What gets staged"
                    body="Each spreadsheet row becomes one import item with raw values kept for audit."
                  />
                  <InfoCard
                    title="What gets matched"
                    body="Item code, sales point, category, brand, and geography are matched against existing masters."
                  />
                  <InfoCard
                    title="What happens next"
                    body="Operations assigns rows to vendors, reviews duplicates, and dispatches ORs per vendor and Wcode."
                  />
                </div>
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="space-y-6"
            >
              <section className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Routing</p>
                <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">Uploads do not create ORs directly</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Every file becomes a persistent working batch first. Operations can resume assignment later without re-uploading.
                </p>
                <Link
                  to={batchLinkBase}
                  className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-primary/90"
                >
                  Open Dispatch Workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </section>

              <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold tracking-tight">Recent Import Batches</h3>
                </div>
                <div className="mt-5 space-y-3">
                  {visibleBatches.map((batch) => {
                    const summary = getImportBatchSummary(batch);

                    return (
                      <Link
                        key={batch.id}
                        to={batchLinkBase}
                        className="block rounded-lg border border-border bg-canvas-white p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-foreground">{batch.fileName}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                              {batch.stage} · {batch.rows.length} rows
                            </p>
                          </div>
                          <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-bold text-muted-foreground">
                            {summary.assignedRows} assigned
                          </span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(batch.progressPercent, 6)}%` }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </motion.aside>
          </section>
        </main>
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-canvas-white p-4">
      <div className="flex items-center gap-2 text-primary">
        <FileSpreadsheet className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.24em]">{title}</p>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
