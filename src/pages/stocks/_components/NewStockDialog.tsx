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
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";

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

type Stock = {
  _id: Id<"stocks">;
  itemCode: string;
  description: string;
  closeBal: number;
  unit?: string;
  location?: string;
  categoryName?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: Stock;
};

export default function NewStockDialog({ open, onOpenChange, stock }: Props) {
  const addToOpenBal = useMutation(api.stocks.addToOpenBal);
  const addStockHistory = useMutation(api.stocks.addStockHistory);
  const shelfItems = useQuery(api.shelfItems.listByProdCode, { prodCode: stock.itemCode });

  const [quantity, setQuantity] = useState("1");
  const [toLocation, setToLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const qty = parseFloat(quantity) || 0;
  const newBal = stock.closeBal + qty;

  const handleSubmit = async () => {
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    setLoading(true);
    try {
      const dateRecorded = getTanzaniaDateTime();

      // Add qty to openBal in stocks table
      await addToOpenBal({
        stockId: stock._id,
        qty,
        toLocation: toLocation || undefined,
        remarks: remarks || undefined,
      });

      // Save to stockHistory table
      await addStockHistory({
        itemCode: stock.itemCode,
        description: stock.description,
        category: stock.categoryName ?? undefined,
        qty,
        location: toLocation || stock.location || undefined,
        remarks: remarks || undefined,
        dateRecorded,
      });

      toast.success(`Added ${qty} ${stock.unit ?? "units"} to ${stock.itemCode}`);
      onOpenChange(false);
      setQuantity("1");
      setToLocation("");
      setRemarks("");
    } catch {
      toast.error("Failed to add new stock");
    }
    setLoading(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setQuantity("1");
    setToLocation("");
    setRemarks("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-chart-2" />
            Add New Stock
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Stock info banner */}
          <div className="bg-muted/50 rounded-md px-4 py-3 text-sm space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{stock.description}</span>
              <span className="font-mono text-xs text-muted-foreground">{stock.itemCode}</span>
              {stock.categoryName && (
                <Badge variant="outline" className="text-xs py-0 h-4">{stock.categoryName}</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-xs">
              <span>
                Current Balance:{" "}
                <span className="font-semibold text-foreground">
                  {stock.closeBal} {stock.unit ?? ""}
                </span>
              </span>
              {stock.location && (
                <span>Location: <span className="font-medium text-foreground">{stock.location}</span></span>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <Label>Quantity to Add *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
          </div>

          {/* To Location */}
          <div className="space-y-1">
            <Label>Store To Location</Label>
            <Select
              value={toLocation || "none"}
              onValueChange={(v) => setToLocation(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {shelfItems === undefined ? (
                  <SelectItem value="loading" disabled>Loading locations...</SelectItem>
                ) : shelfItems.length === 0 ? (
                  <SelectItem value="empty" disabled>No shelf locations found for this item</SelectItem>
                ) : (
                  shelfItems.map((s) => (
                    <SelectItem key={s._id} value={s.location ?? s._id}>
                      <span>{s.location ?? "Unknown"}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        (current qty: {s.qty} {s.unit ?? ""})
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {shelfItems !== undefined && shelfItems.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No existing shelf locations — a new shelf entry will be created on save.
              </p>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <Label>Remarks</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Purchased from supplier, batch no..."
            />
          </div>

          {/* Preview */}
          {qty > 0 && (
            <div className="bg-chart-2/5 border border-chart-2/20 rounded-md px-4 py-3 text-sm space-y-1">
              <div className="text-xs text-muted-foreground">After this addition:</div>
              <div>
                New Balance:{" "}
                <span className="font-bold text-chart-2">
                  {newBal} {stock.unit ?? ""}
                </span>
                <span className="text-muted-foreground text-xs ml-2">
                  (+{qty} from current {stock.closeBal})
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || qty <= 0} className="cursor-pointer">
            <PackagePlus className="w-4 h-4 mr-1.5" />
            {loading ? "Adding..." : "Add Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
