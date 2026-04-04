import type { Lead, LeadNote, LeadsQueryParams, Stage, LeadTransfer } from "@/types/leads";
import type { AuthSession } from "@/lib/auth";
import { clearSession } from "@/lib/auth";

/** Human-readable messages for common HTTP status codes */
const STATUS_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource was not found.",
  500: "Server error. Please try again later.",
  502: "Service unavailable. Please try again later.",
  503: "Service unavailable. Please try again later.",
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("prime_access");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    // On 401 – session is invalid or expired, force logout
    if (res.status === 401) {
      clearSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    // Try to extract a clean message from the JSON body
    let message = STATUS_MESSAGES[res.status] ?? `Unexpected error (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body === "object" && body !== null) {
        // If it's a field-specific error (e.g., { email: ["..."] }), use the first message
        const firstValue = Object.values(body)[0];
        if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
          message = firstValue[0];
        } else if (typeof body.detail === "string") {
          message = body.detail;
        } else if (typeof body.message === "string") {
          message = body.message;
        }
      }
    } catch {
      // body wasn't JSON or didn't have a message – keep the default
    }

    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginApi(
  email: string,
  password: string
): Promise<AuthSession> {
  const res = await fetch(`${BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ?? `Login failed (${res.status})`
    );
  }

  const data = await res.json();
  return {
    tokens: { access: data.access, refresh: data.refresh },
    user: data.user,
  } as AuthSession;
}

export async function inviteUser(data: {
  email: string;
  phone_number?: string;
  role: string;
}): Promise<{ detail: string; token: string }> {
  return apiFetch<{ detail: string; token: string }>("/auth/invite/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function acceptInvite(data: {
  token: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  password: string;
  confirm_password: string;
}): Promise<AuthSession> {
  const res = await fetch(`${BASE_URL}/auth/accept-invite/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = STATUS_MESSAGES[res.status] ?? `Unexpected error (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body === "object") {
        // Return first error message if validation fails
        const firstValue = Object.values(body)[0];
        if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
            message = firstValue[0];
        } else if (typeof body.detail === "string") {
            message = body.detail;
        } else if (typeof body.non_field_errors === "string") {
            message = body.non_field_errors;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const responseData = await res.json();
  return {
    tokens: { access: responseData.access, refresh: responseData.refresh },
    user: responseData.user,
  } as AuthSession;
}

// ── Lead Stages ───────────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/auth/forgot-password/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtp(email: string, otp_code: string): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/auth/verify-otp/", {
    method: "POST",
    body: JSON.stringify({ email, otp_code }),
  });
}

export async function resetPassword(
  email: string,
  otp_code: string,
  new_password: string,
  confirm_password: string
): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/auth/reset-password/", {
    method: "POST",
    body: JSON.stringify({ email, otp_code, new_password, confirm_password }),
  });
}

// ── Lead Stages ───────────────────────────────────────────────────────────────

export async function fetchStages(): Promise<Stage[]> {
  return apiFetch<Stage[]>("/leads/stages/");
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export async function fetchLeads(params?: LeadsQueryParams): Promise<Lead[]> {
  const query = new URLSearchParams();
  if (params?.stage) query.set("stage", params.stage);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.assigned_to) query.set("assigned_to", params.assigned_to);
  if (params?.is_paginated === false) query.set("is_paginated", "false");
  const qs = query.toString();
  return apiFetch<Lead[]>(`/leads/${qs ? `?${qs}` : ""}`);
}

export async function createLead(data: Partial<Lead>): Promise<Lead> {
  return apiFetch<Lead>("/leads/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLeadStage(
  leadId: string,
  stageId: string
): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${leadId}/`, {
    method: "PATCH",
    body: JSON.stringify({ stage: stageId }),
  });
}

export async function fetchLead(id: string): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${id}/`);
}

/** Fetch all leads that have no assigned user. Admin/manager only. */
export async function fetchUnassignedLeads(): Promise<Lead[]> {
  return apiFetch<Lead[]>("/leads/unassigned/");
}

