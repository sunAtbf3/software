import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "../../../shared/ToastConfig";
import {
  Upload, FileText, Archive, CheckCircle, AlertTriangle,
  XCircle, ChevronDown, ChevronRight, X, Download,
  ArrowLeft, ArrowRight, Loader2, Package, RefreshCw,
} from "lucide-react";
import {
  setStep, setImageMode, setCsvFileMeta, setZipFileMeta,
  setPreviewData, setCsvError, setResult, setImportError,
  setExpandedRow, setResultTab, resetBulkUpload,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/BulkUpload_api/bulkUploadSlice";
import AxiosInstance from "../../../../SERVICES/AxiosInstance";

// ─── tiny helpers ────────────────────────────────────────────────────────────
const fmt = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const previewProductCodes = (row) => {
  const codes = row?.variants?.map((v) => v.product_code).filter(Boolean);
  if (codes?.length) return codes.join(", ");
  return row?.product_code || "—";
};

const STEPS = [
  { key: "upload",    label: "CSV"     },
  { key: "preview",   label: "Preview" },
  { key: "zip",       label: "Images"  },
  { key: "importing", label: "Import"  },
  { key: "result",    label: "Done"    },
];

const REQUIRED_COLS = [
  "name",
  "product_code",
  "mrp",
  "special_price",
  "purchase_price",
  "expenses",
  "vendor_name",
  "category_name",
  "weight",
  "length",
  "width",
  "height",
];

// ─── component ───────────────────────────────────────────────────────────────
const BulkUploadTab = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const {
    step, imageMode, csvFileMeta, zipFileMeta,
    previewData, csvError, result, importError,
    expandedRow, resultTab,
  } = useSelector((s) => s.bulkUpload);

  const csvFileRef  = useRef(null);
  const zipFileRef  = useRef(null);
  const prevStepRef = useRef(step);

  const [csvDrag, setCsvDrag]         = useState(false);
  const [zipDrag, setZipDrag]         = useState(false);
  const [importPct, setImportPct]     = useState(0);
  const [csvPct, setCsvPct]           = useState(0);
  const [importPhase, setImportPhase] = useState(0); // 0 uploading 1 processing 2 finalizing

  // auto-set mode
  useEffect(() => { dispatch(setImageMode("zip")); }, []);

  // toast on result
  useEffect(() => {
    if (prevStepRef.current !== "result" && step === "result" && result) {
      const created  = result.created  || 0;
      const failed   = result.failed?.length   || 0;
      const warnings = result.warnings?.length || 0;
      if (failed && !created)      toast.error(`Import failed — ${failed} product(s) could not be created`);
      else if (failed)             toast.warning(`${created} created · ${failed} failed`, { autoClose: 6000 });
      else if (warnings)           toast.success(`${created} imported with ${warnings} warning(s)`);
      else                         toast.success(`${created} product(s) imported successfully`);
    }
    prevStepRef.current = step;
  }, [step, result]);

  // progress animation
  useEffect(() => {
    let raf, t0;
    const run = (ts) => {
      if (!t0) t0 = ts;
      const el = ts - t0;
      const p  = Math.min(91, (el / 2400) * 100);
      if      (step === "importing") { setImportPct(Math.floor(p)); setImportPhase(el < 900 ? 0 : el < 1800 ? 1 : 2); }
      else if (step === "preview")   setCsvPct(Math.floor(p));
      if (p < 91) raf = requestAnimationFrame(run);
    };
    if (step === "importing" || step === "preview") { t0 = null; raf = requestAnimationFrame(run); }
    else { setImportPct(0); setCsvPct(0); }
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [step]);

  // ── file handlers ──────────────────────────────────────────────────────────
  const onCsvPick = (file) => {
    if (!file?.name.endsWith(".csv")) { dispatch(setCsvError("Only .csv files accepted")); return; }
    csvFileRef.current = file;
    dispatch(setCsvFileMeta({ name: file.name, size: file.size }));
    dispatch(setCsvError(null));
  };
  const onZipPick = (file) => {
    if (!file?.name.endsWith(".zip")) return;
    zipFileRef.current = file;
    dispatch(setZipFileMeta({ name: file.name, size: file.size }));
  };

  // ── API calls ──────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!csvFileRef.current) { dispatch(setCsvError("Please select a CSV file")); return; }
    dispatch(setStep("preview")); dispatch(setPreviewData(null)); dispatch(setCsvError(null)); setCsvPct(0);
    try {
      const fd = new FormData(); fd.append("file", csvFileRef.current);
      const res = await AxiosInstance.post("/products/bulk/csv?preview=true", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setCsvPct(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      });
      
      const resData = res.data.data;

      // Toast failed/invalid rows if any
      if (resData?.failed && resData.failed.length > 0) {
        resData.failed.forEach((fail) => {
          toast.error(`[Row ${fail.rows?.join(", ") || "?"}] ${fail.product || "Product"}: ${fail.message}`, {
            autoClose: 10000,
          });
        });
      }

      const validCount = resData?.preview?.valid || 0;

      // If no valid rows found and there were validation failures, go back to upload step
      if (validCount === 0 && resData?.failed && resData.failed.length > 0) {
        const errorMsg = resData.failed.map(f => f.message).join(" | ");
        dispatch(setCsvError(`Validation failed: ${errorMsg}`));
        dispatch(setStep("upload"));
        return;
      }

      dispatch(setPreviewData(resData?.preview));
    } catch (err) {
      dispatch(setCsvError(err.response?.data?.message || "Preview failed"));
      dispatch(setStep("upload"));
    }
  };

  const handleImport = async () => {
    if (!csvFileRef.current) return;
    dispatch(setStep("importing")); dispatch(setResult(null)); dispatch(setImportError(null)); setImportPct(0);
    try {
      const fd = new FormData(); fd.append("file", csvFileRef.current);
      if (zipFileRef.current) fd.append("imagesZip", zipFileRef.current);
      const res = await AxiosInstance.post("/products/bulk/csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setImportPct(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      });
      dispatch(setResult(res.data.data)); dispatch(setStep("result"));
    } catch (err) {
      dispatch(setImportError(err.response?.data?.message || "Import failed"));
      dispatch(setStep("upload"));
    }
  };

  const downloadFailedReport = async () => {
    try {
      const res = await AxiosInstance.get("/products/bulk/failed-report", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "failed_products.csv";
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch { toast.error("Failed to download report"); }
  };

  const downloadSample = () => {
    const a = document.createElement("a");
    a.href = "/bulk-product-upload-template-software-final.xlsx";
    a.download = "bulk-product-upload-template-software-final.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Sample Excel template downloaded");
  };

  if (!isOpen) return null;

  const stepIdx     = STEPS.findIndex(s => s.key === step);
  const phaseLabels = ["Uploading files…","Processing products…","Uploading images to cloud…"];
  const phaseKeys   = ["Uploading","Processing","Finalizing"];

  // ── shared atoms ───────────────────────────────────────────────────────────
  const DropZone = ({ hasFile, fileMeta, drag, onDragOver, onDragLeave, onDrop, onClick, inputId, accept, onInput, icon: Icon, label, sub }) => (
    <div
      onClick={onClick}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-10 px-6 select-none",
        hasFile
          ? "border-green-600/60 bg-green-900/10"
          : drag
            ? "border-[#F7A221]/80 bg-[#F7A221]/5"
            : "border-slate-600/50 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/70",
      ].join(" ")}
    >
      <input type="file" accept={accept} id={inputId} className="hidden" onChange={onInput} />
      {hasFile ? (
        <>
          <CheckCircle size={32} className="text-green-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-200">{fileMeta.name}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{fmt(fileMeta.size)}</p>
          </div>
          <p className="text-xs text-slate-600">Click to replace</p>
        </>
      ) : (
        <>
          <div className={["p-3 rounded-lg", drag ? "bg-[#F7A221]/15" : "bg-slate-700/60"].join(" ")}>
            <Icon size={22} className={drag ? "text-[#F7A221]" : "text-slate-400"} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-300">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
          </div>
        </>
      )}
    </div>
  );

  const ProgressBar = ({ pct, color = "bg-[#F7A221]" }) => (
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );

  const NavRow = ({ onBack, onNext, nextLabel, nextDisabled, nextDanger = false }) => (
    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
      {onBack
        ? <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"><ArrowLeft size={14} /> Back</button>
        : <div />}
      {onNext && (
        <button
          onClick={onNext} disabled={nextDisabled}
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer",
            nextDisabled ? "opacity-40 cursor-not-allowed bg-slate-700 text-slate-400"
              : "bg-[#F7A221] text-slate-900 hover:bg-[#e8920d] active:scale-95",
          ].join(" ")}
        >
          {nextLabel} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        {/* backdrop */}
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        {/* modal */}
        <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl max-h-[90vh]">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                <Package size={16} className="text-[#F7A221]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Bulk Product Import</h2>
                <p className="text-xs text-slate-500 mt-0.5">CSV + ZIP images · row errors don't interrupt the import</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>

          {/* ── Step bar ──────────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center">
              {STEPS.map((s, i) => {
                const done   = i < stepIdx;
                const active = i === stepIdx;
                return (
                  <React.Fragment key={s.key}>
                    <div className="flex flex-col items-center gap-1" style={{ minWidth: 48 }}>
                      <div className={[
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                        done   ? "bg-green-600/20 border border-green-600/50"
                               : active ? "bg-[#F7A221]/15 border border-[#F7A221]/60"
                               : "bg-slate-800 border border-slate-700",
                      ].join(" ")}>
                        {done
                          ? <CheckCircle size={13} className="text-green-500" />
                          : <span className={["text-xs font-bold", active ? "text-[#F7A221]" : "text-slate-600"].join(" ")}>{i + 1}</span>
                        }
                      </div>
                      <span className={["text-[10px] font-medium tracking-wide uppercase", active ? "text-[#F7A221]" : done ? "text-green-500" : "text-slate-600"].join(" ")}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={["flex-1 h-px mx-1 mb-4 transition-all duration-400", done ? "bg-green-700/50" : "bg-slate-700/60"].join(" ")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ── Content ───────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── 1. CSV UPLOAD ──────────────────────────────────────────── */}
            {(step === "mode" || step === "upload") && (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Upload CSV file</p>
                  <p className="text-xs text-slate-500 mt-0.5">All product data goes in the CSV. Images are uploaded as a ZIP in the next step.</p>
                </div>

                <DropZone
                  hasFile={!!csvFileMeta} fileMeta={csvFileMeta} drag={csvDrag}
                  onDragOver={(e) => { e.preventDefault(); setCsvDrag(true); }}
                  onDragLeave={() => setCsvDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setCsvDrag(false); onCsvPick(e.dataTransfer.files[0]); }}
                  onClick={() => document.getElementById("csv-input").click()}
                  inputId="csv-input" accept=".csv"
                  onInput={(e) => onCsvPick(e.target.files[0])}
                  icon={FileText} label="Drag & drop or click to upload CSV" sub="CSV only · max 10 MB"
                />

                {csvError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-900/20 border border-red-800/50 text-red-400 text-xs">
                    <AlertTriangle size={13} className="flex-shrink-0" /> {csvError}
                  </div>
                )}

                {/* Required columns */}
                <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Required columns</p>
                  <div className="flex flex-wrap gap-1.5">
                    {REQUIRED_COLS.map(c => (
                      <span key={c} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-700/70 text-slate-300 border border-slate-700">{c}</span>
                    ))}
                  </div>
                </div>

                <NavRow
                  onBack={null}
                  onNext={handlePreview}
                  nextLabel="Preview data"
                  nextDisabled={!csvFileMeta}
                />

                <div className="flex justify-start">
                  <button onClick={downloadSample} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                    <Download size={12} /> Download sample CSV
                  </button>
                </div>
              </>
            )}

            {/* ── 2a. PREVIEW loading ─────────────────────────────────────── */}
            {step === "preview" && !previewData && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 size={28} className="text-slate-500 animate-spin" />
                <p className="text-sm text-slate-400">Analysing CSV…</p>
                <div className="w-64">
                  <ProgressBar pct={csvPct} />
                  <p className="text-xs text-slate-600 font-mono text-center mt-1.5">{csvPct}%</p>
                </div>
              </div>
            )}

            {/* ── 2b. PREVIEW data ────────────────────────────────────────── */}
            {step === "preview" && previewData && (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Review your data</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Invalid rows will appear in the failure report — they won't stop the import.
                  </p>
                </div>

                {/* stat row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total",   value: (previewData.valid||0)+(previewData.invalid||0), cls: "text-slate-200",  bg: "bg-slate-800/60 border-slate-700/50" },
                    { label: "Valid",   value: previewData.valid||0,   cls: "text-green-400",  bg: "bg-green-900/15 border-green-800/40" },
                    { label: "Invalid", value: previewData.invalid||0, cls: "text-red-400",    bg: "bg-red-900/15 border-red-800/40" },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                      <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* table */}
                <div className="rounded-xl border border-slate-700/60 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/60 border-b border-slate-700/60">
                    <span className="text-xs text-slate-400 font-medium">{previewData.rows?.length || 0} rows parsed</span>
                    <button onClick={downloadSample} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                      <Download size={11} /> Sample
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-64 overflow-x-auto">
                    <table className="w-full min-w-[720px] lg:min-w-0 text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-700/60 bg-slate-800/40 sticky top-0">
                          {["#","Name","Code","Variants","Images","Status"].map(h => (
                            <th key={h} className="px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.rows?.map((row, idx) => (
                          <React.Fragment key={idx}>
                            <tr
                              className={[
                                "border-b border-slate-800/60 transition-colors",
                                row.errors?.length > 0 ? "cursor-pointer hover:bg-slate-800/40" : "hover:bg-slate-800/20",
                                expandedRow === idx ? "bg-slate-800/30" : "",
                              ].join(" ")}
                              onClick={() => row.errors?.length > 0 && dispatch(setExpandedRow(expandedRow === idx ? null : idx))}
                            >
                              <td className="px-3 py-2.5 font-mono text-slate-600">{idx + 1}</td>
                              <td className="px-3 py-2.5 text-slate-200 font-medium max-w-[140px] truncate">{row.name}</td>
                              <td className="px-3 py-2.5 font-mono text-slate-400 max-w-[180px] truncate" title={previewProductCodes(row)}>{previewProductCodes(row)}</td>
                              <td className="px-3 py-2.5 text-slate-400">{row.variants_count || 1}</td>
                              <td className="px-3 py-2.5">
                                {row.has_images
                                  ? <span className="text-green-500 text-[11px] font-medium">Yes</span>
                                  : <span className="text-slate-600 text-[11px]">—</span>}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  {row.errors?.length > 0 ? (
                                    <>
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-900/20 border border-red-800/40 rounded-full px-2 py-0.5">
                                        <XCircle size={9} /> {row.errors.length} error{row.errors.length > 1 ? "s" : ""}
                                      </span>
                                      {expandedRow === idx ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-600" />}
                                    </>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-400 bg-green-900/20 border border-green-800/40 rounded-full px-2 py-0.5">
                                      <CheckCircle size={9} /> Valid
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {expandedRow === idx && row.errors?.length > 0 && (
                              <tr className="bg-red-950/20">
                                <td colSpan={6} className="px-5 py-2.5 pl-10">
                                  <ul className="space-y-1">
                                    {row.errors.map((e, i) => (
                                      <li key={i} className="text-xs text-red-400 flex items-start gap-1.5">
                                        <span className="text-red-600 mt-0.5 flex-shrink-0">›</span> {e}
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <NavRow
                  onBack={() => dispatch(setStep("upload"))}
                  onNext={() => dispatch(setStep("zip"))}
                  nextLabel="Upload images"
                  nextDisabled={(previewData.valid || 0) === 0}
                />
              </>
            )}

            {/* ── 3. ZIP UPLOAD ──────────────────────────────────────────── */}
            {step === "zip" && (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Upload product images</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pack images in a ZIP. Folder names must match the <code className="text-slate-400 bg-slate-800 px-1 rounded">product_code</code> column in your CSV.
                  </p>
                </div>

                {/* ready pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-900/20 border border-green-800/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-xs text-green-400 font-medium">
                    {previewData?.valid || 0} valid product{(previewData?.valid || 0) !== 1 ? "s" : ""} ready
                  </span>
                </div>

                {/* ZIP structure */}
                <div className="rounded-xl border border-slate-700/60 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-700/60">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Expected ZIP structure</p>
                  </div>
                  <pre className="px-4 py-3 text-[11px] font-mono text-slate-400 leading-relaxed bg-slate-800/20 overflow-x-auto whitespace-pre">{`images.zip
├── TSHIRT-001/          ← product_code
│   ├── front.jpg        ← up to 4 images
│   └── back.jpg
├── TSHIRT-002/
│   └── photo.jpg
└── TSHIRT-003/
    └── main.png`}</pre>
                  <div className="flex items-center gap-6 px-4 py-2.5 border-t border-slate-700/60 bg-slate-800/30">
                    {[
                      "Max 4 images per product",
                      "JPEG · PNG · WebP · GIF",
                      "Max 5 MB per image",
                    ].map(r => (
                      <span key={r} className="text-[11px] text-slate-500">{r}</span>
                    ))}
                  </div>
                </div>

                <DropZone
                  hasFile={!!zipFileMeta} fileMeta={zipFileMeta} drag={zipDrag}
                  onDragOver={(e) => { e.preventDefault(); setZipDrag(true); }}
                  onDragLeave={() => setZipDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setZipDrag(false); onZipPick(e.dataTransfer.files[0]); }}
                  onClick={() => document.getElementById("zip-input").click()}
                  inputId="zip-input" accept=".zip"
                  onInput={(e) => onZipPick(e.target.files[0])}
                  icon={Archive} label="Drag & drop or click to upload ZIP" sub="ZIP only · images are optional"
                />

                {importError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-900/20 border border-red-800/50 text-red-400 text-xs">
                    <AlertTriangle size={13} className="flex-shrink-0" /> {importError}
                  </div>
                )}

                <NavRow
                  onBack={() => dispatch(setStep("preview"))}
                  onNext={handleImport}
                  nextLabel={`Import ${previewData?.valid || 0} products`}
                  nextDisabled={false}
                />
              </>
            )}

            {/* ── 4. IMPORTING ───────────────────────────────────────────── */}
            {step === "importing" && (
              <div className="flex flex-col items-center justify-center py-10 gap-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Loader2 size={26} className="text-[#F7A221] animate-spin" />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-200">{phaseLabels[importPhase]}</p>
                  <p className="text-xs text-slate-500 mt-1">Please keep this window open</p>
                </div>

                {/* progress */}
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span className="font-mono text-[#F7A221]">{importPct}%</span>
                  </div>
                  <ProgressBar pct={importPct} />
                </div>

                {/* phase pills */}
                <div className="flex items-center gap-2">
                  {phaseKeys.map((ph, i) => {
                    const done    = i < importPhase;
                    const current = i === importPhase;
                    return (
                      <div key={ph} className={[
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-400",
                        done    ? "bg-green-900/20 border-green-800/40 text-green-400"
                                : current ? "bg-[#F7A221]/10 border-[#F7A221]/40 text-[#F7A221]"
                                : "bg-slate-800 border-slate-700 text-slate-600",
                      ].join(" ")}>
                        {done ? <CheckCircle size={11} /> : current ? <Loader2 size={11} className="animate-spin" /> : <div className="w-2.5 h-2.5 rounded-full border border-slate-600" />}
                        {ph}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-600 text-center">
                  Errors on individual rows won't stop the import
                </p>
              </div>
            )}

            {/* ── 5. RESULT ──────────────────────────────────────────────── */}
            {step === "result" && result && (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Import complete</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(result.failed?.length || 0) === 0
                      ? "All products were imported successfully."
                      : "Some rows had errors. Successful products were saved. Download the report for details."}
                  </p>
                </div>

                {/* stat cards */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { label: "Created",  val: result.created||0,              icon: CheckCircle,     cls: "text-green-400",  bg: "bg-green-900/15 border-green-800/40" },
                    { label: "Updated",  val: result.updated||0,              icon: RefreshCw,       cls: "text-sky-400",    bg: "bg-sky-900/15 border-sky-800/40" },
                    { label: "Warnings", val: result.warnings?.length||0,     icon: AlertTriangle,   cls: "text-yellow-400", bg: "bg-yellow-900/15 border-yellow-800/40" },
                    { label: "Failed",   val: result.failed?.length||0,       icon: XCircle,         cls: "text-red-400",    bg: "bg-red-900/15 border-red-800/40" },
                  ].map(({ label, val, icon: Icon, cls, bg }) => (
                    <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
                      <Icon size={18} className={`${cls} mx-auto mb-1.5`} />
                      <p className={`text-2xl font-bold ${cls}`}>{val}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* warnings */}
                {result.warnings?.length > 0 && (
                  <div className="rounded-xl border border-yellow-800/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-900/10 border-b border-yellow-800/30">
                      <AlertTriangle size={13} className="text-yellow-500" />
                      <span className="text-xs font-semibold text-yellow-400">Warnings ({result.warnings.length})</span>
                    </div>
                    <ul className="max-h-36 overflow-y-auto px-4 py-3 space-y-2">
                      {result.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-slate-400">
                          <span className="text-slate-200 font-medium">{w.product}:</span> {w.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* failed */}
                {result.failed?.length > 0 && (
                  <div className="rounded-xl border border-red-800/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/10 border-b border-red-800/30">
                      <XCircle size={13} className="text-red-500" />
                      <span className="text-xs font-semibold text-red-400">Failed ({result.failed.length})</span>
                    </div>
                    <ul className="max-h-36 overflow-y-auto px-4 py-3 space-y-2">
                      {result.failed.map((f, i) => (
                        <li key={i} className="text-xs text-slate-400">
                          <span className="text-slate-200 font-medium">{f.product}:</span> {f.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* per-product tabs */}
                {result.products?.length > 0 && (
                  <div className="rounded-xl border border-slate-700/60 overflow-hidden">
                    <div className="flex items-center gap-1 px-3 py-2 bg-slate-800/50 border-b border-slate-700/60">
                      {[
                        { key: "all",               label: `All (${result.products.length})` },
                        { key: "success",            label: `Success (${result.products.filter(p=>p.status==="success").length})` },
                        { key: "saved_with_warnings",label: `Warnings (${result.products.filter(p=>p.status==="saved_with_warnings").length})` },
                        { key: "failed",             label: `Failed (${result.products.filter(p=>p.status==="failed").length})` },
                      ].map(t => (
                        <button key={t.key} onClick={() => dispatch(setResultTab(t.key))}
                          className={[
                            "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                            resultTab === t.key
                              ? "bg-slate-700 text-slate-200"
                              : "text-slate-500 hover:text-slate-300",
                          ].join(" ")}>{t.label}</button>
                      ))}
                    </div>
                    <div className="overflow-y-auto max-h-48 overflow-x-auto">
                      <table className="w-full min-w-[720px] lg:min-w-0 text-left text-xs">
                        <thead className="sticky top-0 bg-slate-800/80">
                          <tr className="border-b border-slate-700/60">
                            {["Product","Code","Status","Detail"].map(h => (
                              <th key={h} className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.products
                            .filter(p => resultTab === "all" || p.status === resultTab)
                            .map((p, i) => (
                              <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                                <td className="px-3 py-2 text-slate-200 font-medium max-w-[120px] truncate">{p.name||p.product||"—"}</td>
                                <td className="px-3 py-2 font-mono text-slate-500">{p.product_code||"—"}</td>
                                <td className="px-3 py-2">
                                  {p.status==="success"             && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-900/20 border border-green-800/40 rounded-full px-2 py-0.5"><CheckCircle size={8} /> Success</span>}
                                  {p.status==="saved_with_warnings" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-400 bg-yellow-900/20 border border-yellow-800/40 rounded-full px-2 py-0.5"><AlertTriangle size={8} /> Warning</span>}
                                  {p.status==="failed"              && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-900/20 border border-red-800/40 rounded-full px-2 py-0.5"><XCircle size={8} /> Failed</span>}
                                </td>
                                <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate">{p.error||p.warning||p.message||"—"}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  {(result.failed?.length || 0) > 0
                    ? <button onClick={downloadFailedReport} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                        <Download size={12} /> Download failed report
                      </button>
                    : <div />}
                  <div className="flex items-center gap-2">
                    <button onClick={() => dispatch(resetBulkUpload())} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
                      Upload another
                    </button>
                    <button onClick={() => { dispatch(resetBulkUpload()); onClose(); }} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F7A221] text-slate-900 hover:bg-[#e8920d] transition-colors cursor-pointer">
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadTab;
// down code is working but dont need two modes 
// // TABS/INVENTORY/BulkUploadTab.jsx
// import React, { useState, useRef, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import {
//   setStep,
//   setImageMode,
//   setCsvFileMeta,
//   setZipFileMeta,
//   setPreviewData,
//   setCsvError,
//   setResult,
//   setImportError,
//   setExpandedRow,
//   setResultTab,
//   resetBulkUpload,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/BulkUpload_api/bulkUploadSlice";
// import AxiosInstance from "../../../../SERVICES/AxiosInstance";

// const BulkUploadTab = ({ isOpen, onClose }) => {
//   const dispatch = useDispatch();
//   const {
//     step,
//     imageMode,
//     csvFileMeta,
//     zipFileMeta,
//     previewData,
//     csvError,
//     result,
//     importError,
//     expandedRow,
//     resultTab,
//   } = useSelector((state) => state.bulkUpload);

//   // Local refs for actual File objects
//   const csvFileRef = useRef(null);
//   const zipFileRef = useRef(null);
//   const [localImportPct, setLocalImportPct] = useState(0);
//   const [localCsvPct, setLocalCsvPct] = useState(0);
//   const prevStepRef = useRef(step);

//   // Toast on step transition to result
//   useEffect(() => {
//     if (prevStepRef.current !== "result" && step === "result" && result) {
//       const { created = 0, failed = [], warnings = [] } = result;
//       const hasWarnings = warnings && warnings.length > 0;
//       const hasFailures = failed && failed.length > 0;

//       if (hasFailures && created === 0) {
//         toast.error(`Import failed: ${failed.length} product(s) failed`);
//       } else if (hasFailures) {
//         toast.warning(
//           `${created} product(s) created, ${failed.length} failed. Download report for details.`,
//           { autoClose: 5000 }
//         );
//       } else if (hasWarnings) {
//         toast.success(`${created} product(s) created with ${warnings.length} warning(s)`);
//       } else {
//         toast.success(`${created} product(s) created successfully!`);
//       }
//     }
//     prevStepRef.current = step;
//   }, [step, result]);

//   // Simulate progress animation
//   useEffect(() => {
//     let rafId;
//     let startTime;
//     const duration = 2000;

//     const animate = (timestamp) => {
//       if (!startTime) startTime = timestamp;
//       const elapsed = timestamp - startTime;
//       const progress = Math.min(95, (elapsed / duration) * 100);

//       if (step === "importing") {
//         setLocalImportPct(Math.floor(progress));
//         if (progress < 95) {
//           rafId = requestAnimationFrame(animate);
//         }
//       } else if (step === "preview") {
//         setLocalCsvPct(Math.floor(progress));
//         if (progress < 95) {
//           rafId = requestAnimationFrame(animate);
//         }
//       }
//     };

//     if (step === "importing" || step === "preview") {
//       startTime = null;
//       rafId = requestAnimationFrame(animate);
//     } else {
//       setLocalImportPct(0);
//       setLocalCsvPct(0);
//     }

//     return () => {
//       if (rafId) cancelAnimationFrame(rafId);
//     };
//   }, [step]);

//   const handleCsvSelect = (file) => {
//     csvFileRef.current = file;
//     dispatch(setCsvFileMeta({ name: file.name, size: file.size }));
//     dispatch(setCsvError(null));
//   };

//   const handleZipSelect = (file) => {
//     zipFileRef.current = file;
//     dispatch(setZipFileMeta({ name: file.name, size: file.size }));
//   };

//   const handlePreview = async () => {
//     if (!csvFileRef.current) {
//       dispatch(setCsvError("Please select a CSV file"));
//       return;
//     }

//     dispatch(setStep("preview"));
//     dispatch(setPreviewData(null));
//     dispatch(setCsvError(null));
//     setLocalCsvPct(0);

//     try {
//       const formData = new FormData();
//       formData.append("file", csvFileRef.current);

//       const response = await AxiosInstance.post("/products/bulk/csv?preview=true", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//         onUploadProgress: (e) => {
//           const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
//           setLocalCsvPct(pct);
//         },
//       });

//       // Store the preview data from API response
//       dispatch(setPreviewData(response.data.data?.preview));
//       dispatch(setStep("preview"));

//       if (imageMode === "zip") {
//         dispatch(setStep("zip"));
//       }
//     } catch (error) {
//       dispatch(setCsvError(error.response?.data?.message || "Preview failed"));
//       dispatch(setStep("upload"));
//     }
//   };

//   const handleImport = async () => {
//     if (!csvFileRef.current) return;

//     dispatch(setStep("importing"));
//     dispatch(setResult(null));
//     dispatch(setImportError(null));
//     setLocalImportPct(0);

//     try {
//       const formData = new FormData();
//       formData.append("file", csvFileRef.current);
//       if (imageMode === "zip" && zipFileRef.current) {
//         formData.append("imagesZip", zipFileRef.current);
//       }

//       const response = await AxiosInstance.post("/products/bulk/csv", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//         onUploadProgress: (e) => {
//           const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
//           setLocalImportPct(pct);
//         },
//       });

//       dispatch(setResult(response.data.data));
//       dispatch(setStep("result"));
//     } catch (error) {
//       dispatch(setImportError(error.response?.data?.message || "Import failed"));
//       dispatch(setStep("upload"));
//     }
//   };

//   const downloadFailedReport = async () => {
//     try {
//       const response = await AxiosInstance.get("/products/bulk/failed-report", {
//         responseType: "blob",
//       });
//       const url = window.URL.createObjectURL(new Blob([response.data]));
//       const link = document.createElement("a");
//       link.href = url;
//       link.setAttribute("download", "failed_products.csv");
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//       window.URL.revokeObjectURL(url);
//       toast.success("Report downloaded successfully");
//     } catch (error) {
//       toast.error("Failed to download report");
//     }
//   };

//   const downloadSampleCsv = () => {
//     const headers = [
//       "name", "product_code", "mrp", "wholesale_price", "retail_price",
//       "hsn_code", "gst_percent", "gst_type", "unit_of_measure", "quantity",
//       "title", "description", "brand_name", "online_price", "weight",
//       "length", "width", "height", "vendor_name", "category_name",
//       "sub_category_name", "remarks"
//     ];

//     const sampleRow = [
//       "Cotton T-Shirt", "TSHIRT-001", "999", "599", "799",
//       "61091000", "18", "IGST", "PCS", "100",
//       "Premium Cotton T-Shirt", "High quality cotton", "Nike", "899",
//       "200", "30", "20", "5", "Nike Vendor", "Apparel", "T-Shirts", "Summer collection"
//     ];

//     const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv" });
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", "sample_bulk_upload.csv");
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//     window.URL.revokeObjectURL(url);
//     toast.success("Sample CSV downloaded");
//   };

//   // Status Badge Component
//   const StatusBadge = ({ status, hasErrors }) => {
//     if (hasErrors) {
//       return (
//         <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-red-900/50 text-red-400 border-red-700">
//           Invalid
//         </span>
//       );
//     }
//     return (
//       <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-green-900/50 text-green-400 border-green-700">
//         Valid
//       </span>
//     );
//   };

//   // Progress Bar Component
//   const ProgressBar = ({ pct, color = "bg-[#F7A221]" }) => (
//     <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
//       <div
//         className={`h-2 rounded-full transition-all duration-500 ${color}`}
//         style={{ width: `${Math.min(100, pct)}%` }}
//       />
//     </div>
//   );

//   if (!isOpen) return null;

//   // Calculate step index for step indicator
//   const stepOrder = ["mode", "upload", "preview", "zip", "importing", "result"];
//   const currentStepIdx = stepOrder.indexOf(step);
  
//   // Steps for display
//   const displaySteps = imageMode === "zip" 
//     ? ["Mode", "CSV", "Preview", "ZIP", "Import", "Result"]
//     : ["Mode", "CSV", "Preview", "Import", "Result"];

//   // Get tab counts for result view
//   const getTabCounts = () => {
//     if (!result?.products) return { all: 0, success: 0, warnings: 0, failed: 0 };
//     return {
//       all: result.products.length,
//       success: result.products.filter(p => p.status === "success").length,
//       warnings: result.products.filter(p => p.status === "saved_with_warnings").length,
//       failed: result.products.filter(p => p.status === "failed").length,
//     };
//   };

//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto">
//       <div className="flex items-center justify-center min-h-screen px-4 py-8">
//         <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose} />

//         <div className="relative bg-slate-900 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 border border-slate-700">
//           {/* Header */}
//           <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-900 z-10 pb-4">
//             <div>
//               <h2 className="text-2xl font-bold text-white">Bulk Upload Products</h2>
//               <p className="text-sm text-slate-400 mt-1">Import products from CSV file</p>
//             </div>
//             <button
//               onClick={onClose}
//               className="text-slate-400 hover:text-white transition-colors text-2xl"
//             >
//               ✕
//             </button>
//           </div>

//           {/* Step Indicator */}
//           {step !== "mode" && (
//             <div className="flex mb-8">
//               {displaySteps.map((label, idx) => {
//                 const isActive = idx === currentStepIdx;
//                 const isCompleted = idx < currentStepIdx;
//                 return (
//                   <div key={idx} className="flex items-center flex-1">
//                     <div className="flex flex-col items-center flex-1">
//                       <div
//                         className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
//                           ${isActive ? "bg-[#F7A221] text-black" : 
//                             isCompleted ? "bg-green-500 text-white" : "bg-slate-700 text-slate-400"}
//                         `}
//                       >
//                         {isCompleted ? "✓" : idx + 1}
//                       </div>
//                       <span className={`text-xs mt-2 ${isActive ? "text-[#F7A221]" : isCompleted ? "text-green-400" : "text-slate-500"}`}>
//                         {label}
//                       </span>
//                     </div>
//                     {idx < displaySteps.length - 1 && (
//                       <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-slate-700"}`} />
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           {/* Mode Selection */}
//           {step === "mode" && (
//             <div className="space-y-4">
//               <h3 className="text-lg font-semibold text-white">Select Upload Mode</h3>
//               <div className="grid grid-cols-2 gap-4">
//                 <button
//                   onClick={() => {
//                     dispatch(setImageMode("csv_only"));
//                     dispatch(setStep("upload"));
//                   }}
//                   className="p-6 bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-[#F7A221] transition-all group"
//                 >
//                   <div className="text-4xl mb-3">📄</div>
//                   <div className="text-white font-medium group-hover:text-[#F7A221]">CSV Only</div>
//                   <div className="text-sm text-slate-400 mt-1">Product data only, no images</div>
//                 </button>
//                 <button
//                   onClick={() => {
//                     dispatch(setImageMode("zip"));
//                     dispatch(setStep("upload"));
//                   }}
//                   className="p-6 bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-[#F7A221] transition-all group"
//                 >
//                   <div className="text-4xl mb-3">📦</div>
//                   <div className="text-white font-medium group-hover:text-[#F7A221]">CSV + ZIP Images</div>
//                   <div className="text-sm text-slate-400 mt-1">Products with image folders</div>
//                 </button>
//               </div>
//               <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400">
//                 <strong className="text-white">Required columns:</strong> name, product_code, mrp, wholesale_price, 
//                 retail_price, hsn_code, gst_percent, gst_type, unit_of_measure, quantity
//               </div>
//             </div>
//           )}

//           {/* Upload CSV */}
//           {step === "upload" && (
//             <div className="space-y-4">
//               <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-[#F7A221] transition-all">
//                 <input
//                   type="file"
//                   accept=".csv"
//                   onChange={(e) => handleCsvSelect(e.target.files[0])}
//                   className="hidden"
//                   id="csv-upload"
//                 />
//                 <label htmlFor="csv-upload" className="cursor-pointer block">
//                   <div className="text-5xl mb-3">📊</div>
//                   <div className="text-white mb-2 text-lg">
//                     {csvFileMeta ? csvFileMeta.name : "Click or drag to upload CSV"}
//                   </div>
//                   <div className="text-sm text-slate-400">
//                     CSV files only · Max 10MB
//                   </div>
//                 </label>
//               </div>

//               {csvError && (
//                 <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
//                   ⚠️ {csvError}
//                 </div>
//               )}

//               <div className="flex justify-between">
//                 <button
//                   onClick={() => dispatch(setStep("mode"))}
//                   className="px-5 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
//                 >
//                   ← Back
//                 </button>
//                 <button
//                   onClick={handlePreview}
//                   disabled={!csvFileMeta}
//                   className="px-6 py-2 bg-[#F7A221] rounded-lg text-black font-semibold hover:bg-[#e89510] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   Preview CSV →
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Preview Results */}
//           {step === "preview" && previewData && (
//             <div className="space-y-4">
//               {/* Stats Summary */}
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
//                   <div className="text-3xl font-bold text-green-400">{previewData.valid || 0}</div>
//                   <div className="text-sm text-green-400 mt-1">Valid Products</div>
//                 </div>
//                 <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
//                   <div className="text-3xl font-bold text-red-400">{previewData.invalid || 0}</div>
//                   <div className="text-sm text-red-400 mt-1">Invalid Products</div>
//                 </div>
//               </div>

//               {/* Preview Table */}
//               <div className="bg-slate-800 rounded-lg overflow-hidden">
//                 <div className="flex justify-between items-center p-4 border-b border-slate-700">
//                   <h3 className="text-white font-semibold">Product Preview</h3>
//                   <button
//                     onClick={downloadSampleCsv}
//                     className="text-sm text-[#F7A221] hover:underline"
//                   >
//                     Download Sample CSV
//                   </button>
//                 </div>
//                 <div className="max-h-96 overflow-y-auto">
//                   <table className="w-full">
//                     <thead className="bg-slate-700 sticky top-0">
//                       <tr>
//                         <th className="px-4 py-3 text-left text-xs font-medium text-slate-300">Product Name</th>
//                         <th className="px-4 py-3 text-left text-xs font-medium text-slate-300">Variants</th>
//                         <th className="px-4 py-3 text-left text-xs font-medium text-slate-300">Images</th>
//                         <th className="px-4 py-3 text-left text-xs font-medium text-slate-300">Status</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-700">
//                       {previewData.rows?.map((row, idx) => (
//                         <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
//                           <td className="px-4 py-3 text-sm text-white">{row.name}</td>
//                           <td className="px-4 py-3 text-sm text-slate-300">{row.variants_count}</td>
//                           <td className="px-4 py-3 text-sm">
//                             {row.has_images ? (
//                               <span className="text-green-400">✓ Has Images</span>
//                             ) : (
//                               <span className="text-yellow-400">⚠ No Images</span>
//                             )}
//                           </td>
//                           <td className="px-4 py-3">
//                             <StatusBadge hasErrors={row.errors?.length > 0} />
//                             {row.errors?.length > 0 && (
//                               <div className="mt-1 text-xs text-red-400">
//                                 {row.errors.map((err, i) => (
//                                   <div key={i}>• {err}</div>
//                                 ))}
//                               </div>
//                             )}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               <div className="flex justify-between">
//                 <button
//                   onClick={() => dispatch(setStep("upload"))}
//                   className="px-5 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
//                 >
//                   ← Back
//                 </button>
//                 <button
//                   onClick={() => {
//                     if (imageMode === "zip") {
//                       dispatch(setStep("zip"));
//                     } else {
//                       handleImport();
//                     }
//                   }}
//                   disabled={previewData.valid === 0}
//                   className="px-6 py-2 bg-[#F7A221] rounded-lg text-black font-semibold hover:bg-[#e89510] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {imageMode === "zip" ? "Next: Upload ZIP →" : "Import Products →"}
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* ZIP Upload */}
//           {step === "zip" && (
//             <div className="space-y-4">
//               <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
//                 <p className="text-blue-300 text-sm">
//                   📋 Ready to import <strong>{previewData?.valid || 0}</strong> product(s). 
//                   Now upload the ZIP file containing product images.
//                 </p>
//               </div>

//               <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-[#F7A221] transition-all">
//                 <input
//                   type="file"
//                   accept=".zip"
//                   onChange={(e) => handleZipSelect(e.target.files[0])}
//                   className="hidden"
//                   id="zip-upload"
//                 />
//                 <label htmlFor="zip-upload" className="cursor-pointer block">
//                   <div className="text-5xl mb-3">🗜️</div>
//                   <div className="text-white mb-2 text-lg">
//                     {zipFileMeta ? zipFileMeta.name : "Click or drag to upload ZIP"}
//                   </div>
//                   <div className="text-sm text-slate-400">
//                     ZIP should contain folders named by product_code with images inside
//                   </div>
//                 </label>
//               </div>

//               <div className="bg-slate-800 rounded-lg p-4">
//                 <p className="text-sm font-semibold text-white mb-2">📁 ZIP Structure Example:</p>
//                 <pre className="bg-slate-900 p-3 rounded text-xs text-slate-400 font-mono">
// {`images.zip
// ├── 6767-1/          ← product_code folder
// │   ├── front.jpg
// │   └── back.jpg
// ├── 6767-2/
// │   └── image.jpg
// └── 6767-3/
//     └── main.png`}
//                 </pre>
//               </div>

//               {importError && (
//                 <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
//                   ⚠️ {importError}
//                 </div>
//               )}

//               <div className="flex justify-between">
//                 <button
//                   onClick={() => dispatch(setStep("preview"))}
//                   className="px-5 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
//                 >
//                   ← Back
//                 </button>
//                 <button
//                   onClick={handleImport}
//                   disabled={!zipFileMeta}
//                   className="px-6 py-2 bg-[#F7A221] rounded-lg text-black font-semibold hover:bg-[#e89510] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   Import {previewData?.valid || 0} Products →
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Importing Progress */}
//           {step === "importing" && (
//             <div className="py-12 text-center space-y-4">
//               <div className="text-6xl animate-bounce">⚡</div>
//               <p className="text-xl font-semibold text-white">Importing Products...</p>
//               <p className="text-sm text-slate-400">
//                 {imageMode === "zip" 
//                   ? "Extracting ZIP, matching product codes, uploading images..."
//                   : "Creating products and saving to database..."}
//               </p>
//               <div className="max-w-md mx-auto space-y-2">
//                 <ProgressBar pct={localImportPct} />
//                 <p className="text-sm text-slate-400">{localImportPct}% completed</p>
//               </div>
//               <p className="text-xs text-slate-500">Please do not close this window</p>
//             </div>
//           )}

//           {/* Result */}
//           {step === "result" && result && (
//             <div className="space-y-4">
//               {/* Stats Cards */}
//               <div className="grid grid-cols-4 gap-3">
//                 <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
//                   <div className="text-2xl font-bold text-blue-400">{result.created || 0}</div>
//                   <div className="text-xs text-blue-400 mt-1">Created</div>
//                 </div>
//                 <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-center">
//                   <div className="text-2xl font-bold text-green-400">{result.updated || 0}</div>
//                   <div className="text-xs text-green-400 mt-1">Updated</div>
//                 </div>
//                 <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-center">
//                   <div className="text-2xl font-bold text-yellow-400">{result.warnings?.length || 0}</div>
//                   <div className="text-xs text-yellow-400 mt-1">Warnings</div>
//                 </div>
//                 <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
//                   <div className="text-2xl font-bold text-red-400">{result.failed?.length || 0}</div>
//                   <div className="text-xs text-red-400 mt-1">Failed</div>
//                 </div>
//               </div>

//               {/* Success Message */}
//               {result.failed?.length === 0 && (
//                 <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-center">
//                   <p className="text-green-400 text-sm">✅ All products imported successfully!</p>
//                 </div>
//               )}

//               {/* Warnings Section */}
//               {result.warnings?.length > 0 && (
//                 <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
//                   <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Warnings</h4>
//                   <div className="space-y-1 max-h-32 overflow-y-auto">
//                     {result.warnings.map((warning, idx) => (
//                       <div key={idx} className="text-sm text-yellow-300">
//                         • {warning.product}: {warning.message}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Failed Section */}
//               {result.failed?.length > 0 && (
//                 <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
//                   <h4 className="text-red-400 font-semibold mb-2">❌ Failed Products</h4>
//                   <div className="space-y-1 max-h-32 overflow-y-auto">
//                     {result.failed.map((fail, idx) => (
//                       <div key={idx} className="text-sm text-red-300">
//                         • {fail.product}: {fail.error}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Action Buttons */}
//               <div className="flex justify-between gap-3">
//                 {result.failed?.length > 0 && (
//                   <button
//                     onClick={downloadFailedReport}
//                     className="px-5 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 transition-colors"
//                   >
//                     Download Failed Report
//                   </button>
//                 )}
//                 <div className="flex gap-3 ml-auto">
//                   <button
//                     onClick={() => {
//                       dispatch(resetBulkUpload());
//                     }}
//                     className="px-5 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
//                   >
//                     Upload Another
//                   </button>
//                   <button
//                     onClick={() => {
//                       dispatch(resetBulkUpload());
//                       onClose();
//                     }}
//                     className="px-6 py-2 bg-[#F7A221] rounded-lg text-black font-semibold hover:bg-[#e89510] transition-colors"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BulkUploadTab;
