import { relations } from "drizzle-orm";
import { users, listings, categories, appraisals, cartItems, aiAgentLogs, blockchainCerts, cryptoPayments } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  listings: many(listings),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  seller: one(users, {
    fields: [listings.sellerId],
    references: [users.id],
  }),
  appraisal: one(appraisals, {
    fields: [listings.appraisalId],
    references: [appraisals.id],
  }),
  blockchainCert: one(blockchainCerts, {
    fields: [listings.certificationId],
    references: [blockchainCerts.id],
  }),
}));

export const appraisalsRelations = relations(appraisals, ({ one }) => ({
  user: one(users, {
    fields: [appraisals.userId],
    references: [users.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  listing: one(listings, {
    fields: [cartItems.listingId],
    references: [listings.id],
  }),
}));

export const aiAgentLogsRelations = relations(aiAgentLogs, ({ one }) => ({
  listing: one(listings, {
    fields: [aiAgentLogs.listingId],
    references: [listings.id],
  }),
}));

export const blockchainCertsRelations = relations(blockchainCerts, ({ one }) => ({
  listing: one(listings, {
    fields: [blockchainCerts.listingId],
    references: [listings.id],
  }),
}));

export const cryptoPaymentsRelations = relations(cryptoPayments, ({ one }) => ({
  listing: one(listings, {
    fields: [cryptoPayments.listingId],
    references: [listings.id],
  }),
}));
