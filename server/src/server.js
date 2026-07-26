import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(
    `Hathaway Strategic API running on port ${env.port} [${env.nodeEnv}]`,
  );
});
