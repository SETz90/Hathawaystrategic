import { env } from "../../config/env.js";

// Same palette as style.css :root — kept in sync manually since email
// clients can't read CSS variables from an external stylesheet.
const COLORS = {
  bgDark: "#060e1a",
  panel: "#0d131f",
  border: "rgba(255,255,255,.08)",
  gold: "#c59b27",
  textLight: "#ffffff",
  textMuted: "#8fa0b5",
};

/**
 * Wraps a block of inner HTML (already-built <tr> rows for the body) in the
 * branded email shell: dark background, gold wordmark, footer with a
 * manage-preferences link. Table-based layout on purpose — this needs to
 * render in Outlook/Gmail, not just modern browsers.
 *
 * @param {{ preheader?: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string }} opts
 */
export const renderEmailLayout = ({ preheader = "", bodyHtml, ctaLabel, ctaUrl }) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hathaway Strategic</title>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORS.bgDark}; font-family:'Inter',-apple-system,sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bgDark}; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding-bottom:32px; text-align:center;">
                <span style="font-family:Georgia,serif; font-size:22px; font-weight:700; letter-spacing:.04em; color:${COLORS.textLight};">HATHAWAY <span style="color:${COLORS.gold}; font-style:italic;">STRATEGIC</span></span>
              </td>
            </tr>
            <tr>
              <td style="background-color:${COLORS.panel}; border:1px solid ${COLORS.border}; border-radius:12px; padding:40px;">
                ${bodyHtml}
                ${ctaLabel && ctaUrl ? renderButton(ctaLabel, ctaUrl) : ""}
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px; text-align:center;">
                <p style="margin:0 0 8px; font-family:'Inter',-apple-system,sans-serif; font-size:12px; color:${COLORS.textMuted};">
                  Hathaway Strategic &middot; <a href="${env.clientUrl}" style="color:${COLORS.gold}; text-decoration:none;">hathawaystrategic.com</a>
                </p>
                <p style="margin:0; font-family:'Inter',-apple-system,sans-serif; font-size:12px; color:${COLORS.textMuted};">
                  <a href="${env.clientUrl}/client-dashboard.html#settings" style="color:${COLORS.textMuted}; text-decoration:underline;">Manage email preferences</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const renderButton = (label, url) => `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                  <tr>
                    <td style="border-radius:4px; background-color:${COLORS.gold};">
                      <a href="${url}" style="display:inline-block; padding:14px 28px; font-family:'Inter',-apple-system,sans-serif; font-size:13px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:${COLORS.bgDark}; text-decoration:none;">${escapeHtml(label)}</a>
                    </td>
                  </tr>
                </table>`;

/** A heading + paragraph(s) block, the most common body shape across templates. */
export const renderIntro = ({ eyebrow, heading, paragraphs = [] }) => `
                ${eyebrow ? `<span style="display:block; font-family:'Inter',-apple-system,sans-serif; font-size:11px; font-weight:800; letter-spacing:.2em; text-transform:uppercase; color:${COLORS.gold}; margin-bottom:12px;">${escapeHtml(eyebrow)}</span>` : ""}
                <h1 style="margin:0 0 16px; font-family:Georgia,serif; font-size:24px; font-weight:400; color:${COLORS.textLight}; line-height:1.3;">${escapeHtml(heading)}</h1>
                ${paragraphs
                  .map(
                    (p) =>
                      `<p style="margin:0 0 12px; font-family:'Inter',-apple-system,sans-serif; font-size:14px; line-height:1.7; color:${COLORS.textMuted};">${escapeHtml(p)}</p>`,
                  )
                  .join("")}`;

/** A simple key/value fact row used inside detail cards (status, priority, filename, etc). */
export const renderFactRow = (label, value) => `
                    <tr>
                      <td style="padding:8px 0; border-bottom:1px solid ${COLORS.border}; font-family:'Inter',-apple-system,sans-serif; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:${COLORS.textMuted};">${escapeHtml(label)}</td>
                      <td style="padding:8px 0; border-bottom:1px solid ${COLORS.border}; font-family:'Inter',-apple-system,sans-serif; font-size:14px; color:${COLORS.textLight}; text-align:right;">${escapeHtml(String(value))}</td>
                    </tr>`;

/** Wraps a set of renderFactRow() rows in a bordered mini-table. */
export const renderFactTable = (rowsHtml) => `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
                  ${rowsHtml}
                </table>`;

export function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Strips the wrapper down to a readable plain-text fallback from the same inputs used to build the HTML. */
export const renderTextFallback = ({ heading, paragraphs = [], facts = [], ctaLabel, ctaUrl }) =>
  [
    heading,
    "",
    ...paragraphs,
    ...(facts.length ? ["", ...facts.map(([label, value]) => `${label}: ${value}`)] : []),
    ...(ctaLabel && ctaUrl ? ["", `${ctaLabel}: ${ctaUrl}`] : []),
    "",
    "— Hathaway Strategic",
  ].join("\n");
