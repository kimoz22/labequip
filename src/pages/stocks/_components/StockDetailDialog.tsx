import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format } from "date-fns";

type Stock = {
  _id: Id<"stocks">;
  itemCode: string;
  description: string;
  openBal: number;
  receiptQty: number;
  transferQty: number;
  closeBal: number;
  unit?: string;
  location?: string;
  remarks?: string;
  categoryName?: string | null;
  supplier?: string;
  brand?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: Stock;
};

export default function StockDetailDialog({ open, onOpenChange, stock }: Props) {
  const transfers = useQuery(api.stocks.listTransfers, open ? { stockId: stock._id } : "skip");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Stock Detail — {stock.itemCode}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Description</div>
              <div className="font-medium">{stock.description}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Category</div>
              <div>{stock.categoryName ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Location</div>
              <div>{stock.location ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Unit</div>
              <div>{stock.unit ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Supplier</div>
              <div>{stock.supplier ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Brand</div>
              <div>{stock.brand ?? "—"}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            {[
              { label: "Open Bal", value: stock.openBal, color: "" },
              { label: "Receipt", value: stock.receiptQty, color: "text-chart-3" },
              { label: "Transfer", value: stock.transferQty, color: "text-destructive" },
              { label: "Close Bal", value: stock.closeBal, color: "font-bold" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-muted/50 rounded-md py-2 px-1">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className={`text-lg font-semibold ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {stock.remarks && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
              {stock.remarks}
            </div>
          )}

          <div>
            <div className="text-sm font-medium mb-2">Transfer History</div>
            {transfers === undefined ? (
              <div className="space-y-1">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : transfers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No transfers yet.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y border rounded-md">
                {transfers.map((t) => (
                  <div key={t._id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <Badge variant={t.transferType === "out" ? "destructive" : "secondary"} className="text-xs">
                        {t.transferType.replace("_", " ")}
                      </Badge>
                      {t.remarks && <span className="ml-2 text-muted-foreground text-xs">{t.remarks}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${t.transferType === "out" ? "text-destructive" : "text-chart-3"}`}>
                        {t.transferType === "out" ? "-" : "+"}{t.quantity}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(t._creationTime), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
