import { renderEmailLayout, renderIntro, renderTextFallback } from "../layout.js";
import { env } from "../../../config/env.js";

export const welcomeEmail = ({ firstName }) => {
  const heading = `Welcome, ${firstName}.`;
  const paragraphs = [
    "Your Hathaway Strategic client account is ready. This is where you'll track project progress, review deliverables, and message our team directly.",
    "We'll email you whenever there's something new to look at — a status change, a file, a reply — so you never have to go looking for it.",
  ];
  const ctaLabel = "Go to Your Dashboard";
  const ctaUrl = `${env.clientUrl}/client-dashboard.html`;

  return {
    subject: "Welcome to Hathaway Strategic",
    html: renderEmailLayout({
      preheader: "Your client dashboard is ready.",
      bodyHtml: renderIntro({ eyebrow: "Welcome", heading, paragraphs }),
      ctaLabel,
      ctaUrl,
    }),
    text: renderTextFallback({ heading, paragraphs, ctaLabel, ctaUrl }),
  };
};
