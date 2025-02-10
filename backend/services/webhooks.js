import axios from "axios";
import Webhook from "../models/webhook.js";

export const triggerWebhook = async (eventType, payload) => {
  const webhooks = await Webhook.find({
    events: eventType,
    company: payload.companyId,
  });

  webhooks.forEach(async (webhook) => {
    try {
      const signature = createSignature(webhook.secret, payload);

      await axios.post(webhook.url, payload, {
        headers: {
          "X-Signature": signature,
          "X-Event-Type": eventType,
        },
      });
    } catch (error) {
      console.error(`Webhook failed for ${webhook.url}:`, error);
    }
  });
};
