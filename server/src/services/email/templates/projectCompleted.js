import { renderEmailLayout, renderIntro, renderTextFallback } from "../layout.js";
import { env } from "../../../config/env.js";

export const projectCompletedEmail = ({ firstName, projectName }) => {
  const heading = "Your project is complete";
  const paragraphs = [
    `Congratulations, ${firstName} — "${projectName}" is finished.`,
    "All deliverables are ready to review on your dashboard. Thank you for working with us.",
  ];
  const ctaLabel = "View Deliverables";
  const ctaUrl = `${env.clientUrl}/client-dashboard.html#projects`;

  return {
    subject: `Completed: ${projectName}`,
    html: renderEmailLayout({
      preheader: `"${projectName}" is complete — take a look at the deliverables.`,
      bodyHtml: renderIntro({ eyebrow: "Project Completed", heading, paragraphs }),
      ctaLabel,
      ctaUrl,
    }),
    text: renderTextFallback({ heading, paragraphs, ctaLabel, ctaUrl }),
  };
};
