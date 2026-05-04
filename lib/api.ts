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

function getPublicBaseUrl(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname.includes("localhost")) {
      return `${protocol}//localhost:8000`;
    }
    // Strip tenant subdomain — use root api domain
    const parts = hostname.split(".");
    const rootDomain = parts.slice(-2).join(".");
    return `${protocol}//api.${rootDomain}`;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    // Local dev: lfc.localhost:3000 → lfc.localhost:8000
    if (hostname.includes("localhost")) {
      return `${protocol}//${hostname}:8000`;
    }

    // Production: lfc.mypakcrm.com → lfc.api.mypakcrm.com
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      parts.splice(1, 0, "api");
      return `${protocol}//${parts.join(".")}`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

function getTenantHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const subdomain = window.location.hostname.split(".")[0];
  return subdomain ? { "X-Tenant": subdomain } : {};
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("crm_access");
  return {
    ...getTenantHeader(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers });

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
  const res = await fetch(`${getBaseUrl()}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string; non_field_errors?: string[] };
    const message = err.non_field_errors?.[0] ?? err.detail ?? `Login failed (${res.status})`;
    throw new Error(message);
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
  const res = await fetch(`${getBaseUrl()}/auth/accept-invite/`, {
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

let _stagesPromise: Promise<Stage[]> | null = null;

export function fetchStages(): Promise<Stage[]> {
  if (!_stagesPromise) {
    _stagesPromise = apiFetch<Stage[] | { results: Stage[] }>("/leads/stages/")
      .then((data) => (Array.isArray(data) ? data : data.results))
      .finally(() => { _stagesPromise = null; });
  }
  return _stagesPromise;
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
  const data = await apiFetch<Lead[] | { results: Lead[] }>(`/leads/${qs ? `?${qs}` : ""}`);
  return Array.isArray(data) ? data : data.results;
}

export interface PaginatedLeads {
  results: Lead[];
  count: number;
  next: string | null;
  previous: string | null;
}

export async function fetchLeadsPaginated(params?: Omit<LeadsQueryParams, "is_paginated">): Promise<PaginatedLeads> {
  const query = new URLSearchParams();
  if (params?.stage) query.set("stage", params.stage);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.assigned_to) query.set("assigned_to", params.assigned_to);
  const qs = query.toString();
  const data = await apiFetch<PaginatedLeads | Lead[]>(`/leads/${qs ? `?${qs}` : ""}`);
  if (Array.isArray(data)) return { results: data, count: data.length, next: null, previous: null };
  return data;
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
export async function fetchUnassignedLeads(page = 1): Promise<{ results: Lead[]; count: number, page_size: number }> {
  const data = await apiFetch<{ results: Lead[]; count: number, page_size: number } | Lead[]>(`/leads/unassigned/?page=${page}`);
  if (Array.isArray(data)) return { results: data, count: data.length, page_size: 20 };
  return { results: data.results, count: data.count, page_size: data.page_size };
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
  const data = await apiFetch<LeadNote[] | { results: LeadNote[] }>(`/leads/${leadId}/notes/`);
  return Array.isArray(data) ? data : data.results;
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

export async function fetchAllFollowUps(): Promise<import("@/types/leads").FollowUpAlert[]> {
  return apiFetch<import("@/types/leads").FollowUpAlert[]>("/leads/follow-ups/");
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
  const token = typeof window !== "undefined" ? localStorage.getItem("crm_access") : null;
  const res = await fetch(`${getBaseUrl()}/projects/`, {
    method: "POST",
    headers: { ...getTenantHeader(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  const token = typeof window !== "undefined" ? localStorage.getItem("crm_access") : null;
  const res = await fetch(`${getBaseUrl()}/projects/${id}/`, {
    method: "PATCH",
    headers: { ...getTenantHeader(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  is_available_for_assignment?: boolean;
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

export async function updateUserAvailability(
  userId: string,
  isAvailable: boolean
): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/auth/users/${userId}/`, {
    method: "PATCH",
    body: JSON.stringify({ is_available_for_assignment: isAvailable }),
  });
}

export async function getMyAvailability(): Promise<{ is_available_for_assignment: boolean }> {
  return apiFetch<{ is_available_for_assignment: boolean }>("/auth/users/availability/");
}

export async function setMyAvailability(isAvailable: boolean): Promise<{ is_available_for_assignment: boolean }> {
  return apiFetch<{ is_available_for_assignment: boolean }>("/auth/users/availability/", {
    method: "POST",
    body: JSON.stringify({ is_available_for_assignment: isAvailable }),
  });
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

// ── Tenant Registration ───────────────────────────────────────────────────────

export interface RegisterAgencyPayload {
  agency_name: string;
  subdomain: string;
  admin_email: string;
  admin_password: string;
}

export interface RegisterAgencyResponse {
  detail: string;
  agency_name: string;
  subdomain: string;
  workspace_url: string;
  status_url: string;
}

export async function registerAgency(
  payload: RegisterAgencyPayload
): Promise<RegisterAgencyResponse> {
  const res = await fetch(
    `${getPublicBaseUrl()}/api/tenants/register/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    let message = STATUS_MESSAGES[res.status] ?? `Unexpected error (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body === "object" && body !== null) {
        const firstValue = Object.values(body)[0];
        if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
          message = firstValue[0];
        } else if (typeof body.detail === "string") {
          message = body.detail;
        }
      }
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return res.json() as Promise<RegisterAgencyResponse>;
}

export type RegistrationStatusValue = "pending" | "active" | "failed";

export interface RegistrationStatusResponse {
  status: RegistrationStatusValue;
  progress?: number;
  step?: string;
}

export async function getRegistrationStatus(subdomain: string): Promise<RegistrationStatusResponse> {
  const res = await fetch(
    `${getPublicBaseUrl()}/api/tenants/${subdomain}/status/`,
    { method: "GET" }
  );
  if (!res.ok) throw new Error("Status check failed");
  return res.json() as Promise<RegistrationStatusResponse>;
}

// ── Meta / Facebook Integration ───────────────────────────────────────────────

export interface MetaPage {
  id: string;
  name: string;
  error: string;
}

export interface MetaStatus {
  connected: boolean;
  pages: MetaPage[];
}

export async function fetchMetaStatus(): Promise<MetaStatus> {
  return apiFetch<MetaStatus>("/meta/status/");
}

export async function initiateMetaOAuth(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/meta/oauth/initiate/");
}

// ── Lead Distribution Settings ────────────────────────────────────────────────

export interface DistributionSettings {
  is_distribution_enabled: boolean;
  timezone: string;
  working_days: number[];
  office_open: string;
  office_close: string;
  inactivity_minutes: number;
  max_reassignments: number;
  is_office_hours_now: boolean;
  next_open: string | null;
}

export async function fetchDistributionSettings(): Promise<DistributionSettings> {
  return apiFetch<DistributionSettings>("/settings/distribution/");
}

export async function updateDistributionSettings(
  data: Partial<Pick<DistributionSettings, "is_distribution_enabled" | "timezone" | "working_days" | "office_open" | "office_close">>
): Promise<DistributionSettings> {
  return apiFetch<DistributionSettings>("/settings/distribution/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function fetchQueuedLeadsCount(): Promise<number> {
  const data = await apiFetch<{ count: number } | unknown[]>("/leads/?is_queued=true&count=true");
  if (typeof data === "object" && !Array.isArray(data) && data !== null && "count" in data) {
    return (data as { count: number }).count;
  }
  return 0;
}
