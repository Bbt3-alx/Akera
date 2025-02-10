import { Schema, model } from "mongoose";

const webhookSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  events: [
    {
      type: String,
      enum: ["operation.created", "operation.updated", "payment.received"],
    },
  ],
  secret: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const Webhook = model("Webhook", webhookSchema);
export default Webhook;
