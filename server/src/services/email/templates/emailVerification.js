import { renderEmailLayout, renderIntro, renderTextFallback } from "../layout.js";
import { env } from "../../../config/env.js";

export const emailVerificationEmail = ({ firstName, token }) => {
  const heading = "Confirm your email address";
  const paragraphs = [
    `Hi ${firstName}, one last step — confirm this is your email address to fully activate your account.`,
    "This link expires in 24 hours. If you didn't create a Hathaway Strategic account, you can safely ignore this email.",
  ];
  const ctaLabel = "Verify Email Address";
  const ctaUrl = `${env.clientUrl}/login.html?verify=${encodeURIComponent(token)}`;

  return {
    subject: "Confirm your email address",
    html: renderEmailLayout({
      preheader: "Confirm your email to finish setting up your account.",
      bodyHtml: renderIntro({ eyebrow: "Verify Email", heading, paragraphs }),
      ctaLabel,
      ctaUrl,
    }),
    text: renderTextFallback({ heading, paragraphs, ctaLabel, ctaUrl }),
  };
};
