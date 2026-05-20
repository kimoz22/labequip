import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Layers3 } from "lucide-react";
import { format } from "date-fns";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";

type ShelfItem = {
  _id: Id<"shelfItems">;
  _creationTime: number;
  prodCode: string;
  description: string;
  unit?: string;
  categoryId?: Id<"categories">;
  location?: string;
  qty: number;
  supplier?: string;
  brand?: string;
  recorded?: string;
  dateRecorded: string;
};

const EMPTY_FORM = {
  prodCode: "",
  description: "",
  unit: "",
  categoryId: "",
  location: "",
  qty: "0",
  supplier: "",
  brand: "",
  recorded: "",
  dateRecorded: new Date().toISOString().split("T")[0],
};

function ShelfItemForm({
  open,
  onOpenChange,
  editItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: ShelfItem | null;
}) {
  const categories = useQuery(api.categories.list, {});
  const locations = useQuery(api.locations.list, {});
  const suppliers = useQuery(api.suppliers.list, {});
  const materials = useQuery(api.materials.list, {});
  const create = useMutation(api.shelfItems.create);
  const update = useMutation(api.shelfItems.update);

  const [form, setForm] = useState(() =>
    editItem
      ? {
          prodCode: editItem.prodCode,
          description: editItem.description,
          unit: editItem.unit ?? "",
          categoryId: editItem.categoryId ?? "",
          location: editItem.location ?? "",
          qty: String(editItem.qty),
          supplier: editItem.supplier ?? "",
          brand: editItem.brand ?? "",
          recorded: editItem.recorded ?? "",
          dateRecorded: editItem.dateRecorded,
        }
      : { ...EMPTY_FORM, dateRecorded: new Date().toISOString().split("T")[0] }
  );
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleProdCodeBlur = () => {
    const match = materials?.find((m) => m.prodCode === form.prodCode);
    if (match) {
      setForm((f) => ({
        ...f,
        description: match.description,
        unit: match.unit ?? f.unit,
        categoryId: match.categoryId ?? f.categoryId,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!form.prodCode || !form.description) {
      toast.error("Prod code and description are required");
      return;
    }
    if (!form.dateRecorded) {
      toast.error("Date recorded is required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        prodCode: form.prodCode,
        description: form.description,
        unit: form.unit || undefined,
        categoryId: (form.categoryId as Id<"categories">) || undefined,
        location: form.location || undefined,
        qty: parseFloat(form.qty) || 0,
        supplier: form.supplier || undefined,
        brand: form.brand || undefined,
        recorded: form.recorded || undefined,
        dateRecorded: form.dateRecorded,
      };
      if (editItem) {
        await update({ id: editItem._id, ...payload });
        toast.success("Shelf item updated");
      } else {
        await create(payload);
        toast.success("Shelf item created");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save shelf item");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? "Edit Shelf Item" : "Add Shelf Item"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <Label>Prod Code *</Label>
            <Input
              value={form.prodCode}
              onChange={(e) => set("prodCode")(e.target.value)}
              onBlur={handleProdCodeBlur}
              placeholder="e.g. MAT-001"
            />
          </div>
          <div className="space-y-1">
            <Label>Unit</Label>
            <Input value={form.unit} onChange={(e) => set("unit")(e.target.value)} placeholder="e.g. pcs, kg" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Description *</Label>
            <Input value={form.description} onChange={(e) => set("description")(e.target.value)} placeholder="Item description" />
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
            <Select value={form.location || "none"} onValueChange={(v) => set("location")(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {locations?.map((l) => (
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
          <div className="space-y-1">
            <Label>Qty</Label>
            <Input type="number" min="0" value={form.qty} onChange={(e) => set("qty")(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Recorded By</Label>
            <Input value={form.recorded} onChange={(e) => set("recorded")(e.target.value)} placeholder="Name or ID" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Date Recorded *</Label>
            <Input type="date" value={form.dateRecorded} onChange={(e) => set("dateRecorded")(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
            {loading ? "Saving..." : editItem ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShelfItemsContent() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShelfItem | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"shelfItems"> | null>(null);

  const items = useQuery(api.shelfItems.list, { search: search || undefined });
  const categories = useQuery(api.categories.list, {});
  const remove = useMutation(api.shelfItems.remove);

  const getCategoryName = (id?: Id<"categories">) =>
    categories?.find((c) => c._id === id)?.name ?? "—";

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove({ id: deleteId });
      toast.success("Shelf item deleted");
    } catch {
      toast.error("Failed to delete");
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shelf Items</h1>
          <p className="text-muted-foreground text-sm">Manage components and items on shelves</p>
        </div>
        <Button
          className="cursor-pointer"
          onClick={() => { setEditItem(null); setFormOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Shelf Item
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by code, description, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {items === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Layers3 /></EmptyMedia>
            <EmptyTitle>No shelf items yet</EmptyTitle>
            <EmptyDescription>Add your first shelf item to get started</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" className="cursor-pointer" onClick={() => { setEditItem(null); setFormOpen(true); }}>
              Add Shelf Item
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Prod Code</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Description</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Unit</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Category</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Location</th>
                  <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Qty</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Supplier</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Brand</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Recorded</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Date Recorded</th>
                  <th className="px-3 py-3 text-center font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item._id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs font-medium whitespace-nowrap">{item.prodCode}</td>
                    <td className="px-3 py-2.5 max-w-[200px] truncate">{item.description}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{item.unit ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{getCategoryName(item.categoryId)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{item.location ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{item.qty}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{item.supplier ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{item.brand ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{item.recorded ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                      {item.dateRecorded
                        ? format(new Date(item.dateRecorded), "dd MMM yyyy")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditItem(item as ShelfItem); setFormOpen(true); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-destructive/10 cursor-pointer text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(item._id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <ShelfItemForm
          open={formOpen}
          onOpenChange={(v) => { setFormOpen(v); if (!v) setEditItem(null); }}
          editItem={editItem}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shelf Item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ShelfItemsPage() {
  return <ShelfItemsContent />;
}
