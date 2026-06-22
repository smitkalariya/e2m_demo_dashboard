import type { Customer, CustomerListQuery } from "@/features/customers/types";
import type { Interaction, InteractionListQuery } from "@/features/interactions/types";
import type { AIInsight } from "@/features/ai-insights/types";
import type { PaginatedResponse } from "@/types/api";
import { SEED_AI_INSIGHTS, SEED_CUSTOMERS, SEED_INTERACTIONS } from "./data";

interface MockDb {
  customers: Customer[];
  interactions: Interaction[];
  insights: Record<string, AIInsight>;
}

const STORAGE_KEY = "e2m_mock_db_v1";

function cloneSeed(): MockDb {
  return {
    customers: structuredClone(SEED_CUSTOMERS),
    interactions: structuredClone(SEED_INTERACTIONS),
    insights: structuredClone(SEED_AI_INSIGHTS),
  };
}

let db: MockDb | null = null;

function readFromStorage(): MockDb | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MockDb) : null;
  } catch {
    return null;
  }
}

function persist(next: MockDb): void {
  db = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (e.g. private browsing quota) — demo continues in-memory only.
  }
}

function getDb(): MockDb {
  if (!db) {
    db = readFromStorage() ?? cloneSeed();
  }
  return db;
}

export function resetMockData(): void {
  persist(cloneSeed());
}

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

// ---- Customers ----------------------------------------------------------

