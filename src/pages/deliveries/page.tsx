import { useState, useRef, useEffect } from "react";
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
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Truck,
  MapPin,
  ChevronDown,
  CheckCircle2,
  PackagePlus,
  X,
  FileDown,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { cn } from "@/lib/utils.ts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types ─────────────────────────────────────────────────────────────────────
type ShelfResult = {
  prodCode: string;
  description: string;
  unit: string | undefined;
  locations: { location: string; qty: number }[];
};

type DeliveryItem = {
  itemCode: string;
  description: string;
  qty: number;
  unit: string;
  location: string;
  available: number;
};

const HEADER_EMPTY = {
  deliveryNo: "",
  customer: "",
  date: "",
  preparedBy: "",
  remarks: "",
};

const ITEM_EMPTY = {
  description: "",
  itemCode: "",
  unit: "",
  location: "",
  qty: "",
  availableQty: 0,
};

type HeaderState = typeof HEADER_EMPTY;
type ItemDraft = typeof ITEM_EMPTY;

// ── Searchable Description Field ──────────────────────────────────────────────
function DescriptionSearch({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: ShelfResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [debouncedSearch] = useDebounce(value, 250);
  const results = useQuery(
    api.deliveries.searchShelfItems,
    debouncedSearch.trim().length >= 1 ? { search: debouncedSearch } : "skip"
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = open && debouncedSearch.trim().length >= 1;

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search description or item code..."
      />
      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {results === undefined ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">No items found</div>
          ) : (
            results.map((item) => (
              <button
                key={item.prodCode}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-0 cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{item.description}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-primary">{item.prodCode}</span>
                      {item.unit && (
                        <span className="text-xs text-muted-foreground">· {item.unit}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Location Picker ───────────────────────────────────────────────────────────
function LocationPicker({
  prodCode,
  selected,
  onSelect,
}: {
  prodCode: string;
  selected: string;
  onSelect: (location: string, availableQty: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const locations = useQuery(
    api.deliveries.getShelfLocations,
    prodCode.trim() ? { prodCode } : "skip"
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!prodCode.trim()) return null;

  return (
    <div ref={wrapperRef} className="space-y-1">
      <Label>Location</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-accent/30 transition-colors"
        >
          <span className={cn(selected ? "text-foreground" : "text-muted-foreground")}>
            {selected || "Select a location..."}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
            {locations === undefined ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : locations.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No shelf locations found for this item
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 px-3 py-1.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                  <span>Location</span>
                  <span className="text-center">Available Qty</span>
                  <span className="text-right">Status</span>
                </div>
                {locations.map((loc) => (
                  <button
                    key={loc.shelfId}
                    type="button"
                    disabled={loc.qty <= 0}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (loc.qty > 0) {
                        onSelect(loc.location, loc.qty);
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      "grid grid-cols-3 w-full text-left px-3 py-2.5 border-b last:border-0 transition-colors",
                      loc.qty > 0
                        ? "hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        : "opacity-50 cursor-not-allowed bg-muted/20",
                      selected === loc.location && "bg-primary/10"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{loc.location}</span>
                    </div>
                    <div className="text-center">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          loc.qty <= 0
                            ? "text-destructive"
                            : loc.qty <= 5
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                        )}
                      >
                        {loc.qty}
                      </span>
                    </div>
                    <div className="text-right">
                      {selected === loc.location ? (
                        <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                      ) : loc.qty <= 0 ? (
                        <span className="text-xs text-destructive">Out of stock</span>
                      ) : loc.qty <= 5 ? (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">Low stock</span>
                      ) : (
                        <span className="text-xs text-green-600 dark:text-green-400">Available</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PDF export helper ─────────────────────────────────────────────────────────
type DeliveryRow = {
  deliveryNo: string;
  customer: string;
  date: string;
  preparedBy: string;
  itemCode: string;
  description: string;
  qty: number;
  unit?: string;
};

function exportDeliveryPDF(deliveryNo: string, rows: DeliveryRow[]) {
  const doc = new jsPDF();
  const first = rows[0];
  const pageW = doc.internal.pageSize.getWidth();

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LAB EQUIP", pageW / 2, 18, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("DELIVERY SLIP", pageW / 2, 26, { align: "center" });

  // Thin rule
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(14, 30, pageW - 14, 30);

  // Meta info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Delivery No:", 14, 38);
  doc.setFont("helvetica", "normal");
  doc.text(first.deliveryNo, 42, 38);

  doc.setFont("helvetica", "bold");
  doc.text("Customer:", 14, 45);
  doc.setFont("helvetica", "normal");
  doc.text(first.customer, 42, 45);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", 14, 52);
  doc.setFont("helvetica", "normal");
  doc.text(first.date, 42, 52);

  doc.line(14, 56, pageW - 14, 56);

  // ── Items table ──
  autoTable(doc, {
    startY: 60,
    head: [["Item Code", "Description", "Qty", "Unit"]],
    body: rows.map((r) => [
      r.itemCode,
      r.description,
      String(r.qty),
      r.unit ?? "—",
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [30, 64, 120],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
      halign: "center",
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 90 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 25, halign: "center" },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Footer ──
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;

  doc.setDrawColor(180, 180, 180);
  doc.line(14, finalY, pageW - 14, finalY);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Prepared by:", 14, finalY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(first.preparedBy, 46, finalY + 8);

  // Signature line
  doc.line(pageW - 70, finalY + 18, pageW - 14, finalY + 18);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Signature", pageW - 42, finalY + 23, { align: "center" });

  doc.save(`delivery-${deliveryNo}.pdf`);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function DeliveriesPage() {
  const deliveries = useQuery(api.deliveries.list, {});
  const nextDeliveryNo = useQuery(api.deliveries.getNextDeliveryNo, {});
  const createDelivery = useMutation(api.deliveries.createWithStockUpdate);
  const updateDelivery = useMutation(api.deliveries.update);
  const removeDelivery = useMutation(api.deliveries.remove);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"deliveries"> | null>(null);
  const [selectedDeliveryNo, setSelectedDeliveryNo] = useState<string | null>(null);

  // Fetch all rows for the selected delivery no (for PDF export)
  const selectedRows = useQuery(
    api.deliveries.getByDeliveryNo,
    selectedDeliveryNo ? { deliveryNo: selectedDeliveryNo } : "skip"
  );

  // Header fields (shared across all items in a delivery)
  const [header, setHeader] = useState<HeaderState>(HEADER_EMPTY);
  // Item draft (currently being built before adding to the list)
  const [itemDraft, setItemDraft] = useState<ItemDraft>(ITEM_EMPTY);
  // List of items staged for this delivery
  const [items, setItems] = useState<DeliveryItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"deliveries"> | null>(null);

  const filtered =
    deliveries?.filter((d) => {
      const q = search.toLowerCase();
      return (
        d.deliveryNo.toLowerCase().includes(q) ||
        d.itemCode.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.customer.toLowerCase().includes(q) ||
        d.preparedBy.toLowerCase().includes(q)
      );
    }) ?? [];

  const openCreate = () => {
    setEditId(null);
    setHeader({ ...HEADER_EMPTY, deliveryNo: nextDeliveryNo ?? "" });
    setItemDraft(ITEM_EMPTY);
    setItems([]);
    setFormOpen(true);
  };

  const openEdit = (d: NonNullable<typeof deliveries>[number]) => {
    setEditId(d._id);
    setHeader({
      deliveryNo: d.deliveryNo,
      customer: d.customer,
      date: d.date,
      preparedBy: d.preparedBy,
      remarks: d.remarks ?? "",
    });
    // In edit mode, show the existing single item in the draft (no list needed)
    setItemDraft({
      description: d.description,
      itemCode: d.itemCode,
      unit: d.unit ?? "",
      location: d.location ?? "",
      qty: String(d.qty),
      availableQty: 0,
    });
    setItems([]);
    setFormOpen(true);
  };

  const setHdr = (key: keyof HeaderState) => (value: string) =>
    setHeader((h) => ({ ...h, [key]: value }));

  const handleShelfSelect = (item: ShelfResult) => {
    setItemDraft((d) => ({
      ...d,
      description: item.description,
      itemCode: item.prodCode,
      unit: item.unit ?? "",
      location: "",
      availableQty: 0,
    }));
  };

  const handleLocationSelect = (location: string, availableQty: number) => {
    setItemDraft((d) => ({ ...d, location, availableQty }));
  };

  const handleAddItem = () => {
    if (!itemDraft.description.trim()) { toast.error("Select a description first"); return; }
    if (!itemDraft.location.trim()) { toast.error("Select a location first"); return; }
    const qty = parseFloat(itemDraft.qty);
    if (isNaN(qty) || qty <= 0) { toast.error("Enter a valid quantity"); return; }

    setItems((prev) => [
      ...prev,
      {
        itemCode: itemDraft.itemCode,
        description: itemDraft.description,
        qty,
        unit: itemDraft.unit,
        location: itemDraft.location,
        available: itemDraft.availableQty,
      },
    ]);
    // Reset item draft (keep description search clear for next item)
    setItemDraft(ITEM_EMPTY);
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!header.deliveryNo.trim()) { toast.error("Delivery No is required"); return; }
    if (!header.customer.trim()) { toast.error("Customer is required"); return; }
    if (!header.date.trim()) { toast.error("Date is required"); return; }
    if (!header.preparedBy.trim()) { toast.error("Prepared By is required"); return; }

    if (editId) {
      // Edit mode: single item update
      if (!itemDraft.description.trim()) { toast.error("Description is required"); return; }
      const qty = parseFloat(itemDraft.qty);
      if (isNaN(qty) || qty < 0) { toast.error("Valid quantity is required"); return; }

      setLoading(true);
      try {
        await updateDelivery({
          id: editId,
          deliveryNo: header.deliveryNo.trim(),
          itemCode: itemDraft.itemCode.trim(),
          description: itemDraft.description.trim(),
          qty,
          unit: itemDraft.unit || undefined,
          location: itemDraft.location || undefined,
          customer: header.customer.trim(),
          date: header.date,
          preparedBy: header.preparedBy.trim(),
          remarks: header.remarks || undefined,
        });
        toast.success("Delivery updated");
        setFormOpen(false);
      } catch {
        toast.error("Failed to save delivery");
      }
      setLoading(false);
      return;
    }

    // Create mode: require at least one item
    if (items.length === 0) { toast.error("Add at least one item to the delivery"); return; }

    setLoading(true);
    try {
      await createDelivery({
        deliveryNo: header.deliveryNo.trim(),
        customer: header.customer.trim(),
        date: header.date,
        preparedBy: header.preparedBy.trim(),
        remarks: header.remarks || undefined,
        items: items.map((item) => ({
          itemCode: item.itemCode,
          description: item.description,
          qty: item.qty,
          unit: item.unit || undefined,
          location: item.location,
        })),
      });
      toast.success(`Delivery created with ${items.length} item${items.length !== 1 ? "s" : ""} — stock & shelf updated`);
      setFormOpen(false);
    } catch {
      toast.error("Failed to save delivery");
    }
    setLoading(false);
  };

  const handleDelete = async (id: Id<"deliveries">) => {
    try {
      await removeDelivery({ id });
      toast.success("Delivery deleted");
    } catch {
      toast.error("Failed to delete delivery");
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deliveries</h1>
          <p className="text-muted-foreground text-sm">Manage delivery records</p>
        </div>
        <Button size="sm" onClick={openCreate} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-1" /> Add Delivery
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search deliveries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedDeliveryNo && (
          <Button
            size="sm"
            variant="secondary"
            className="cursor-pointer shrink-0"
            disabled={!selectedRows || selectedRows.length === 0}
            onClick={() => {
              if (selectedRows && selectedRows.length > 0) {
                exportDeliveryPDF(selectedDeliveryNo, selectedRows);
              }
            }}
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            Export PDF — {selectedDeliveryNo}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Delivery No</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Item Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Prepared By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {deliveries === undefined ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                    {search ? "No deliveries match your search." : "No deliveries yet. Add your first delivery."}
                  </td>
                </tr>
              ) : (
                filtered.map((d, idx) => (
                  <tr
                    key={d._id}
                    className={cn(
                      "border-b hover:bg-muted/30 cursor-pointer transition-colors",
                      selectedDeliveryNo === d.deliveryNo && "bg-primary/8 hover:bg-primary/10"
                    )}
                    onClick={() =>
                      setSelectedDeliveryNo((prev) =>
                        prev === d.deliveryNo ? null : d.deliveryNo
                      )
                    }
                  >
                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium">{d.deliveryNo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{d.itemCode}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate">{d.description}</td>
                    <td className="px-4 py-3 font-medium">{d.qty}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{d.unit ?? "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {d.location ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[100px]">{d.location}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{d.customer}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell whitespace-nowrap">{d.date}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{d.preparedBy}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); openEdit(d); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(d._id); }}
                        >
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
        {deliveries && deliveries.length > 0 && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/20">
            {filtered.length} of {deliveries.length} record{deliveries.length !== 1 ? "s" : ""}
          </div>
        )}
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Delivery" : "Add Delivery"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ── Header fields ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Delivery No *</Label>
                <Input
                  value={header.deliveryNo}
                  onChange={(e) => setHdr("deliveryNo")(e.target.value)}
                  placeholder="e.g. DLV-0001"
                />
              </div>
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={header.date}
                  onChange={(e) => setHdr("date")(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Customer *</Label>
                <Input
                  value={header.customer}
                  onChange={(e) => setHdr("customer")(e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-1">
                <Label>Prepared By *</Label>
                <Input
                  value={header.preparedBy}
                  onChange={(e) => setHdr("preparedBy")(e.target.value)}
                  placeholder="e.g. John Smith"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Input
                value={header.remarks}
                onChange={(e) => setHdr("remarks")(e.target.value)}
                placeholder="Optional notes"
              />
            </div>

            {/* ── Item Picker ── */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {editId ? "Item Details" : "Add Item"}
              </p>

              {/* Description search */}
              <div className="space-y-1">
                <Label>Description</Label>
                <DescriptionSearch
                  value={itemDraft.description}
                  onChange={(v) =>
                    setItemDraft((d) => ({
                      ...d,
                      description: v,
                      itemCode: "",
                      unit: "",
                      location: "",
                      availableQty: 0,
                    }))
                  }
                  onSelect={handleShelfSelect}
                />
              </div>

              {/* Location picker — only shown after item selected */}
              {itemDraft.itemCode && (
                <LocationPicker
                  prodCode={itemDraft.itemCode}
                  selected={itemDraft.location}
                  onSelect={handleLocationSelect}
                />
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Item Code</Label>
                  <Input
                    value={itemDraft.itemCode}
                    onChange={(e) =>
                      setItemDraft((d) => ({ ...d, itemCode: e.target.value }))
                    }
                    placeholder="e.g. MAT-001"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unit</Label>
                  <Input
                    value={itemDraft.unit}
                    onChange={(e) =>
                      setItemDraft((d) => ({ ...d, unit: e.target.value }))
                    }
                    placeholder="pcs, kg…"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={itemDraft.qty}
                    onChange={(e) =>
                      setItemDraft((d) => ({ ...d, qty: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Add button — shown only when location is selected (create mode) */}
              {!editId && itemDraft.location && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddItem}
                  className="cursor-pointer w-full"
                >
                  <PackagePlus className="w-4 h-4 mr-1.5" />
                  Add Item to Delivery
                </Button>
              )}
            </div>

            {/* ── Staged items table ── */}
            {!editId && items.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Items to Deliver ({items.length})
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Unit</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Location</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Available</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 max-w-[140px] truncate font-medium">{item.description}</td>
                        <td className="px-3 py-2 font-semibold">{item.qty}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.unit || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[80px]">{item.location}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "font-semibold text-sm",
                              item.available <= 0
                                ? "text-destructive"
                                : item.available <= 5
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-green-600 dark:text-green-400"
                            )}
                          >
                            {item.available}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive cursor-pointer"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
              {loading
                ? "Saving..."
                : editId
                ? "Update"
                : `Create${items.length > 0 ? ` (${items.length} item${items.length !== 1 ? "s" : ""})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Delivery</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this delivery record? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="cursor-pointer"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DeliveriesPage;
