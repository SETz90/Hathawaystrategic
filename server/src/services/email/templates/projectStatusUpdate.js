import { renderEmailLayout, renderIntro, renderFactRow, renderFactTable, renderTextFallback } from "../layout.js";
import { env } from "../../../config/env.js";

const STATUS_LABELS = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

export const projectStatusUpdateEmail = ({ firstName, projectName, oldStatus, newStatus, progress }) => {
  const heading = "Your project status has changed";
  const paragraphs = [`Hi ${firstName}, "${projectName}" has moved forward.`];
  const facts = [
    ["Previous Status", STATUS_LABELS[oldStatus] || oldStatus],
    ["New Status", STATUS_LABELS[newStatus] || newStatus],
    ["Progress", `${progress}%`],
  ];
  const ctaLabel = "View Project";
  const ctaUrl = `${env.clientUrl}/client-dashboard.html#projects`;

  return {
    subject: `Project Update: ${projectName}`,
    html: renderEmailLayout({
      preheader: `"${projectName}" is now ${STATUS_LABELS[newStatus] || newStatus}.`,
      bodyHtml:
        renderIntro({ eyebrow: "Project Update", heading, paragraphs }) +
        renderFactTable(facts.map(([label, value]) => renderFactRow(label, value)).join("")),
      ctaLabel,
      ctaUrl,
    }),
    text: renderTextFallback({ heading, paragraphs, facts, ctaLabel, ctaUrl }),
  };
};
