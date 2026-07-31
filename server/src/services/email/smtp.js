import SibApiV3Sdk from "sib-api-v3-sdk";
import { env } from "../../config/env.js";

let warnedOnce = false;

const isConfigured = () => {
  if (env.brevo.apiKey) return true;

  if (!warnedOnce) {
    console.warn("[email] BREVO_API_KEY not set — outgoing email is disabled.");
    warnedOnce = true;
  }

  return false;
};

// Configure Brevo API
const client = SibApiV3Sdk.ApiClient.instance;

client.authentications["api-key"].apiKey = env.brevo.apiKey;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  if (!to || !subject || !html) {
    console.error("[email] Missing required email fields.");
    return false;
  }

  if (!isConfigured()) return false;

  try {
    console.log("Sending email through Brevo API...");
    console.log("To:", to);
    console.log("From:", env.brevo.from);

    const senderName =
      env.brevo.from.match(/^(.*?)</)?.[1].trim() || "Hathaway Strategic";

    const senderEmail = env.brevo.from.match(/<(.+)>/)?.[1] || env.brevo.from;

    const result = await emailApi.sendTransacEmail({
      sender: {
        name: senderName,
        email: senderEmail,
      },

      to: [
        {
          email: to,
        },
      ],

      subject: subject,

      htmlContent: html,

      textContent: text,

      ...(replyTo
        ? {
            replyTo: {
              email: replyTo,
            },
          }
        : {}),
    });

    console.log("Brevo response:");
    console.log(result);

    return true;
  } catch (err) {
    console.error("BREVO ERROR");
    console.error(err.response?.body || err);

    return false;
  }
};