export async function deleteLead(id: string): Promise<void> {
  return apiFetch<void>(`/leads/${id}/`, { method: "DELETE" });
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function fetchLeadNotes(leadId: string): Promise<LeadNote[]> {
  return apiFetch<LeadNote[]>(`/leads/${leadId}/notes/`);
}

export async function createLeadNote(
  leadId: string,
  body: string,
  nextFollowUp?: string | null,
): Promise<LeadNote> {
  return apiFetch<LeadNote>(`/leads/${leadId}/notes/`, {
    method: "POST",
    body: JSON.stringify({ body, ...(nextFollowUp ? { next_follow_up: nextFollowUp } : {}) }),
  });
}

export async function fetchLeadTransfers(leadId: string): Promise<LeadTransfer[]> {
  return apiFetch<LeadTransfer[]>(`/leads/${leadId}/transfers/`);
}

export async function fetchUserTransfers(userId: string): Promise<LeadTransfer[]> {
  return apiFetch<LeadTransfer[]>(`/leads/transfers/?user_id=${userId}`);
}

export async function transferLead(
  leadId: string,
  toUserId: string,
  note?: string
): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${leadId}/transfer/`, {
    method: "POST",
    body: JSON.stringify({ to_user: toUserId, note: note ?? "" }),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function fetchTodayFollowUps(): Promise<import("@/types/leads").FollowUpAlert[]> {
  return apiFetch<import("@/types/leads").FollowUpAlert[]>("/leads/today-follow-ups/");
}

export async function fetchAllFollowUps(): Promise<any> {
  return apiFetch<any>("/leads/follow-ups/");
}

export interface DashboardStats {
  total_leads: number;
  active_leads: number;
  qualified_leads: number;
  unqualified_leads: number;
  follow_ups_today: number;
  stage_counts?: Record<string, number>;
}

export interface DashboardChartData {
  date: string;
  count: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/leads/stats/");
}

export async function fetchDashboardChart(days: number = 7): Promise<DashboardChartData[]> {
  return apiFetch<DashboardChartData[]>(`/leads/chart/?days=${days}`);
}

// ── Projects ──────────────────────────────────────────────────────────────────

export type ProjectType = "plot" | "apartment" | "house" | "portion" | "office" | "townhouse";
export type SizeUnit = "marla" | "sqft";

export interface Project {
  id: string;
  name: string;
  address: string;
  type: ProjectType;
  price?: number | null;
  form_id?: string | null;
  image?: string | null;
  size: number;
  size_unit: SizeUnit;
  created_at?: string;
}

export async function fetchProjects(params?: { search?: string; type?: string }): Promise<Project[]> {
  const query = new URLSearchParams({ is_paginated: "false" });
  if (params?.search) query.set("search", params.search);
  if (params?.type) query.set("type", params.type);
  return apiFetch<Project[]>(`/projects/?${query.toString()}`);
}

export async function fetchProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}/`);
}

export async function createProject(data: FormData): Promise<Project> {
  const token = typeof window !== "undefined" ? localStorage.getItem("prime_access") : null;
  const res = await fetch(`${BASE_URL}/projects/`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: data,
  });
  if (!res.ok) {
    let message = STATUS_MESSAGES[res.status] ?? `Unexpected error (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") message = body.detail;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json();
}

export async function updateProject(id: string, data: FormData): Promise<Project> {
  const token = typeof window !== "undefined" ? localStorage.getItem("prime_access") : null;
  const res = await fetch(`${BASE_URL}/projects/${id}/`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: data,
  });
  if (!res.ok) {
    let message = STATUS_MESSAGES[res.status] ?? `Unexpected error (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") message = body.detail;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/projects/${id}/`, { method: "DELETE" });
}

// ── Team Members ──────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone_number?: string | null;
  lead_stats?: {
    total: number;
    active: number;
    qualified: number;
    unqualified: number;
  };
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  return apiFetch<TeamMember[]>("/auth/users/");
}

export async function fetchTeamMember(id: string): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/auth/users/${id}/`);
}

// ── Invitations ───────────────────────────────────────────────────────────────

export interface PendingInvitation {
  id: string;
  email: string;
  phone_number: string | null;
  role: string;
  invited_by_email: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
}

export async function fetchPendingInvitations(): Promise<PendingInvitation[]> {
  return apiFetch<PendingInvitation[]>("/auth/invitations/pending/");
}

export async function deleteInvitation(id: string): Promise<void> {
  return apiFetch<void>(`/auth/invitations/${id}/`, { method: "DELETE" });
}

export async function resendInvitation(id: string): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>(`/auth/invitations/${id}/resend/`, {
    method: "POST",
  });
}
