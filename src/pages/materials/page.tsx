import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Wand2, Download, Barcode, Upload, FileText, AlertCircle } from "lucide-react";
import JsBarcode from "jsbarcode";

const EMPTY = { prodCode: "", description: "", unit: "", categoryId: "" };

// Renders a barcode SVG and returns a PNG data URL
function renderBarcodePng(code: string, description: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, code, {
    format: "CODE128",
    width: 2,
    height: 80,
    displayValue: true,
    fontSize: 14,
    margin: 16,
    background: "#ffffff",
    lineColor: "#000000",
  });

  // Convert SVG to PNG via canvas
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  // We return the object URL for preview; actual PNG export happens in exportBarcode
  return url;
}

async function exportBarcodePng(code: string, description: string): Promise<void> {
  const canvas = document.createElement("canvas");
  const padding = 24;
  const barcodeH = 110;
  const labelH = 44;
  canvas.width = 380;
  canvas.height = barcodeH + labelH + padding * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw barcode via intermediate SVG → Image
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, code, {
    format: "CODE128",
    width: 2.4,
    height: barcodeH - 20,
    displayValue: true,
    fontSize: 13,
    margin: 10,
    background: "#ffffff",
    lineColor: "#000000",
  });
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding, padding, canvas.width - padding * 2, barcodeH);
      URL.revokeObjectURL(svgUrl);

      // Description label
      ctx.fillStyle = "#374151";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(description, canvas.width / 2, barcodeH + padding + 14, canvas.width - padding * 2);

      // Border
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      resolve();
    };
    img.onerror = reject;
    img.src = svgUrl;
  });

  // Trigger download
  const link = document.createElement("a");
  link.download = `barcode-${code}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function MaterialsPage() {
  const materials = useQuery(api.materials.list, {});
  const categories = useQuery(api.categories.list, {});
  const createMaterial = useMutation(api.materials.create);
  const updateMaterial = useMutation(api.materials.update);
  const removeMaterial = useMutation(api.materials.remove);
  const bulkCreate = useMutation(api.materials.bulkCreate);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [editId, setEditId] = useState<Id<"materials"> | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"materials"> | null>(null);
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // CSV import state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<{ prodCode: string; description: string; unit: string; category: string }[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);

  const filtered = materials?.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch = m.prodCode.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    const matchesCat = filterCategory === "all" || m.categoryId === filterCategory;
    return matchesSearch && matchesCat;
  }) ?? [];

  const displayed = filtered.slice(0, displayLimit);
  const hasMore = filtered.length > displayLimit;

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY);
    setBarcodeUrl(null);
    setFormOpen(true);
  };

  const openEdit = (m: typeof materials extends (infer T)[] | undefined ? T : never) => {
    if (!m) return;
    setEditId(m._id);
    setForm({
      prodCode: m.prodCode,
      description: m.description,
      unit: m.unit ?? "",
      categoryId: m.categoryId ?? "",
    });
    // Show barcode for existing code
    try {
      setBarcodeUrl(renderBarcodePng(m.prodCode, m.description));
    } catch {
      setBarcodeUrl(null);
    }
    setFormOpen(true);
  };

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Generate a product code: [INITIALS]-[YEAR]-[SEQ]
  // Initials = first letter of each word in the description (uppercase)
  // e.g. description "Hydrochloric Acid Solution" → prefix "HAS" → HAS-2026-0001
  const generateProdCode = () => {
    const desc = form.description.trim();
    if (!desc) {
      toast.error("Please enter a description first");
      return;
    }
    // Extract first letter of each word, uppercase
    const prefix = desc
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w[0].toUpperCase())
      .join("");
    const year = new Date().getFullYear();
    // Count existing materials with the same prefix to determine next seq
    const existing = materials?.filter((m) => m.prodCode.startsWith(`${prefix}-`)) ?? [];
    const seq = existing.length + 1;
    const seqStr = String(seq).padStart(4, "0");
    const generated = `${prefix}-${year}-${seqStr}`;
    setForm((f) => ({ ...f, prodCode: generated }));
    // Render barcode preview
    try {
      const url = renderBarcodePng(generated, desc);
      setBarcodeUrl(url);
    } catch {
      setBarcodeUrl(null);
    }
    toast.success(`Generated: ${generated}`);
  };

  const handleExportBarcode = async () => {
    if (!form.prodCode) return;
    setExporting(true);
    try {
      await exportBarcodePng(form.prodCode, form.description || form.prodCode);
      toast.success("Barcode image downloaded");
    } catch {
      toast.error("Failed to export barcode");
    }
    setExporting(false);
  };

  const handleSubmit = async () => {
    if (!form.prodCode || !form.description) {
      toast.error("Product code and description are required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        prodCode: form.prodCode,
        description: form.description,
        unit: form.unit || undefined,
        categoryId: (form.categoryId as Id<"categories">) || undefined,
      };
      if (editId) {
        await updateMaterial({ id: editId, ...payload });
        toast.success("Material updated");
      } else {
        await createMaterial(payload);
        toast.success("Material created");
      }
      setFormOpen(false);
    } catch { toast.error("Failed to save material"); }
    setLoading(false);
  };

  const handleDelete = async (id: Id<"materials">) => {
    try {
      await removeMaterial({ id });
      toast.success("Material deleted");
    } catch { toast.error("Failed to delete material"); }
    setDeleteConfirm(null);
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvErrors(["File is empty or has no data rows."]);
        setCsvRows([]);
        return;
      }
      // Normalize header: lowercase, trim
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
      const colIdx = {
        prodCode: headers.findIndex((h) => h === "prodcode" || h === "prod_code" || h === "product code" || h === "product_code" || h === "code"),
        description: headers.findIndex((h) => h === "description" || h === "desc"),
        unit: headers.findIndex((h) => h === "unit" || h === "uom"),
        category: headers.findIndex((h) => h === "category" || h === "cat"),
      };

      const errors: string[] = [];
      if (colIdx.prodCode === -1) errors.push("Missing column: prodCode / Product Code");
      if (colIdx.description === -1) errors.push("Missing column: description / desc");
      if (errors.length) { setCsvErrors(errors); setCsvRows([]); return; }

      const rows: { prodCode: string; description: string; unit: string; category: string }[] = [];
      lines.slice(1).forEach((line, idx) => {
        // Handle quoted fields
        const cols = line.match(/(".*?"|[^",]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g)?.map((v) => v.replace(/^"|"$/g, "").trim()) ?? line.split(",").map((v) => v.trim());
        const prodCode = colIdx.prodCode >= 0 ? (cols[colIdx.prodCode] ?? "") : "";
        const description = colIdx.description >= 0 ? (cols[colIdx.description] ?? "") : "";
        const unit = colIdx.unit >= 0 ? (cols[colIdx.unit] ?? "") : "";
        const category = colIdx.category >= 0 ? (cols[colIdx.category] ?? "") : "";
        if (!prodCode || !description) {
          errors.push(`Row ${idx + 2}: missing prodCode or description (skipped)`);
          return;
        }
        rows.push({ prodCode, description, unit, category });
      });

      setCsvErrors(errors);
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (csvRows.length === 0) return;
    setCsvImporting(true);
    try {
      // Resolve category names to IDs
      const catNameMap = new Map(categories?.map((c) => [c.name.toLowerCase(), c._id]) ?? []);
      const rows = csvRows.map((r) => ({
        prodCode: r.prodCode,
        description: r.description,
        unit: r.unit || undefined,
        categoryId: r.category ? catNameMap.get(r.category.toLowerCase()) ?? undefined : undefined,
      }));
      const result = await bulkCreate({ rows });
      toast.success(`Imported ${result.inserted} material(s). ${result.skipped > 0 ? `${result.skipped} skipped (duplicate codes).` : ""}`);
      setCsvOpen(false);
      setCsvRows([]);
      setCsvErrors([]);
    } catch {
      toast.error("Import failed. Please try again.");
    }
    setCsvImporting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materials</h1>
          <p className="text-muted-foreground text-sm">Material catalogue and lookup</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setCsvRows([]); setCsvErrors([]); setCsvOpen(true); }} className="cursor-pointer">
            <Upload className="w-4 h-4 mr-1" /> Import CSV
          </Button>
          <Button size="sm" onClick={openCreate} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-1" /> Add Material
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setDisplayLimit(50); }}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setDisplayLimit(50); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Unit</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {materials === undefined ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No materials found.
                  </td>
                </tr>
              ) : (
                displayed.map((m) => (
                  <tr key={m._id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-primary">{m.prodCode}</td>
                    <td className="px-4 py-3">{m.description}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{m.categoryName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{m.unit ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => openEdit(m)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive cursor-pointer" onClick={() => setDeleteConfirm(m._id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Count + Load More */}
      {materials !== undefined && filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground">{displayed.length}</span> of{" "}
            <span className="font-medium text-foreground">{filtered.length}</span> materials
          </span>
          {hasMore && (
            <Button
              variant="secondary"
              size="sm"
              className="cursor-pointer"
              onClick={() => setDisplayLimit((l) => l + 50)}
            >
              Load 50 more
            </Button>
          )}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Material" : "Add Material"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => set("description")(e.target.value)} placeholder="e.g. Hydrochloric Acid Solution" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Product Code *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.prodCode}
                  onChange={(e) => set("prodCode")(e.target.value)}
                  placeholder="e.g. HAS-2026-0001"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={generateProdCode}
                  className="cursor-pointer shrink-0 gap-1.5"
                  title="Auto-generate product code from description initials"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {form.description.trim()
                  ? <>
                      Preview: <span className="font-medium text-foreground">
                        {form.description.trim().split(/\s+/).filter(w => w.length > 0).map(w => w[0].toUpperCase()).join("")}-{new Date().getFullYear()}-0001
                      </span> — initials from each word in description
                    </>
                  : "Enter a description first, then click Generate"}
              </p>
            </div>

            {/* Barcode Preview */}
            {barcodeUrl && (
              <div className="col-span-2">
                <div className="border rounded-lg bg-white p-4 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 w-full">
                    <Barcode className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Barcode Preview</span>
                  </div>
                  <img
                    src={barcodeUrl}
                    alt={`Barcode for ${form.prodCode}`}
                    className="max-w-full h-auto"
                    style={{ imageRendering: "crisp-edges" }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full cursor-pointer gap-2"
                    onClick={handleExportBarcode}
                    disabled={exporting}
                  >
                    <Download className="w-4 h-4" />
                    {exporting ? "Exporting..." : "Export Barcode as PNG"}
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => set("unit")(e.target.value)} placeholder="e.g. kg, L, pcs" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Category</Label>
              <Select value={form.categoryId || "none"} onValueChange={(v) => set("categoryId")(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
              {loading ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Material</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this material?</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="cursor-pointer">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="cursor-pointer">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* CSV Import Dialog */}
      <Dialog open={csvOpen} onOpenChange={(open) => { if (!open) { setCsvRows([]); setCsvErrors([]); } setCsvOpen(open); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Materials from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Format guide */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4" /> CSV Format
              </div>
              <p className="text-xs text-muted-foreground">
                Required columns: <span className="font-mono text-foreground">prodCode</span> (or <span className="font-mono text-foreground">Product Code</span>), <span className="font-mono text-foreground">description</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Optional columns: <span className="font-mono text-foreground">unit</span>, <span className="font-mono text-foreground">category</span> (must match an existing category name exactly)
              </p>
              <p className="text-xs text-muted-foreground">
                Rows with duplicate product codes will be skipped automatically.
              </p>
            </div>

            {/* File picker */}
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => document.getElementById("csv-file-input")?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleCsvFile(file);
              }}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to select or drag & drop a CSV file</p>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Errors */}
            {csvErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertCircle className="w-4 h-4" /> Issues found
                </div>
                {csvErrors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive/80">{err}</p>
                ))}
              </div>
            )}

            {/* Preview table */}
            {csvRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{csvRows.length} row(s) ready to import</p>
                <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product Code</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Unit</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5 font-medium text-primary">{r.prodCode}</td>
                          <td className="px-3 py-1.5">{r.description}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.unit || "—"}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.category || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCsvOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleCsvImport} disabled={csvRows.length === 0 || csvImporting} className="cursor-pointer">
              {csvImporting ? "Importing..." : `Import ${csvRows.length > 0 ? csvRows.length + " rows" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
