import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { Trash2, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { cn } from "@/lib/utils.ts";

// Tanzania time zone (UTC+3)
const TANZANIA_TZ = "Africa/Dar_es_Salaam";

function getTanzaniaDateTime(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TANZANIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date()).replace(", ", " ");
}

type LocationEntry = { location: string; qty: number };

type MaterialWithCategory = {
  _id: Id<"materials">;
  prodCode: string;
  description: string;
  unit?: string;
  categoryId?: Id<"categories">;
  categoryName?: string | null;
};

type DescriptionSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (material: MaterialWithCategory) => void;
  materials: MaterialWithCategory[] | undefined;
};

function DescriptionSearch({ value, onChange, onSelect, materials }: DescriptionSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value to query when it changes (e.g. reset)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = query.trim().length > 0
    ? (materials ?? []).filter((m) =>
        m.description.toLowerCase().includes(query.toLowerCase()) ||
        m.prodCode.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (mat: MaterialWithCategory) => {
    setQuery(mat.description);
    onChange(mat.description);
    onSelect(mat);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim().length > 0 && setOpen(true)}
          placeholder="Search description from Materials..."
          className="pl-9 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
          <ul className="max-h-52 overflow-y-auto">
            {filtered.map((mat) => (
              <li
                key={mat._id}
                onMouseDown={() => handleSelect(mat)}
                className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent cursor-pointer border-b last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{mat.description}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono">{mat.prodCode}</span>
                    {mat.unit && <Badge variant="secondary" className="text-xs py-0 h-4">{mat.unit}</Badge>}
                    {mat.categoryName && <Badge variant="outline" className="text-xs py-0 h-4">{mat.categoryName}</Badge>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: Id<"stocks"> | null;
};

const EMPTY_FORM = {
  itemCode: "",
  description: "",
  unit: "",
  openBal: "0",
  receiptQty: "0",
  transferQty: "0",
  dmgQty: "0",
  location: "",
  remarks: "",
  categoryId: "",
  supplier: "",
  brand: "",
  expiryDate: "",
};

export default function StockFormDialog({ open, onOpenChange, editId }: Props) {
  const { user } = useAuth();
  const categories = useQuery(api.categories.list, {});
  const materials = useQuery(api.materials.list, {});
  const suppliers = useQuery(api.suppliers.list, {});
  const locationsList = useQuery(api.locations.list, {});
  const stockData = useQuery(api.stocks.get, editId ? { id: editId } : "skip");
  const createStock = useMutation(api.stocks.create);
  const updateStock = useMutation(api.stocks.update);
  const createShelfItem = useMutation(api.shelfItems.create);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [locationEntries, setLocationEntries] = useState<LocationEntry[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialWithCategory | null>(null);

  // Location qty dialog state
  const [locationQtyDialog, setLocationQtyDialog] = useState<{
    open: boolean;
    pendingLocation: string;
    qty: string;
  }>({ open: false, pendingLocation: "", qty: "" });

  useEffect(() => {
    if (editId && stockData) {
      setForm({
        itemCode: stockData.itemCode,
        description: stockData.description,
        unit: stockData.unit ?? "",
        openBal: String(stockData.openBal),
        receiptQty: String(stockData.receiptQty),
        transferQty: String(stockData.transferQty),
        dmgQty: String(stockData.dmgQty ?? 0),
        location: stockData.location ?? "",
        remarks: stockData.remarks ?? "",
        categoryId: stockData.categoryId ?? "",
        supplier: stockData.supplier ?? "",
        brand: stockData.brand ?? "",
        expiryDate: stockData.expiryDate ?? "",
      });
      setLocationEntries([]);
    } else if (!editId) {
      setForm(EMPTY_FORM);
      setLocationEntries([]);
      setSelectedMaterial(null);
    }
  }, [editId, stockData, open]);

  // Auto-fill from materials when item code typed manually
  const handleItemCodeBlur = () => {
    const match = materials?.find((m) => m.prodCode === form.itemCode);
    if (match) {
      setForm((f) => ({
        ...f,
        description: match.description,
        unit: match.unit ?? f.unit,
        categoryId: match.categoryId ?? f.categoryId,
      }));
      setSelectedMaterial(match);
    }
  };

  // Called when a material is selected from the description search dropdown
  const handleMaterialSelect = (mat: MaterialWithCategory) => {
    setSelectedMaterial(mat);
    setForm((f) => ({
      ...f,
      description: mat.description,
      itemCode: mat.prodCode,
      unit: mat.unit ?? f.unit,
      categoryId: (mat.categoryId as string) ?? f.categoryId,
    }));
  };

  const set = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSetLocation = () => {
    const qty = parseFloat(locationQtyDialog.qty) || 0;
    const loc = locationQtyDialog.pendingLocation;

    // Add entry to the table
    setLocationEntries((prev) => {
      const existing = prev.findIndex((e) => e.location === loc);
      if (existing >= 0) {
        // Merge into existing entry
        return prev.map((e, i) => i === existing ? { ...e, qty: e.qty + qty } : e);
      }
      return [...prev, { location: loc, qty }];
    });

    // Incrementally add qty to Opening Balance
    setForm((f) => ({
      ...f,
      location: loc,
      openBal: String((parseFloat(f.openBal) || 0) + qty),
    }));

    setLocationQtyDialog({ open: false, pendingLocation: "", qty: "" });
  };

  const removeLocationEntry = (index: number) => {
    const entry = locationEntries[index];
    setLocationEntries((prev) => prev.filter((_, i) => i !== index));
    // Deduct qty from Opening Balance
    setForm((f) => ({
      ...f,
      openBal: String(Math.max(0, (parseFloat(f.openBal) || 0) - entry.qty)),
    }));
  };

  const handleSubmit = async () => {
    if (!form.itemCode || !form.description) {
      toast.error("Item code and description are required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        itemCode: form.itemCode,
        description: form.description,
        unit: form.unit || undefined,
        openBal: parseFloat(form.openBal) || 0,
        receiptQty: parseFloat(form.receiptQty) || 0,
        transferQty: parseFloat(form.transferQty) || 0,
        dmgQty: parseFloat(form.dmgQty) || 0,
        location: form.location || undefined,
        remarks: form.remarks || undefined,
        categoryId: (form.categoryId as Id<"categories">) || undefined,
        supplier: form.supplier || undefined,
        brand: form.brand || undefined,
        expiryDate: form.expiryDate || undefined,
      };
      if (editId) {
        await updateStock({ id: editId, ...payload });
        toast.success("Stock updated");
      } else {
        const recordedBy = user?.profile.name ?? user?.profile.email ?? "Unknown";
        const dateRecorded = getTanzaniaDateTime();

        await createStock({
          ...payload,
          recordedBy,
          dateRecorded,
        });

        // Save one shelf item row per location entry
        if (locationEntries.length > 0) {
          await Promise.all(
            locationEntries.map((entry) =>
              createShelfItem({
                prodCode: form.itemCode,
                description: form.description,
                unit: form.unit || undefined,
                categoryId: (form.categoryId as Id<"categories">) || undefined,
                location: entry.location,
                qty: entry.qty,
                supplier: form.supplier || undefined,
                brand: form.brand || undefined,
                recorded: recordedBy,
                dateRecorded,
              })
            )
          );
        }

        toast.success("Stock created");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save stock");
    }
    setLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Stock" : "Add Stock"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Item Code *</Label>
              <Input
                value={form.itemCode}
                onChange={(e) => set("itemCode")(e.target.value)}
                onBlur={handleItemCodeBlur}
                placeholder="e.g. MAT-001"
              />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => set("unit")(e.target.value)} placeholder="e.g. pcs, kg, L" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Description *</Label>
              <DescriptionSearch
                value={form.description}
                onChange={(v) => {
                  set("description")(v);
                  if (!v) setSelectedMaterial(null);
                }}
                onSelect={handleMaterialSelect}
                materials={materials}
              />
              {selectedMaterial && (
                <div className={cn(
                  "mt-2 rounded-md border bg-muted/40 px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"
                )}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">Item Code:</span>
                    <span className="font-mono font-medium text-xs">{selectedMaterial.prodCode}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">Unit:</span>
                    <span className="font-medium text-xs">{selectedMaterial.unit ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">Category:</span>
                    <span className="font-medium text-xs">{selectedMaterial.categoryName ?? "—"}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label>Location</Label>
              <Select
                value={form.location || "none"}
                onValueChange={(v) => {
                  if (v === "none") {
                    set("location")("");
                  } else {
                    setLocationQtyDialog({ open: true, pendingLocation: v, qty: "" });
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locationsList?.map((l) => (
                    <SelectItem key={l._id} value={l.locationName}>{l.locationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Supplier</Label>
              <Select value={form.supplier || "none"} onValueChange={(v) => set("supplier")(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers?.map((s) => (
                    <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => set("brand")(e.target.value)} placeholder="e.g. Sigma-Aldrich" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set("expiryDate")(e.target.value)}
              />
            </div>

            {/* Location entries table */}
            {locationEntries.length > 0 && (
              <div className="col-span-2 space-y-1">
                <Label>Location Qty Entries</Label>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Location Name</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {locationEntries.map((entry, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{entry.location}</td>
                          <td className="px-3 py-2 text-right">{entry.qty}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeLocationEntry(i)}
                              className="text-destructive hover:opacity-70 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Opening Balance</Label>
              <Input type="number" value={form.openBal} onChange={(e) => set("openBal")(e.target.value)} min="0" />
            </div>
            <div className="space-y-1">
              <Label>Receipt Qty</Label>
              <Input type="number" value={form.receiptQty} onChange={(e) => set("receiptQty")(e.target.value)} min="0" />
            </div>
            <div className="space-y-1">
              <Label>Transfer Qty</Label>
              <Input type="number" value={form.transferQty} onChange={(e) => set("transferQty")(e.target.value)} min="0" />
            </div>
            <div className="space-y-1">
              <Label>DmgStck Qty</Label>
              <Input type="number" value={form.dmgQty} onChange={(e) => set("dmgQty")(e.target.value)} min="0" />
            </div>
            <div className="space-y-1">
              <Label>Close Balance (computed)</Label>
              <Input
                disabled
                value={(parseFloat(form.openBal) || 0) + (parseFloat(form.receiptQty) || 0) - (parseFloat(form.transferQty) || 0) - (parseFloat(form.dmgQty) || 0)}
                className="bg-muted text-muted-foreground"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Remarks</Label>
              <Input value={form.remarks} onChange={(e) => set("remarks")(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
              {loading ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Qty Dialog */}
      <Dialog open={locationQtyDialog.open} onOpenChange={(o) => setLocationQtyDialog((s) => ({ ...s, open: o }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Qty for {locationQtyDialog.pendingLocation}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Qty</Label>
            <Input
              type="number"
              min="0"
              placeholder="Enter quantity"
              value={locationQtyDialog.qty}
              onChange={(e) => setLocationQtyDialog((s) => ({ ...s, qty: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="cursor-pointer"
              onClick={() => setLocationQtyDialog({ open: false, pendingLocation: "", qty: "" })}
            >
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleSetLocation}>
              Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
