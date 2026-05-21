import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
import { Plus, Search, Pencil, Trash2, ArrowLeftRight, Eye, PackagePlus, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { cn } from "@/lib/utils.ts";
import TransferDialog from "./_components/TransferDialog.tsx";
import StockFormDialog from "./_components/StockFormDialog.tsx";
import StockDetailDialog from "./_components/StockDetailDialog.tsx";
import NewStockDialog from "./_components/NewStockDialog.tsx";
import DamageStockDialog from "./_components/DamageStockDialog.tsx";

export default function StocksPage() {
  const stocks = useQuery(api.stocks.list, {});
  const { user } = useAuth();
  const removeStock = useMutation(api.stocks.remove);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<Id<"stocks"> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"stocks"> | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [newStockOpen, setNewStockOpen] = useState(false);
  const [damageStockOpen, setDamageStockOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"stocks"> | null>(null);

  const isAdmin = user?.role === "admin";

  const filtered = stocks?.filter((s) => {
    const q = search.toLowerCase();
    return s.itemCode.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  }) ?? [];

  const selectedStock = stocks?.find((s) => s._id === selectedId) ?? null;

  const handleDelete = async (id: Id<"stocks">) => {
    try {
      await removeStock({ id });
      toast.success("Stock deleted");
      if (selectedId === id) setSelectedId(null);
    } catch {
      toast.error("Failed to delete stock");
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stocks</h1>
          <p className="text-muted-foreground text-sm">Manage laboratory inventory</p>
        </div>
        <Button size="sm" onClick={() => { setEditId(null); setFormOpen(true); }} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-1" /> Add Stock
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by item code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={!selectedId}
          onClick={() => setTransferOpen(true)}
          className="cursor-pointer"
        >
          <ArrowLeftRight className="w-4 h-4 mr-1" /> Transfer
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!selectedId}
          onClick={() => setNewStockOpen(true)}
          className="cursor-pointer"
        >
          <PackagePlus className="w-4 h-4 mr-1" /> New Stock
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!selectedId}
          onClick={() => setDamageStockOpen(true)}
          className="cursor-pointer"
        >
          <ShieldAlert className="w-4 h-4 mr-1" /> Damage Stock
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Open Bal</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">NewStck</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Transfer</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">DmgStck</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Close Bal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Recorded By</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Date Recorded</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {stocks === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    {search ? "No stocks match your search." : "No stocks yet. Add your first stock entry."}
                  </td>
                </tr>
              ) : (
                filtered.map((stock) => (
                  <tr
                    key={stock._id}
                    onClick={() => setSelectedId(stock._id === selectedId ? null : stock._id)}
                    className={cn(
                      "border-b cursor-pointer hover:bg-muted/40 transition-colors",
                      selectedId === stock._id && "bg-primary/5 hover:bg-primary/10"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-primary">{stock.itemCode}</td>
                    <td className="px-4 py-3">{stock.description}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {stock.categoryName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">{stock.openBal}</td>
                    <td className="px-4 py-3 text-right text-chart-3">{stock.receiptQty}</td>
                    <td className="px-4 py-3 text-right text-destructive">{stock.transferQty}</td>
                    <td className="px-4 py-3 text-right text-orange-500">{stock.dmgQty ?? 0}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <Badge variant={stock.closeBal <= 5 ? "destructive" : "secondary"}>
                        {stock.closeBal}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{stock.unit ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">{stock.recordedBy ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell whitespace-nowrap">{stock.dateRecorded ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => { setSelectedId(stock._id); setDetailOpen(true); }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 cursor-pointer"
                              onClick={() => { setEditId(stock._id); setFormOpen(true); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive cursor-pointer"
                              onClick={() => setDeleteConfirm(stock._id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stock Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this stock entry? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="cursor-pointer">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="cursor-pointer">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StockFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editId={editId}
      />

      {selectedStock && (
        <TransferDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          stock={selectedStock}
        />
      )}

      {selectedStock && (
        <NewStockDialog
          open={newStockOpen}
          onOpenChange={setNewStockOpen}
          stock={selectedStock}
        />
      )}

      {selectedStock && (
        <DamageStockDialog
          open={damageStockOpen}
          onOpenChange={setDamageStockOpen}
          stock={selectedStock}
        />
      )}

      {selectedStock && (
        <StockDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          stock={selectedStock}
        />
      )}
    </div>
  );
}
