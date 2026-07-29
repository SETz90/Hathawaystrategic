import { renderEmailLayout, renderIntro, renderFactRow, renderFactTable, renderTextFallback } from "../layout.js";
import { env } from "../../../config/env.js";

const STATUS_LABELS = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};
const PRIORITY_LABELS = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

export const newProjectEmail = ({ firstName, projectName, status, priority }) => {
  const heading = "A new project has been set up for you";
  const paragraphs = [`Hi ${firstName}, "${projectName}" is now live on your dashboard.`];
  const facts = [
    ["Project", projectName],
    ["Status", STATUS_LABELS[status] || status],
    ["Priority", PRIORITY_LABELS[priority] || priority],
  ];
  const ctaLabel = "View Project";
  const ctaUrl = `${env.clientUrl}/client-dashboard.html#projects`;

  return {
    subject: `New Project: ${projectName}`,
    html: renderEmailLayout({
      preheader: `"${projectName}" has been created for you.`,
      bodyHtml:
        renderIntro({ eyebrow: "New Project", heading, paragraphs }) +
        renderFactTable(facts.map(([label, value]) => renderFactRow(label, value)).join("")),
      ctaLabel,
      ctaUrl,
    }),
    text: renderTextFallback({ heading, paragraphs, facts, ctaLabel, ctaUrl }),
  };
};
