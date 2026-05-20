import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  }).index("by_token", ["tokenIdentifier"]),

  categories: defineTable({
    name: v.string(),
  }),

  suppliers: defineTable({
    name: v.string(),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    remarks: v.optional(v.string()),
  }).index("by_name", ["name"]),

  locations: defineTable({
    locationName: v.string(),
    remarks: v.optional(v.string()),
  }).index("by_locationName", ["locationName"]),

  materials: defineTable({
    prodCode: v.string(),
    description: v.string(),
    categoryId: v.optional(v.id("categories")),
    unit: v.optional(v.string()),
  }).index("by_prodCode", ["prodCode"]),


   stocks: defineTable({
    itemCode: v.string(),
    description: v.string(),
    materialId: v.optional(v.id("materials")),
    categoryId: v.optional(v.id("categories")),
    unit: v.optional(v.string()),
    openBal: v.number(),
    receiptQty: v.number(),
    transferQty: v.number(),
    dmgQty: v.optional(v.number()),
    closeBal: v.number(),
    location: v.optional(v.string()),
    remarks: v.optional(v.string()),
    supplier: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    recordedBy: v.optional(v.string()),
    dateRecorded: v.optional(v.string()),
  }).index("by_itemCode", ["itemCode"]),

  shelfItems: defineTable({
    prodCode: v.string(),
    description: v.string(),
    unit: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    location: v.optional(v.string()),
    qty: v.number(),
    supplier: v.optional(v.string()),
    brand: v.optional(v.string()),
    recorded: v.optional(v.string()),
    dateRecorded: v.string(),
  })
    .index("by_prodCode", ["prodCode"])
    .index("by_dateRecorded", ["dateRecorded"]),

  transfers: defineTable({
    stockId: v.id("stocks"),
    itemCode: v.string(),
    description: v.string(),
    transferType: v.union(v.literal("out"), v.literal("new_stock"), v.literal("receipt")),
    quantity: v.number(),
    fromLocation: v.optional(v.string()),
    toLocation: v.optional(v.string()),
    remarks: v.optional(v.string()),
    transferredBy: v.optional(v.string()),
    transferredByUserId: v.optional(v.id("users")),
  }).index("by_stockId", ["stockId"]),


  customers: defineTable({
    name: v.string(),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    remarks: v.optional(v.string()),
  }).index("by_name", ["name"]),


  deliveries: defineTable({
    deliveryNo: v.string(),
    itemCode: v.string(),
    description: v.string(),
    qty: v.number(),
    unit: v.optional(v.string()),
    location: v.optional(v.string()),
    customer: v.string(),
    date: v.string(),
    preparedBy: v.string(),
    remarks: v.optional(v.string()),
  })
    .index("by_deliveryNo", ["deliveryNo"])
    .index("by_date", ["date"]),


  stockHistory: defineTable({
    itemCode: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    qty: v.number(),
    location: v.optional(v.string()),
    remarks: v.optional(v.string()),
    dateRecorded: v.string(),
    recordedBy: v.string(),
  })
    .index("by_itemCode", ["itemCode"])
    .index("by_dateRecorded", ["dateRecorded"]),


    damageStock: defineTable({
    itemCode: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    qty: v.number(),
    from: v.optional(v.string()),
    dateCreated: v.string(),
    recordedBy: v.string(),
  })
    .index("by_itemCode", ["itemCode"])
    .index("by_dateCreated", ["dateCreated"]),

});

