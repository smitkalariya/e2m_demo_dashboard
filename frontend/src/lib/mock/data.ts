import type { Customer, CustomerStatus } from "@/features/customers/types";
import type { Interaction } from "@/features/interactions/types";
import type { AIInsight, Sentiment } from "@/features/ai-insights/types";

function daysAgoIso(days: number, hour = 14): string {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

const ADMIN_ID = "mock-user-1";

function customer(
  id: string,
  company_name: string,
  contact_name: string,
  email: string,
  phone: string | null,
  status: CustomerStatus,
  createdDaysAgo: number
): Customer {
  return {
    id,
    company_name,
    contact_name,
    email,
    phone,
    status,
    created_by_id: ADMIN_ID,
    created_at: daysAgoIso(createdDaysAgo),
    updated_at: daysAgoIso(Math.max(createdDaysAgo - 5, 0)),
  };
}

export const SEED_CUSTOMERS: Customer[] = [
  customer("cust-1", "Acme Corporation", "Jane Cooper", "jane.cooper@acme.test", "+1-555-0101", "active", 120),
  customer("cust-2", "Globex Industries", "Devon Lane", "devon.lane@globex.test", "+1-555-0102", "active", 95),
  customer("cust-3", "Initech Solutions", "Cameron Wells", "cameron.wells@initech.test", "+1-555-0103", "prospect", 30),
  customer("cust-4", "Umbrella Holdings", "Jordan Blake", "jordan.blake@umbrella.test", "+1-555-0104", "churned", 200),
  customer("cust-5", "Soylent Corp", "Taylor Reed", "taylor.reed@soylent.test", "+1-555-0105", "inactive", 150),
  customer("cust-6", "Stark Enterprises", "Avery Stone", "avery.stone@stark.test", "+1-555-0106", "active", 60),
  customer("cust-7", "Wayne Technologies", "Riley Fox", "riley.fox@wayne.test", "+1-555-0107", "prospect", 10),
  customer("cust-8", "Wonka Industries", "Morgan Hale", "morgan.hale@wonka.test", "+1-555-0108", "active", 80),
];

interface SeedInteractionInput {
  id: string;
  customer_id: string;
  title: string;
  notes: string;
  daysAgo: number;
  insight: {
    status: "completed" | "pending" | "failed";
    sentiment?: Sentiment;
    summary?: string;
    action_items?: string[];
    risks?: string[];
    error_message?: string;
  };
}

const SEED_INTERACTION_INPUTS: SeedInteractionInput[] = [
  {
    id: "int-1",
    customer_id: "cust-1",
    title: "Quarterly business review",
    notes:
      "Walked through Q3 usage metrics. Customer is happy with the rollout and wants to expand seats next quarter.",
    daysAgo: 4,
    insight: {
      status: "completed",
      sentiment: "positive",
      summary: "Acme is satisfied with the rollout and plans to expand seats next quarter.",
      action_items: ["Send expansion quote for 50 additional seats", "Schedule follow-up in 30 days"],
      risks: [],
    },
  },
  {
    id: "int-2",
    customer_id: "cust-1",
    title: "Onboarding kickoff",
    notes: "Kicked off onboarding with the IT team. They flagged SSO configuration as a blocker for go-live.",
    daysAgo: 25,
    insight: {
      status: "completed",
      sentiment: "neutral",
      summary: "Onboarding started; SSO configuration is pending and blocking go-live.",
      action_items: ["Share SSO setup guide", "Pair with their IT admin on SAML config"],
      risks: ["Go-live date at risk if SSO isn't resolved this week"],
    },
  },
  {
    id: "int-3",
    customer_id: "cust-2",
    title: "Renewal negotiation",
    notes: "Customer pushed back hard on the renewal price increase and threatened to evaluate competitors.",
    daysAgo: 6,
    insight: {
      status: "completed",
      sentiment: "negative",
      summary: "Customer is unhappy with the proposed renewal price increase and is considering competitors.",
      action_items: ["Prepare a retention discount option", "Loop in account director before next call"],
      risks: ["High churn risk this renewal cycle"],
    },
  },
  {
    id: "int-4",
    customer_id: "cust-2",
    title: "Support escalation review",
    notes: "Reviewed the P1 outage from last week. Customer is frustrated with response times.",
    daysAgo: 14,
    insight: {
      status: "completed",
      sentiment: "negative",
      summary: "Customer remains frustrated about slow incident response on the recent P1 outage.",
      action_items: ["Share updated incident response SLA", "Offer a service credit"],
      risks: ["Escalation to their VP of Engineering if unresolved"],
    },
  },
  {
    id: "int-5",
    customer_id: "cust-3",
    title: "Discovery call",
    notes: "First call with Initech. They are evaluating three vendors and want a technical deep-dive next.",
    daysAgo: 2,
    insight: {
      status: "completed",
      sentiment: "neutral",
      summary: "Initech is in early evaluation across three vendors; requested a technical deep-dive.",
      action_items: ["Schedule technical deep-dive with their engineering lead"],
      risks: [],
    },
  },
  {
    id: "int-6",
    customer_id: "cust-4",
    title: "Churn exit interview",
    notes: "Umbrella confirmed they are not renewing due to budget cuts, not product dissatisfaction.",
    daysAgo: 45,
    insight: {
      status: "completed",
      sentiment: "negative",
      summary: "Umbrella is churning due to internal budget cuts rather than product issues.",
      action_items: ["Log churn reason as budget-related", "Re-engage in 6 months"],
      risks: ["Lost account — budget driven, low win-back probability short-term"],
    },
  },
  {
    id: "int-7",
    customer_id: "cust-5",
    title: "Quarterly check-in",
    notes: "Light-touch check-in. Usage has plateaued but nothing alarming.",
    daysAgo: 33,
    insight: {
      status: "completed",
      sentiment: "neutral",
      summary: "Usage has plateaued; no immediate concerns but engagement is low.",
      action_items: ["Send a feature-adoption tips email"],
      risks: ["Gradual disengagement if usage doesn't pick back up"],
    },
  },
  {
    id: "int-8",
    customer_id: "cust-6",
    title: "Expansion discussion",
    notes: "Stark wants to roll the product out to two more business units.",
    daysAgo: 3,
    insight: {
      status: "completed",
      sentiment: "positive",
      summary: "Stark is expanding the rollout to two additional business units.",
      action_items: ["Prepare expansion proposal", "Introduce them to the implementation team"],
      risks: [],
    },
  },
  {
    id: "int-9",
    customer_id: "cust-6",
    title: "Feature request review",
    notes: "Discussed their top three feature requests and our roadmap alignment.",
    daysAgo: 18,
    insight: {
      status: "completed",
      sentiment: "positive",
      summary: "Customer's top feature requests align well with our existing roadmap.",
      action_items: ["Share roadmap timeline for requested features"],
      risks: [],
    },
  },
  {
    id: "int-10",
    customer_id: "cust-7",
    title: "Technical deep-dive",
    notes: "Walked Wayne's engineering team through the API and security model.",
    daysAgo: 1,
    insight: {
      status: "pending",
    },
  },
  {
    id: "int-11",
    customer_id: "cust-8",
    title: "Quarterly business review",
    notes: "Wonka is thrilled with the ROI they've seen this quarter.",
    daysAgo: 5,
    insight: {
      status: "completed",
      sentiment: "positive",
      summary: "Wonka reports strong ROI this quarter and is a likely reference customer.",
      action_items: ["Ask about a case study / reference call"],
      risks: [],
    },
  },
  {
    id: "int-12",
    customer_id: "cust-8",
    title: "Support ticket follow-up",
    notes: "Followed up on an open billing ticket.",
    daysAgo: 8,
    insight: {
      status: "failed",
      error_message: "AI provider request timed out after 3 retries.",
    },
  },
];

export const SEED_INTERACTIONS: Interaction[] = SEED_INTERACTION_INPUTS.map((input) => ({
  id: input.id,
  customer_id: input.customer_id,
  title: input.title,
  notes: input.notes,
  meeting_date: daysAgoIso(input.daysAgo),
  created_by_id: ADMIN_ID,
  created_at: daysAgoIso(input.daysAgo),
  updated_at: daysAgoIso(input.daysAgo),
}));

export const SEED_AI_INSIGHTS: Record<string, AIInsight> = Object.fromEntries(
  SEED_INTERACTION_INPUTS.map((input) => [
    input.id,
    {
      id: `insight-${input.id}`,
      interaction_id: input.id,
      status: input.insight.status,
      summary: input.insight.summary ?? null,
      sentiment: input.insight.sentiment ?? null,
      action_items: input.insight.action_items ?? null,
      risks: input.insight.risks ?? null,
      error_message: input.insight.error_message ?? null,
      created_at: daysAgoIso(input.daysAgo),
      updated_at: daysAgoIso(input.daysAgo),
    } satisfies AIInsight,
  ])
);
