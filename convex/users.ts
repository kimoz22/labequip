import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { hashSync, compareSync } from "bcryptjs";

type AuthUser = {
  _id: Id<"users"> | string;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "inactive";
};

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name,
        email: identity.email,
      });
      return existing._id;
    }
    // First user becomes admin
    const allUsers = await ctx.db.query("users").take(1);
    const role = allUsers.length === 0 ? "admin" : "user";
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name,
      email: identity.email,
      role: role as "admin" | "user",
      status: "active",
    });
  },
});

function sanitizeUser(user: {
  _id: Id<"users">;
  name?: string;
  email?: string;
  role?: "admin" | "user";
  status?: "active" | "inactive";
}) {
  return {
    _id: user._id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "user",
    status: user.status || "active",
  };
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    return existing ? sanitizeUser(existing) : null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return (await ctx.db.query("users").collect()).map(sanitizeUser);
  },
});

export const authenticate: ReturnType<typeof mutation> = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<AuthUser> => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", normalizedEmail))
      .unique();

    if (existing) {
      let passwordValid = false;
      if (existing.password) {
        try {
          passwordValid = compareSync(args.password, existing.password);
        } catch {
          // Password might be plain text, check equality
          passwordValid = existing.password === args.password;
          if (passwordValid) {
            // Migrate to hashed password
            const hashed = hashSync(args.password, 10);
            await ctx.db.patch(existing._id, { password: hashed });
          }
        }
      }
      if (!passwordValid) {
        throw new Error("Invalid credentials.");
      }

      if (existing.status !== "active") {
        throw new Error("User is inactive.");
      }

      return sanitizeUser(existing);
    }

    const anyUser = await ctx.db.query("users").take(1);
    if (anyUser.length === 0) {
      const hashedPassword = hashSync(args.password, 10);
      const userId = await ctx.db.insert("users", {
        tokenIdentifier: normalizedEmail,
        name: normalizedEmail,
        email: normalizedEmail,
        password: hashedPassword,
        role: "admin",
        status: "active",
      });
      return {
        _id: userId,
        name: normalizedEmail,
        email: normalizedEmail,
        role: "admin",
        status: "active",
      };
    }

    throw new Error("Invalid credentials.");
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", normalizedEmail))
      .unique();
    if (existing) {
      throw new Error("A user with this email already exists.");
    }
    const hashedPassword: string = hashSync(args.password, 10);
    return await ctx.db.insert("users", {
      tokenIdentifier: normalizedEmail,
      name: args.name,
      email: normalizedEmail,
      password: hashedPassword,
      role: args.role,
      status: args.status,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const { id, password, ...fields } = args;
    const patchedFields: Record<string, unknown> = {};

    if (fields.name !== undefined) {
      patchedFields.name = fields.name;
    }

    if (fields.email !== undefined) {
      const normalizedEmail = fields.email.trim().toLowerCase();
      const existing = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", normalizedEmail))
        .unique();
      if (existing && existing._id !== id) {
        throw new Error("A user with this email already exists.");
      }
      patchedFields.email = normalizedEmail;
      patchedFields.tokenIdentifier = normalizedEmail;
    }

    if (fields.role !== undefined) {
      patchedFields.role = fields.role;
    }

    if (fields.status !== undefined) {
      patchedFields.status = fields.status;
    }

    if (password !== undefined) {
      patchedFields.password = hashSync(password, 10);
    }

    await ctx.db.patch(id, patchedFields);
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const removeAll = mutation({
  args: { 
    confirm: v.string(),
    adminEmail: v.string() 
  },
  handler: async (ctx, args) => {
    // Safety check: require confirmation text and admin email verification
    if (args.confirm !== "DELETE_ALL_USERS") {
      throw new Error("Confirmation text does not match. Please type 'DELETE_ALL_USERS' to confirm.");
    }

    // Verify admin status
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required.");
    }

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Admin privileges required.");
    }

    if (adminUser.email !== args.adminEmail) {
      throw new Error("Admin email verification failed.");
    }

    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    
    // Delete all users except the current admin
    const usersToDelete = allUsers.filter(user => user._id !== adminUser._id);
    
    // Delete users in batches to avoid timeouts
    for (const user of usersToDelete) {
      await ctx.db.delete(user._id);
    }

    return {
      deletedCount: usersToDelete.length,
      message: `Successfully deleted ${usersToDelete.length} user accounts.`
    };
  },
});

export const sendPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", normalizedEmail))
      .unique();

    if (!user) {
      throw new Error("No account found with this email address.");
    }

    if (!user.password) {
      throw new Error("This account was created through OAuth and has no password set.");
    }

    // In a real application, you would send an email here
    // For now, we'll just return a success message
    // You would integrate with an email service like SendGrid, Mailgun, etc.
    
    console.log(`Password reset requested for ${normalizedEmail}. Password: ${user.password}`);
    
    // TODO: Integrate with email service to send the password
    // Example with a hypothetical email service:
    // await sendEmail({
    //   to: normalizedEmail,
    //   subject: "Your LabStock Password",
    //   body: `Your password is: ${user.password}`
    // });

    return {
      message: "If an account with this email exists, your password has been sent to your email address."
    };
  },
});
