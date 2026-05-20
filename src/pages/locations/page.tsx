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
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, MapPin } from "lucide-react";

const EMPTY = { locationName: "", remarks: "" };

export default function LocationsPage() {
  const locations = useQuery(api.locations.list, {});
  const createLocation = useMutation(api.locations.create);
  const updateLocation = useMutation(api.locations.update);
  const removeLocation = useMutation(api.locations.remove);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"locations"> | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"locations"> | null>(null);

  const filtered = locations?.filter((l) =>
    l.locationName.toLowerCase().includes(search.toLowerCase()) ||
    (l.remarks ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (l: NonNullable<typeof locations>[number]) => {
    setEditId(l._id);
    setForm({ locationName: l.locationName, remarks: l.remarks ?? "" });
    setFormOpen(true);
  };

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.locationName.trim()) {
      toast.error("Location name is required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        locationName: form.locationName.trim(),
        remarks: form.remarks || undefined,
      };
      if (editId) {
        await updateLocation({ id: editId, ...payload });
        toast.success("Location updated");
      } else {
        await createLocation(payload);
        toast.success("Location created");
      }
      setFormOpen(false);
    } catch {
      toast.error("Failed to save location");
    }
    setLoading(false);
  };

  const handleDelete = async (id: Id<"locations">) => {
    try {
      await removeLocation({ id });
      toast.success("Location deleted");
    } catch {
      toast.error("Failed to delete location");
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground text-sm">Manage storage and stock locations</p>
        </div>
        <Button size="sm" onClick={openCreate} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-1" /> Add Location
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search locations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Remarks</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {locations === undefined ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3"></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  {search ? "No locations match your search." : "No locations yet. Add your first location."}
                </td>
              </tr>
            ) : (
              filtered.map((loc, idx) => (
                <tr key={loc._id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">{loc.locationName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {loc.remarks ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer"
                        onClick={() => openEdit(loc)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive cursor-pointer"
                        onClick={() => setDeleteConfirm(loc._id)}
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
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Location Name *</Label>
              <Input
                value={form.locationName}
                onChange={(e) => set("locationName")(e.target.value)}
                placeholder="e.g. Warehouse A, Shelf B3"
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              />
            </div>
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) => set("remarks")(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
              {loading ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this location? This action cannot be undone.
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
