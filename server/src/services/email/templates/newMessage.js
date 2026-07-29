import { renderEmailLayout, renderIntro, renderTextFallback } from "../layout.js";
import { env } from "../../../config/env.js";

export const newMessageEmail = ({ firstName, senderName, projectName, preview, isAdminRecipient }) => {
  const heading = "You have a new message";
  const paragraphs = [
    `Hi ${firstName}, ${senderName} sent a message about "${projectName}":`,
    `"${preview}"`,
  ];
  const ctaLabel = "Open Conversation";
  const ctaUrl = `${env.clientUrl}/${isAdminRecipient ? "admin-dashboard.html" : "client-dashboard.html"}#messages`;

  return {
    subject: `New message from ${senderName}`,
    html: renderEmailLayout({
      preheader: `${senderName}: ${preview}`,
      bodyHtml: renderIntro({ eyebrow: "New Message", heading, paragraphs }),
      ctaLabel,
      ctaUrl,
    }),
    text: renderTextFallback({ heading, paragraphs, ctaLabel, ctaUrl }),
  };
};
