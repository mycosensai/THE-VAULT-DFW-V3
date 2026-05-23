import { authRouter } from "./auth-router";
import { localAuthRouter } from "./local-auth-router";
import { oauthRouter } from "./oauth-router";
import { listingsRouter } from "./listings-router";
import { categoriesRouter } from "./categories-router";
import { appraisalRouter } from "./appraisal-router";
import { stripeRouter } from "./stripe-router";
import { cartRouter } from "./cart-router";
import { agentRouter } from "./agent-router";
import { adminRouter } from "./admin-router";
import { blockchainRouter } from "./blockchain-router";
import { cryptoRouter } from "./crypto-router";
import { expertRouter } from "./expert-router";
import { outreachRouter } from "./outreach-router";
import { reviewsRouter } from "./reviews-router";
import { wishlistRouter } from "./wishlist-router";
import { ordersRouter } from "./orders-router";
import { newsletterRouter } from "./newsletter-router";
import { socialRouter } from "./social-router";
import { listingFeeRouter } from "./listing-fee-router";
import { shippingRouter } from "./shipping-router";
import { saleRouter } from "./sale-router";
import { emailRouter } from "./email-router";
import { partnershipRouter } from "./partnership-router";
import { agentWorkflowRouter } from "./agent-workflow-router";
import { samsonRouter } from "./samson-router";
import { internetResearchRouter } from "./internet-research-router";
import { autonomousRouter } from "./autonomous-router";
import { selfAuditRouter } from "./self-audit-router";
import { interAgentPoliceRouter } from "./inter-agent-police-router";
import { accountingRouter } from "./accounting-router";
import { dailyReportRouter } from "./daily-report-router";
import { userWorkflowRouter } from "./user-workflow-router";
import { adminPromptRouter } from "./admin-prompt-router";
import { coldEmailRouter } from "./cold-email-router";
import { graphWorkflowRouter } from "./graph-workflow-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  localAuth: localAuthRouter,
  oauth: oauthRouter,
  listings: listingsRouter,
  categories: categoriesRouter,
  appraisal: appraisalRouter,
  stripe: stripeRouter,
  cart: cartRouter,
  agent: agentRouter,
  admin: adminRouter,
  blockchain: blockchainRouter,
  crypto: cryptoRouter,
  expert: expertRouter,
  outreach: outreachRouter,
  reviews: reviewsRouter,
  wishlist: wishlistRouter,
  orders: ordersRouter,
  newsletter: newsletterRouter,
  social: socialRouter,
  listingFee: listingFeeRouter,
  shipping: shippingRouter,
  sale: saleRouter,
  email: emailRouter,
  partnership: partnershipRouter,
  workflow: agentWorkflowRouter,
  samson: samsonRouter,
  research: internetResearchRouter,
  autonomous: autonomousRouter,
  selfAudit: selfAuditRouter,
  police: interAgentPoliceRouter,
  accounting: accountingRouter,
  dailyReport: dailyReportRouter,
  userWorkflow: userWorkflowRouter,
  adminPrompt: adminPromptRouter,
  coldEmail: coldEmailRouter,
  graphWorkflow: graphWorkflowRouter,
});

export type AppRouter = typeof appRouter;
