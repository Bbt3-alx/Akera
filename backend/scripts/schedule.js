import schedule from "node-schedule";
import { hardDeleteExpiredRecords } from "./cleanupExpiredData.js";

// Run daily at 2 AM

schedule.scheduleJob("02***", async () => {
  console.log("Running data retention cleanup...");
  await hardDeleteExpiredRecords();
});
