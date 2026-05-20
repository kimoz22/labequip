import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const stocks = await ctx.db.query("stocks").collect();
    const categories = await ctx.db.query("categories").collect();
    const catMap = new Map(categories.map((c) => [c._id, c.name]));
    return stocks.map((s) => ({
      ...s,
      categoryName: s.categoryId ? (catMap.get(s.categoryId) ?? null) : null,
    }));
  },
});

export const get = query({
  args: { id: v.id("stocks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    itemCode: v.string(),
    description: v.string(),
    materialId: v.optional(v.id("materials")),
    categoryId: v.optional(v.id("categories")),
    unit: v.optional(v.string()),
    openBal: v.number(),
    receiptQty: v.number(),
    transferQty: v.number(),
    location: v.optional(v.string()),
    remarks: v.optional(v.string()),
    supplier: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    recordedBy: v.optional(v.string()),
    dateRecorded: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const closeBal = args.openBal + args.receiptQty - args.transferQty;
    return await ctx.db.insert("stocks", { ...args, closeBal });
  },
});

export const update = mutation({
  args: {
    id: v.id("stocks"),
    itemCode: v.optional(v.string()),
    description: v.optional(v.string()),
    materialId: v.optional(v.id("materials")),
    categoryId: v.optional(v.id("categories")),
    unit: v.optional(v.string()),
    openBal: v.optional(v.number()),
    receiptQty: v.optional(v.number()),
    transferQty: v.optional(v.number()),
    location: v.optional(v.string()),
    remarks: v.optional(v.string()),
    supplier: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    recordedBy: v.optional(v.string()),
    dateRecorded: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ message: "Stock not found", code: "NOT_FOUND" });
    const openBal = fields.openBal ?? existing.openBal;
    const receiptQty = fields.receiptQty ?? existing.receiptQty;
    const transferQty = fields.transferQty ?? existing.transferQty;
    const closeBal = openBal + receiptQty - transferQty;
    await ctx.db.patch(id, { ...fields, closeBal });
  },
});

export const remove = mutation({
  args: { id: v.id("stocks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const transfer = mutation({
  args: {
    stockId: v.id("stocks"),
    transferType: v.union(v.literal("out"), v.literal("new_stock"), v.literal("receipt")),
    quantity: v.number(),
    fromLocation: v.optional(v.string()),
    toLocation: v.optional(v.string()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const stock = await ctx.db.get(args.stockId);
    if (!stock) throw new ConvexError({ message: "Stock not found", code: "NOT_FOUND" });

    let newReceiptQty = stock.receiptQty;
    let newTransferQty = stock.transferQty;

    if (args.transferType === "out") {
      newTransferQty += args.quantity;
    } else if (args.transferType === "receipt" || args.transferType === "new_stock") {
      newReceiptQty += args.quantity;
    }

    const newCloseBal = stock.openBal + newReceiptQty - newTransferQty;

    await ctx.db.patch(args.stockId, {
      receiptQty: newReceiptQty,
      transferQty: newTransferQty,
      closeBal: newCloseBal,
    });

    await ctx.db.insert("transfers", {
      stockId: args.stockId,
      itemCode: stock.itemCode,
      description: stock.description,
      transferType: args.transferType,
      quantity: args.quantity,
      fromLocation: args.fromLocation,
      toLocation: args.toLocation,
      remarks: args.remarks,
      transferredBy: "Unknown",
    });

    return newCloseBal;
  },
});

export const listTransfers = query({
  args: { stockId: v.optional(v.id("stocks")) },
  handler: async (ctx, args) => {
    if (args.stockId) {
      return await ctx.db
        .query("transfers")
        .withIndex("by_stockId", (q) => q.eq("stockId", args.stockId!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("transfers").order("desc").collect();
  },
});