export function listCustomers(query: CustomerListQuery): PaginatedResponse<Customer> {
  const { customers } = getDb();
  const search = query.search?.trim().toLowerCase();
  const sortBy = query.sort_by ?? "created_at";
  const sortOrder = query.sort_order ?? "desc";

  let filtered = customers.filter((c) => {
    if (query.status && c.status !== query.status) return false;
    if (search) {
      const haystack = `${c.company_name} ${c.contact_name} ${c.email}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    const av = a[sortBy as keyof Customer] ?? "";
    const bv = b[sortBy as keyof Customer] ?? "";
    const cmp = String(av).localeCompare(String(bv));
    return sortOrder === "asc" ? cmp : -cmp;
  });

  return paginate(filtered, query.page ?? 1, query.page_size ?? 20);
}

export function getCustomer(id: string): Customer | undefined {
  return getDb().customers.find((c) => c.id === id);
}

export function createCustomer(payload: Omit<Customer, "id" | "created_by_id" | "created_at" | "updated_at">): Customer {
  const current = getDb();
  const now = new Date().toISOString();
  const created: Customer = {
    ...payload,
    id: `cust-${crypto.randomUUID()}`,
    created_by_id: "mock-user-1",
    created_at: now,
    updated_at: now,
  };
  persist({ ...current, customers: [created, ...current.customers] });
  return created;
}

export function updateCustomer(id: string, payload: Partial<Customer>): Customer {
  const current = getDb();
  let updated: Customer | undefined;
  const customers = current.customers.map((c) => {
    if (c.id !== id) return c;
    updated = { ...c, ...payload, updated_at: new Date().toISOString() };
    return updated;
  });
  if (!updated) throw new Error("Customer not found");
  persist({ ...current, customers });
  return updated;
}

export function deleteCustomer(id: string): void {
  const current = getDb();
  persist({
    ...current,
    customers: current.customers.filter((c) => c.id !== id),
    interactions: current.interactions.filter((i) => i.customer_id !== id),
  });
}

// ---- Interactions ---------------------------------------------------------

export function listInteractions(query: InteractionListQuery): PaginatedResponse<Interaction> {
  const { interactions } = getDb();
  const sortBy = query.sort_by ?? "meeting_date";
  const sortOrder = query.sort_order ?? "desc";

  let filtered = interactions.filter((i) => {
    if (query.customer_id && i.customer_id !== query.customer_id) return false;
    if (query.date_from && i.meeting_date < query.date_from) return false;
    if (query.date_to && i.meeting_date > query.date_to) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    const cmp = a[sortBy].localeCompare(b[sortBy]);
    return sortOrder === "asc" ? cmp : -cmp;
  });

  return paginate(filtered, query.page ?? 1, query.page_size ?? 20);
}

export function getInteraction(id: string): Interaction | undefined {
  return getDb().interactions.find((i) => i.id === id);
}

export function getInsight(interactionId: string): AIInsight | null {
  return getDb().insights[interactionId] ?? null;
}

export function createInteraction(
  customerId: string,
  payload: { title: string; notes: string; meeting_date: string }
): Interaction {
  const current = getDb();
  const now = new Date().toISOString();
  const id = `int-${crypto.randomUUID()}`;
  const created: Interaction = {
    id,
    customer_id: customerId,
    title: payload.title,
    notes: payload.notes,
    meeting_date: payload.meeting_date,
    created_by_id: "mock-user-1",
    created_at: now,
    updated_at: now,
  };
  const insight: AIInsight = generateInsight(id, payload.notes);
  persist({
    ...current,
    interactions: [created, ...current.interactions],
    insights: { ...current.insights, [id]: insight },
  });
  return created;
}

export function updateInteraction(id: string, payload: Partial<Pick<Interaction, "title" | "notes" | "meeting_date">>): Interaction {
  const current = getDb();
  let updated: Interaction | undefined;
  const interactions = current.interactions.map((i) => {
    if (i.id !== id) return i;
    updated = { ...i, ...payload, updated_at: new Date().toISOString() };
    return updated;
  });
  if (!updated) throw new Error("Interaction not found");
  persist({ ...current, interactions });
  return updated;
}

export function regenerateInsight(interactionId: string): AIInsight {
  const current = getDb();
  const interaction = current.interactions.find((i) => i.id === interactionId);
  const insight = generateInsight(interactionId, interaction?.notes ?? "");
  persist({ ...current, insights: { ...current.insights, [interactionId]: insight } });
  return insight;
}

const SENTIMENT_WORDS: { word: string; sentiment: "positive" | "negative" }[] = [
  { word: "happy", sentiment: "positive" },
  { word: "great", sentiment: "positive" },
  { word: "thrilled", sentiment: "positive" },
  { word: "expand", sentiment: "positive" },
  { word: "frustrat", sentiment: "negative" },
  { word: "churn", sentiment: "negative" },
  { word: "cancel", sentiment: "negative" },
  { word: "unhappy", sentiment: "negative" },
  { word: "risk", sentiment: "negative" },
];

function generateInsight(interactionId: string, notes: string): AIInsight {
  const lower = notes.toLowerCase();
  const hit = SENTIMENT_WORDS.find(({ word }) => lower.includes(word));
  const sentiment = hit?.sentiment ?? "neutral";
  const now = new Date().toISOString();
  return {
    id: `insight-${interactionId}`,
    interaction_id: interactionId,
    status: "completed",
    sentiment,
    summary: notes.length > 140 ? `${notes.slice(0, 137)}...` : notes || "No notes provided for this meeting.",
    action_items: ["Follow up within one week", "Share meeting notes with the account team"],
    risks: sentiment === "negative" ? ["Customer sentiment trending negative — flag to account owner"] : [],
    error_message: null,
    created_at: now,
    updated_at: now,
  };
}

// ---- Dashboard --------------------------------------------------------------

export function getDashboardMetrics() {
  const { customers, interactions, insights } = getDb();
  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
  for (const insight of Object.values(insights)) {
    if (insight.status === "completed" && insight.sentiment) {
      sentimentBreakdown[insight.sentiment] += 1;
    }
  }

  const recent = [...interactions]
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date))
    .slice(0, 5)
    .map((interaction) => {
      const customer = customers.find((c) => c.id === interaction.customer_id);
      return {
        id: interaction.id,
        title: interaction.title,
        customer_id: interaction.customer_id,
        company_name: customer?.company_name ?? "Unknown customer",
        meeting_date: interaction.meeting_date,
      };
    });

  return {
    total_customers: customers.length,
    total_interactions: interactions.length,
    sentiment_breakdown: sentimentBreakdown,
    recent_interactions: recent,
  };
}
