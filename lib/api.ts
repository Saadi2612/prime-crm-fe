import type { Lead, LeadNote, LeadsQueryParams, Stage } from "@/types/leads";
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

    // Try to extract a clean `detail` message from the JSON body
    let message = STATUS_MESSAGES[res.status] ?? `Unexpected error (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // body wasn't JSON – keep the default message
    }

    throw new Error(message);
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

export async function createLeadNote(leadId: string, body: string): Promise<LeadNote> {
  return apiFetch<LeadNote>(`/leads/${leadId}/notes/`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
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

export async function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/projects/${id}/`, { method: "DELETE" });
}

// ── Team Members ──────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  return apiFetch<TeamMember[]>("/auth/users/");
}
