import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const saveDocument = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.optional(v.string()),
    documentId: v.optional(v.id("files")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    if (args.documentId) {
      // Update existing document
      await ctx.db.patch(args.documentId, {
        name: args.title,
        updatedAt: now,
        description: args.content.substring(0, 200) + (args.content.length > 200 ? '...' : ''),
      });
      return args.documentId;
    } else {
      // Create new document - we'll store the content as metadata since it's text
      const documentId = await ctx.db.insert("files", {
        userId,
        name: args.title,
        // storageId is optional for text documents, so we don't include it
        size: args.content.length,
        mimeType: "text/html",
        createdAt: now,
        updatedAt: now,
        description: args.content.substring(0, 200) + (args.content.length > 200 ? '...' : ''),
        tags: args.type ? [args.type] : [],
      });

      // Store the actual content in a separate table for documents
      await ctx.db.insert("documents", {
        fileId: documentId,
        userId,
        title: args.title,
        content: args.content,
        type: args.type || "document",
        createdAt: now,
        updatedAt: now,
      });

      return documentId;
    }
  },
});

export const getDocument = query({
  args: { documentId: v.id("files") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const file = await ctx.db.get(args.documentId);
    if (!file || file.userId !== userId) {
      return null;
    }

    // Get the document content
    const document = await ctx.db
      .query("documents")
      .withIndex("by_file", (q) => q.eq("fileId", args.documentId))
      .first();

    return {
      ...file,
      content: document?.content || "",
      type: document?.type || "document",
    };
  },
});

export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("mimeType"), "text/html"))
      .order("desc")
      .collect();

    return files;
  },
});

export const deleteDocument = mutation({
  args: { documentId: v.id("files") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const file = await ctx.db.get(args.documentId);
    if (!file || file.userId !== userId) {
      throw new Error("Document not found or not authorized");
    }

    // Delete the document content
    const document = await ctx.db
      .query("documents")
      .withIndex("by_file", (q) => q.eq("fileId", args.documentId))
      .first();

    if (document) {
      await ctx.db.delete(document._id);
    }

    // Delete the file record
    await ctx.db.delete(args.documentId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Helper to resolve a storage URL for previews/links (e.g., for images)
export const getStorageUrl = query({
  args: { fileId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    try {
      return await ctx.storage.getUrl(args.fileId);
    } catch (e) {
      return null;
    }
  },
});
