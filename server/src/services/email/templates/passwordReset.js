import { renderEmailLayout, renderIntro, renderTextFallback } from "../layout.js";
import { env } from "../../../config/env.js";

export const passwordResetEmail = ({ firstName, token }) => {
  const heading = "Reset your password";
  const paragraphs = [
    `Hi ${firstName}, we received a request to reset your password. Click below to choose a new one.`,
    "This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.",
  ];
  const ctaLabel = "Reset Password";
  const ctaUrl = `${env.clientUrl}/forgot-password.html?token=${encodeURIComponent(token)}`;

  return {
    subject: "Reset your Hathaway Strategic password",
    html: renderEmailLayout({
      preheader: "Reset your password — this link expires in 1 hour.",
      bodyHtml: renderIntro({ eyebrow: "Password Reset", heading, paragraphs }),
      ctaLabel,
      ctaUrl,
    }),
    text: renderTextFallback({ heading, paragraphs, ctaLabel, ctaUrl }),
  };
};
