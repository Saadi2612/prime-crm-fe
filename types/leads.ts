export interface Stage {
  id: string;
  name: string;
  order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** Compact user object embedded in transfer records */
export interface UserRef {
  id: string;
  full_name: string;
  email: string;
}

export interface LeadTransfer {
  id: string;
  lead: string;
  from_user: UserRef | null;
  to_user: UserRef | null;
  transferred_by: UserRef | null;
  note: string;
  created_at: string;
}

export interface LeadNote {
  id: string;
  body: string;
  created_at: string;
}

/** Nested stage object returned by the /leads/ list endpoint */
export interface StageRef {
  id: string;
  name: string;
  order: number;
  is_default: boolean;
}

/** Slim project object nested inside a Lead response */
export interface ProjectRef {
  id: string;
  name: string;
  address: string;
  type: string;
  size: number;
  size_unit: string;
  price?: number | null;
  image?: string | null;
}

export interface Lead {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  job_title?: string;
  min_budget?: number;
  max_budget?: number;
  next_follow_up?: string;
  /** Immutable notes; use POST /leads/{id}/notes/ to add */
  notes?: LeadNote[];
  latest_note?: LeadNote | null;
  /** The API returns a nested StageRef object, not a bare ID */
  stage: StageRef | string;
  stage_name?: string;
  /** The API returns a nested ProjectRef object, or null */
  project?: ProjectRef | null;
  assigned_to?: { id: string; full_name: string; email: string } | string | null;
  transfer_history?: LeadTransfer[];
  form?: string;
  property_interest?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadsQueryParams {
  stage?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
