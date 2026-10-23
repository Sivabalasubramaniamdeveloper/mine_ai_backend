import app from "./app.js";
import env from "./config/env.js";
import { initCronJobs } from "./services/cron.service.js";

initCronJobs();

app.listen(env.port, () => {
  console.log(`MineAI backend running on http://localhost:${env.port}`);
});
