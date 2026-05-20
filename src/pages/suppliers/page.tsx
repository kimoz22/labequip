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
import { Plus, Search, Pencil, Trash2, Phone, Mail, MapPin, User } from "lucide-react";

const EMPTY = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  remarks: "",
};

export default function SuppliersPage() {
  const suppliers = useQuery(api.suppliers.list, {});
  const createSupplier = useMutation(api.suppliers.create);
  const updateSupplier = useMutation(api.suppliers.update);
  const removeSupplier = useMutation(api.suppliers.remove);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"suppliers"> | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"suppliers"> | null>(null);

  const filtered = suppliers?.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson ?? "").toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.phone ?? "").toLowerCase().includes(q)
    );
  }) ?? [];

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (s: NonNullable<typeof suppliers>[number]) => {
    setEditId(s._id);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      remarks: s.remarks ?? "",
    });
    setFormOpen(true);
  };

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        remarks: form.remarks || undefined,
      };
      if (editId) {
        await updateSupplier({ id: editId, ...payload });
        toast.success("Supplier updated");
      } else {
        await createSupplier(payload);
        toast.success("Supplier created");
      }
      setFormOpen(false);
    } catch {
      toast.error("Failed to save supplier");
    }
    setLoading(false);
  };

  const handleDelete = async (id: Id<"suppliers">) => {
    try {
      await removeSupplier({ id });
      toast.success("Supplier deleted");
    } catch {
      toast.error("Failed to delete supplier");
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground text-sm">Manage supplier contacts and information</p>
        </div>
        <Button size="sm" onClick={openCreate} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-1" /> Add Supplier
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Contact Person</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Address</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers === undefined ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {search ? "No suppliers match your search." : "No suppliers yet. Add your first supplier."}
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr key={s._id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-primary">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {s.contactPerson ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {s.phone ? (
                        <a href={`tel:${s.phone}`} className="hover:text-foreground transition-colors">
                          {s.phone}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {s.email ? (
                        <a href={`mailto:${s.email}`} className="hover:text-foreground transition-colors">
                          {s.email}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                      {s.address ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive cursor-pointer"
                          onClick={() => setDeleteConfirm(s._id)}
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
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Supplier Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="e.g. ABC Supplies Co."
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Contact Person
              </Label>
              <Input
                value={form.contactPerson}
                onChange={(e) => set("contactPerson")(e.target.value)}
                placeholder="e.g. John Smith"
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder="e.g. +1 234 567 8900"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                placeholder="e.g. supplier@example.com"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Address
              </Label>
              <Input
                value={form.address}
                onChange={(e) => set("address")(e.target.value)}
                placeholder="e.g. 123 Main St, City, Country"
              />
            </div>
            <div className="col-span-2 space-y-1">
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
            <DialogTitle>Delete Supplier</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this supplier? This action cannot be undone.
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
