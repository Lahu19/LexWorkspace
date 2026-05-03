import mongoose, { Schema, type Document } from "mongoose";
import { randomUUID } from "crypto";

/* ─────────────────────────── Matter ─────────────────────────── */
export interface IMatter extends Document {
  _id: string;
  user_id: string;
  title: string;
  client: string | null;
  description: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const MatterSchema = new Schema<IMatter>(
  {
    _id: { type: String, default: () => randomUUID() },
    user_id: { type: String, required: true, default: "local-dev-user" },
    title: { type: String, required: true },
    client: { type: String, default: null },
    description: { type: String, default: null },
    status: { type: String, default: "open" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    _id: false, // We supply our own _id (UUID string)
  },
);

/* ─────────────────────────── Message ─────────────────────────── */
export interface IMessage extends Document {
  _id: string;
  matter_id: string;
  user_id: string;
  agent: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    _id: { type: String, default: () => randomUUID() },
    matter_id: { type: String, required: true },
    user_id: { type: String, required: true, default: "local-dev-user" },
    agent: { type: String, required: true },
    role: { type: String, required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    _id: false,
  },
);

/* ─────────────────────────── LegalDocument ─────────────────────────── */
export interface ILegalDocument extends Document {
  _id: string;
  matter_id: string;
  user_id: string;
  title: string;
  doc_type: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

const LegalDocumentSchema = new Schema<ILegalDocument>(
  {
    _id: { type: String, default: () => randomUUID() },
    matter_id: { type: String, required: true },
    user_id: { type: String, required: true, default: "local-dev-user" },
    title: { type: String, required: true },
    doc_type: { type: String, required: true, default: "drafting" },
    content: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    _id: false,
  },
);

/* ─────────────────── Helper: serialize _id → id ─────────────────── */
function toJSON(doc: unknown): unknown {
  if (!doc || typeof doc !== "object") return doc;
  const obj = doc as Record<string, unknown>;
  if ("_id" in obj) {
    obj["id"] = obj["_id"];
    delete obj["_id"];
  }
  delete obj["__v"];
  return obj;
}

// Apply toJSON transform to all schemas
[MatterSchema, MessageSchema, LegalDocumentSchema].forEach((s) => {
  s.set("toJSON", {
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret["id"] = ret["_id"];
      delete ret["_id"];
      delete ret["__v"];
      return ret;
    },
  });
});

export const Matter =
  mongoose.models["Matter"] ??
  mongoose.model<IMatter>("Matter", MatterSchema);

export const Message =
  mongoose.models["Message"] ??
  mongoose.model<IMessage>("Message", MessageSchema);

export const LegalDocument =
  mongoose.models["LegalDocument"] ??
  mongoose.model<ILegalDocument>("LegalDocument", LegalDocumentSchema);

export { toJSON };
