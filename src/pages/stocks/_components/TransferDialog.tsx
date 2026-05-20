import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";

type Stock = {
  _id: Id<"stocks">;
  itemCode: string;
  description: string;
  closeBal: number;
  unit?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: Stock;
};

export default function TransferDialog({ open, onOpenChange, stock }: Props) {
  const transfer = useMutation(api.stocks.transfer);
  const deductShelfQty = useMutation(api.shelfItems.deductQty);

  // Load shelf items for this item code (for Transfer Out location dropdown)
  const shelfItems = useQuery(api.shelfItems.listByProdCode, { prodCode: stock.itemCode });

  const [form, setForm] = useState({
    transferType: "out" as "out" | "new_stock" | "receipt",
    quantity: "1",
    selectedShelfId: "",
    fromLocation: "",
    toLocation: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);

  const qty = parseFloat(form.quantity) || 0;
  const newBal =
    form.transferType === "out"
      ? stock.closeBal - qty
      : stock.closeBal + qty;

  // Selected shelf item for Transfer Out
  const selectedShelf = shelfItems?.find((s) => s._id === form.selectedShelfId) ?? null;
  const availableQty = selectedShelf?.qty ?? 0;
  const newShelfQty = availableQty - qty;

  const handleLocationSelect = (shelfId: string) => {
    const shelf = shelfItems?.find((s) => s._id === shelfId);
    setForm((f) => ({
      ...f,
      selectedShelfId: shelfId,
      fromLocation: shelf?.location ?? "",
    }));
  };

  const handleSubmit = async () => {
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (form.transferType === "out" && qty > stock.closeBal) {
      toast.error("Insufficient stock balance");
      return;
    }
    if (form.transferType === "out" && selectedShelf && qty > availableQty) {
      toast.error(`Insufficient shelf qty. Available: ${availableQty}`);
      return;
    }

    setLoading(true);
    try {
      // Record the transfer on the stock
      await transfer({
        stockId: stock._id,
        transferType: form.transferType,
        quantity: qty,
        fromLocation: form.fromLocation || undefined,
        toLocation: form.toLocation || undefined,
        remarks: form.remarks || undefined,
      });

      // For Transfer Out: deduct qty from the shelf item
      if (form.transferType === "out" && selectedShelf) {
        await deductShelfQty({
          id: selectedShelf._id,
          deductAmount: qty,
        });
      }

      toast.success("Transfer recorded successfully");
      onOpenChange(false);
      setForm({ transferType: "out", quantity: "1", selectedShelfId: "", fromLocation: "", toLocation: "", remarks: "" });
    } catch {
      toast.error("Failed to record transfer");
    }
    setLoading(false);
  };

  const isOut = form.transferType === "out";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inventory Transfer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-md px-4 py-3 text-sm space-y-1">
            <div className="font-medium">{stock.itemCode} — {stock.description}</div>
            <div className="text-muted-foreground">
              Current Balance:{" "}
              <span className="font-semibold text-foreground">{stock.closeBal} {stock.unit ?? ""}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Transfer Type</Label>
            <Select
              value={form.transferType}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  transferType: v as "out" | "new_stock" | "receipt",
                  selectedShelfId: "",
                  fromLocation: "",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="out">Transfer Out</SelectItem>
                <SelectItem value="receipt">Receipt (Incoming)</SelectItem>
                <SelectItem value="new_stock">New Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Out: Location dropdown from shelf items */}
          {isOut && (
            <div className="space-y-1">
              <Label>Select Location</Label>
              {shelfItems === undefined ? (
                <div className="text-xs text-muted-foreground">Loading locations...</div>
              ) : shelfItems.length === 0 ? (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                  No shelf locations found for this item code.
                </div>
              ) : (
                <Select
                  value={form.selectedShelfId || "none"}
                  onValueChange={(v) => handleLocationSelect(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Select location —</SelectItem>
                    {shelfItems.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.location ?? "No location"} (Qty: {s.qty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </div>

          {/* Available Qty read-only field for Transfer Out */}
          {isOut && selectedShelf && (
            <div className="space-y-1">
              <Label>Available Qty (at selected location)</Label>
              <Input
                value={availableQty}
                disabled
                className="bg-muted text-muted-foreground"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>From Location</Label>
              <Input
                value={form.fromLocation}
                onChange={(e) => setForm((f) => ({ ...f, fromLocation: e.target.value }))}
                placeholder={isOut ? "Auto-filled from selection" : "Optional"}
                readOnly={isOut && !!form.selectedShelfId}
                className={isOut && !!form.selectedShelfId ? "bg-muted text-muted-foreground" : ""}
              />
            </div>
            <div className="space-y-1">
              <Label>To Location</Label>
              <Input
                value={form.toLocation}
                onChange={(e) => setForm((f) => ({ ...f, toLocation: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Remarks</Label>
            <Input
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          {qty > 0 && (
            <div className="bg-primary/5 rounded-md px-4 py-3 text-sm space-y-1">
              <div>
                New Stock Balance:{" "}
                <span className={`font-bold ${newBal < 0 ? "text-destructive" : "text-foreground"}`}>
                  {newBal} {stock.unit ?? ""}
                </span>
              </div>
              {isOut && selectedShelf && (
                <div>
                  New Shelf Qty at <span className="font-medium">{selectedShelf.location}</span>:{" "}
                  <span className={`font-bold ${newShelfQty < 0 ? "text-destructive" : "text-foreground"}`}>
                    {newShelfQty}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
            {loading ? "Processing..." : "Confirm Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
