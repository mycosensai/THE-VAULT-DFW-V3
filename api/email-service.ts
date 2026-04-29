/**
 * Email Service for Cloudflare Workers
 * Uses Resend REST API for reliable email delivery
 * Fallback to logging if Resend is not configured
 */

import { env } from "./lib/env";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = env.resendApiKey;

  if (!apiKey) {
    console.log("[Email] Resend not configured. Email would have been sent to:", payload.to);
    console.log("[Email] Subject:", payload.subject);
    return { success: false, error: "Resend API key not configured. Set RESEND_API_KEY secret." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: payload.from || "The Vault <noreply@thevaultdfw.win>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] Resend error:", err);
      return { success: false, error: err };
    }

    const data = await res.json();
    console.log("[Email] Sent successfully:", data.id);
    return { success: true, id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Send failed:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Build the appraisal result email HTML
 */
export function buildAppraisalEmail(
  itemName: string,
  estimatedValue: number,
  valueRangeLow: number,
  valueRangeHigh: number,
  confidence: string,
  conditionAssessment: string,
  marketAnalysis: string,
  commissionRate: string,
  commissionEstimate: number,
  paymentLink: string
): { html: string; text: string } {
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
body{font-family:Georgia,serif;background:#080808;color:#F5EED8;margin:0;padding:20px}
.container{max-width:600px;margin:0 auto;background:#161616;border:1px solid #C9A84C;padding:30px}
h1{color:#C9A84C;font-size:18px;letter-spacing:3px;text-transform:uppercase;text-align:center}
h2{color:#F5EED8;font-size:13px;margin-top:20px;letter-spacing:2px;text-transform:uppercase}
.value-box{background:linear-gradient(135deg,#C9A84C22,#8A6E2F22);border:1px solid #C9A84C40;padding:20px;text-align:center;margin:20px 0}
.value-amount{font-size:28px;font-weight:bold;color:#C9A84C;font-family:serif}
.value-label{font-size:10px;color:#8A6E2F;text-transform:uppercase;letter-spacing:2px}
.range{font-size:14px;color:#C8BC98;margin-top:8px}
.confidence{display:inline-block;padding:4px 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:12px}
.confidence.high{background:#1a3a1a;border:1px solid #4ade8040;color:#4ade80}
.confidence.medium{background:#3a3a1a;border:1px solid #fbbf2440;color:#fbbf24}
.confidence.low{background:#3a1a1a;border:1px solid #f8717140;color:#f87171}
.section{margin:16px 0;padding:12px;background:#1E1E1E;border:1px solid #C9A84C15}
.section-title{font-size:10px;color:#8A6E2F;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px}
.section-body{font-size:12px;color:#C8BC98;line-height:1.6}
.pay-button{display:block;text-align:center;padding:16px;background:linear-gradient(135deg,#C9A84C,#8A6E2F);color:#080808;text-decoration:none;font-weight:bold;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:24px 0}
.pay-button:hover{box-shadow:0 0 20px rgba(201,168,76,0.3)}
.disclaimer{font-size:10px;color:#8A6E2F;line-height:1.5;border-top:1px solid #C9A84C20;padding-top:16px;margin-top:24px}
</style>
</head>
<body>
<div class="container">
<h1>Your AI Appraisal Is Ready</h1>

<p style="text-align:center;font-size:12px;color:#C8BC98;margin-bottom:20px">${itemName}</p>

<div class="value-box">
  <div class="value-label">Estimated Value</div>
  <div class="value-amount">$${estimatedValue.toLocaleString()}</div>
  <div class="range">Typical range: $${valueRangeLow.toLocaleString()} — $${valueRangeHigh.toLocaleString()}</div>
  <div class="confidence ${confidence}">${confidence} Confidence</div>
</div>

<div class="section">
  <div class="section-title">Condition Assessment</div>
  <div class="section-body">${conditionAssessment}</div>
</div>

<div class="section">
  <div class="section-title">Market Analysis</div>
  <div class="section-body">${marketAnalysis}</div>
</div>

<div class="section">
  <div class="section-title">Commission Structure</div>
  <div class="section-body">
    Vault commission: <strong style="color:#C9A84C">${commissionRate}%</strong> ($${commissionEstimate.toLocaleString(undefined,{minimumFractionDigits:2})})<br>
    Your estimated net: <strong style="color:#4ade80">$${(estimatedValue - commissionEstimate).toLocaleString(undefined,{minimumFractionDigits:2})}</strong>
  </div>
</div>

<a href="${paymentLink}" class="pay-button">Pay $49.99 & Unlock Full Report + Expert Verification</a>

<div class="disclaimer">
  <strong>Important:</strong> This is an AI-generated estimate for informational purposes only. It is NOT a certified appraisal. The AI does not access live market data. For insurance, legal, or verified sale pricing, consult a licensed professional appraiser who can physically inspect your item.
</div>

<p style="font-size:10px;color:#8A6E2F;text-align:center;margin-top:16px">
  The Vault — Elite Collector Exchange<br>
  <a href="https://thevaultdfw.win" style="color:#C9A84C">thevaultdfw.win</a>
</p>
</div>
</body>
</html>`;

  const text = `THE VAULT — AI APPRAISAL RESULT
Item: ${itemName}

ESTIMATED VALUE: $${estimatedValue.toLocaleString()}
Typical Range: $${valueRangeLow.toLocaleString()} — $${valueRangeHigh.toLocaleString()}
Confidence: ${confidence.toUpperCase()}

CONDITION ASSESSMENT:
${conditionAssessment}

MARKET ANALYSIS:
${marketAnalysis}

COMMISSION: ${commissionRate}% ($${commissionEstimate.toLocaleString(undefined,{minimumFractionDigits:2})})
Your Net: $${(estimatedValue - commissionEstimate).toLocaleString(undefined,{minimumFractionDigits:2})}

UNLOCK FULL REPORT:
${paymentLink}

DISCLAIMER: This is an AI-generated estimate for informational purposes only. It is NOT a certified appraisal. For insurance, legal, or verified sale pricing, consult a licensed professional appraiser.

The Vault — thevaultdfw.win`;

  return { html, text };
}
