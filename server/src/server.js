import app from "./app.js";
import { env } from "./config/env.js";
import { createDefaultAdmin } from "./scripts/createAdmin.js";

try {
  await createDefaultAdmin();
} catch (error) {
  console.error("Failed to create default admin:", error);
}

app.listen(env.port, () => {
  console.log(
    `Hathaway Strategic API running on port ${env.port} [${env.nodeEnv}]`,
  );
});
