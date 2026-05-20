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
import { ShieldAlert } from "lucide-react";

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
  })
    .format(new Date())
    .replace(", ", " ");
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

export default function DamageStockDialog({ open, onOpenChange, stock }: Props) {
  const addDamageStock = useMutation(api.stocks.addDamageStock);
  const locationsList = useQuery(api.locations.list, {});

  const [quantity, setQuantity] = useState("1");
  const [from, setFrom] = useState("");
  const [loading, setLoading] = useState(false);

  const qty = parseFloat(quantity) || 0;
  const newBal = stock.closeBal - qty;

  const handleSubmit = async () => {
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    setLoading(true);
    try {
      await addDamageStock({
        itemCode: stock.itemCode,
        description: stock.description,
        category: stock.categoryName ?? undefined,
        qty,
        from: from || undefined,
        dateCreated: getTanzaniaDateTime(),
      });

      toast.success(`Recorded ${qty} damaged ${stock.unit ?? "units"} for ${stock.itemCode}`);
      onOpenChange(false);
      setQuantity("1");
      setFrom("");
    } catch {
      toast.error("Failed to record damage stock");
    }
    setLoading(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setQuantity("1");
    setFrom("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            Record Damage Stock
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Stock info banner */}
          <div className="bg-muted/50 rounded-md px-4 py-3 text-sm space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{stock.description}</span>
              <span className="font-mono text-xs text-muted-foreground">{stock.itemCode}</span>
              {stock.categoryName && (
                <Badge variant="outline" className="text-xs py-0 h-4">
                  {stock.categoryName}
                </Badge>
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
                <span>
                  Location:{" "}
                  <span className="font-medium text-foreground">{stock.location}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <Label>Damaged Quantity *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
          </div>

          {/* From location */}
          <div className="space-y-1">
            <Label>From Location</Label>
            <Select
              value={from || "none"}
              onValueChange={(v) => setFrom(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {locationsList?.map((l) => (
                  <SelectItem key={l._id} value={l.locationName}>
                    {l.locationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {qty > 0 && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-md px-4 py-3 text-sm space-y-1">
              <div className="text-xs text-muted-foreground">After recording damage:</div>
              <div>
                New Balance:{" "}
                <span className="font-bold text-orange-500">
                  {newBal} {stock.unit ?? ""}
                </span>
                <span className="text-muted-foreground text-xs ml-2">
                  (−{qty} from current {stock.closeBal})
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || qty <= 0}
            className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white"
          >
            <ShieldAlert className="w-4 h-4 mr-1.5" />
            {loading ? "Recording..." : "Record Damage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
