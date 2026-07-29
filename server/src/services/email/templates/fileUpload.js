import { renderEmailLayout, renderIntro, renderFactRow, renderFactTable, renderTextFallback } from "../layout.js";
import { env } from "../../../config/env.js";

export const fileUploadEmail = ({ firstName, projectName, filename, uploaderName, isAdminRecipient }) => {
  const heading = "A new file was uploaded";
  const paragraphs = [`Hi ${firstName}, ${uploaderName} uploaded a new file to "${projectName}".`];
  const facts = [
    ["Project", projectName],
    ["File", filename],
    ["Uploaded By", uploaderName],
  ];
  const ctaLabel = "Open Files";
  const ctaUrl = `${env.clientUrl}/${isAdminRecipient ? "admin-dashboard.html" : "client-dashboard.html"}#files`;

  return {
    subject: `New file: ${filename}`,
    html: renderEmailLayout({
      preheader: `${uploaderName} uploaded ${filename} to ${projectName}.`,
      bodyHtml:
        renderIntro({ eyebrow: "File Uploaded", heading, paragraphs }) +
        renderFactTable(facts.map(([label, value]) => renderFactRow(label, value)).join("")),
      ctaLabel,
      ctaUrl,
    }),
    text: renderTextFallback({ heading, paragraphs, facts, ctaLabel, ctaUrl }),
  };
};
