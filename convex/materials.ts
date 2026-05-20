import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materials").collect();
    const categories = await ctx.db.query("categories").collect();
    const catMap = new Map(categories.map((c) => [c._id, c.name]));
    return materials.map((m) => ({
      ...m,
      categoryName: m.categoryId ? (catMap.get(m.categoryId) ?? null) : null,
    }));
  },
});

export const getByCode = query({
  args: { prodCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("materials")
      .withIndex("by_prodCode", (q) => q.eq("prodCode", args.prodCode))
      .first();
  },
});

export const create = mutation({
  args: {
    prodCode: v.string(),
    description: v.string(),
    categoryId: v.optional(v.id("categories")),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("materials", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("materials"),
    prodCode: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const bulkCreate = mutation({
  args: {
    rows: v.array(v.object({
      prodCode: v.string(),
      description: v.string(),
      unit: v.optional(v.string()),
      categoryId: v.optional(v.id("categories")),
    })),
  },
  handler: async (ctx, args): Promise<{ inserted: number; skipped: number }> => {
    let inserted = 0;
    let skipped = 0;
    for (const row of args.rows) {
      const existing = await ctx.db
        .query("materials")
        .withIndex("by_prodCode", (q) => q.eq("prodCode", row.prodCode))
        .first();
      if (existing) {
        skipped++;
      } else {
        await ctx.db.insert("materials", row);
        inserted++;
      }
    }
    return { inserted, skipped };
  },
});

export const remove = mutation({
  args: { id: v.id("materials") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
