import fs from "fs";
import path from "path";
import supabase from "../config/supabase.js";
import env from "../config/env.js";
import { sendMail } from "./email.service.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const LOCAL_TICKETS_FILE = path.join(DATA_DIR, "tickets.json");

function ensureLocalStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_TICKETS_FILE)) {
    fs.writeFileSync(LOCAL_TICKETS_FILE, JSON.stringify([]), "utf8");
  }
}

function readLocalTickets() {
  ensureLocalStore();
  try {
    const raw = fs.readFileSync(LOCAL_TICKETS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
}

function writeLocalTickets(tickets) {
  ensureLocalStore();
  fs.writeFileSync(LOCAL_TICKETS_FILE, JSON.stringify(tickets, null, 2), "utf8");
}

export const createTicket = async ({
  userId,
  userEmail,
  userName,
  module,
  category,
  priority,
  subject,
  description,
}) => {
  const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const ticketData = {
    id: ticketId,
    user_id: userId,
    user_email: userEmail || "user@mineai.app",
    user_name: userName || "User",
    module: (module || "general").toLowerCase(),
    category: (category || "bug").toLowerCase(),
    priority: (priority || "medium").toLowerCase(),
    subject: String(subject || "").trim(),
    description: String(description || "").trim(),
    status: "open",
    admin_notes: "Ticket received. The admin team has been notified and is investigating the issue.",
    created_at: now,
    updated_at: now,
  };

  // 1. Try Supabase
  try {
    await supabase.from("tickets").insert(ticketData);
  } catch (_) {
    // If table not set up yet in Supabase, local store guarantees zero disruption
  }

  // 2. Always persist to local store
  const localList = readLocalTickets();
  const existingIdx = localList.findIndex((t) => t.id === ticketId);
  if (existingIdx === -1) {
    localList.unshift(ticketData);
    writeLocalTickets(localList);
  }

  // 3. Notify Admin Team via Email
  try {
    const adminEmail = env.supportEmail || env.mailUser || "admin@mineai.app";
    const extraHtml = `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
        <p style="margin:4px 0;"><strong>User:</strong> ${ticketData.user_name} (${ticketData.user_email})</p>
        <p style="margin:4px 0;"><strong>Module:</strong> ${ticketData.module.toUpperCase()}</p>
        <p style="margin:4px 0;"><strong>Category:</strong> ${ticketData.category}</p>
        <p style="margin:4px 0;"><strong>Priority:</strong> <span style="color:${priority === "high" || priority === "urgent" ? "#dc2626" : "#2563eb"}">${ticketData.priority.toUpperCase()}</span></p>
        <div style="margin-top:12px;padding:12px;background:#ffffff;border-radius:8px;border:1px solid #cbd5e1;">
          <p style="margin:0 0 6px 0;font-weight:600;">Description:</p>
          <p style="margin:0;white-space:pre-wrap;">${description}</p>
        </div>
      </div>
    `;

    await sendMail({
      to: adminEmail,
      subject: `[MineAI Support Ticket ${ticketId}] Issue in ${ticketData.module}: ${subject}`,
      title: `New Support Issue Reported: ${subject}`,
      message: `A user reported an issue with module [${ticketData.module}].\n\nTicket ID: ${ticketId}\nPriority: ${ticketData.priority}\nUser: ${ticketData.user_email}`,
      extraHtml,
    });
  } catch (mailErr) {
    console.error("Failed to send admin notification email:", mailErr.message);
  }

  return ticketData;
};

export const getUserTickets = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (_) {}

  // Fallback to local store filtered by userId
  const localList = readLocalTickets();
  return localList
    .filter((t) => t.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const getTicketById = async (ticketId, userId) => {
  try {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .eq("user_id", userId)
      .single();

    if (!error && data) return data;
  } catch (_) {}

  const localList = readLocalTickets();
  return localList.find((t) => t.id === ticketId && t.user_id === userId) || null;
};
