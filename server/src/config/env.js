import "dotenv/config";

const required = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  cookieDomain:
    process.env.NODE_ENV === "production"
      ? process.env.COOKIE_DOMAIN
      : undefined,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  // Optional on purpose: browser push is an enhancement, not a hard
  // dependency. push.service.js checks these at send-time and no-ops
  // (with one startup warning) if either key is missing.
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:support@hathawaystrategic.com",
  },

  // Optional on purpose, same as VAPID above: smtp.js checks these at
  // send-time and no-ops (with one startup warning) if the credentials are
  // missing. In-app + push notifications keep working either way.
  brevo: {
    login: process.env.BREVO_SMTP_LOGIN || "",
    key: process.env.BREVO_SMTP_KEY || "",
    from: process.env.EMAIL_FROM || "Hathaway Strategic <notifications@hathawaystrategic.com>",
  },
};

export const isProd = env.nodeEnv === "production";
