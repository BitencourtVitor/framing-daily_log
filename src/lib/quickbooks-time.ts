/**
 * QuickBooks Time (TSheets) API client
 * Docs: https://tsheetsteam.github.io/api_docs/
 */

import type { CompanyId } from "@/models/User";

const QBT_BASE_URL = "https://rest.tsheets.com/api/v1";

const TOKEN_ENV: Record<CompanyId, string> = {
  framing: "QBT_ACCESS_TOKEN_FRAMING",
  hvac:    "QBT_ACCESS_TOKEN_HVAC",
  pcg:     "QBT_ACCESS_TOKEN_PCG",
};

function qbtHeaders(company: CompanyId) {
  const token = process.env[TOKEN_ENV[company]];
  if (!token) throw new Error(`QBT token not configured for company: ${company}`);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export interface QBTJobcode {
  id: number;
  parent_id: number;
  name: string;
  type: string;
  active: boolean;
  has_children: boolean;
}

export async function getJobcodes(parentId: number, company: CompanyId): Promise<QBTJobcode[]> {
  const params = new URLSearchParams({
    parent_ids: String(parentId),
    active: "yes",
    type: "regular",
  });

  const res = await fetch(`${QBT_BASE_URL}/jobcodes?${params}`, {
    headers: qbtHeaders(company),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBT getJobcodes failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const items = json.results?.jobcodes ?? {};
  return Object.values(items) as QBTJobcode[];
}

export interface QBTTimesheet {
  id: number;
  user_id: number;
  date: string;
  duration: number; // seconds
  notes: string;
  jobcode_id: number;
}

export interface QBTUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export async function getTimesheetsForDate(date: string, company: CompanyId): Promise<QBTTimesheet[]> {
  const params = new URLSearchParams({
    start_date: date,
    end_date: date,
    on_the_clock: "no",
    supplemental_data: "no",
  });

  const res = await fetch(`${QBT_BASE_URL}/timesheets?${params}`, {
    headers: qbtHeaders(company),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBT getTimesheets failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const items = json.results?.timesheets ?? {};
  return Object.values(items) as QBTTimesheet[];
}

export async function getUsers(userIds: number[], company: CompanyId): Promise<QBTUser[]> {
  const params = new URLSearchParams({ ids: userIds.join(",") });

  const res = await fetch(`${QBT_BASE_URL}/users?${params}`, {
    headers: qbtHeaders(company),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBT getUsers failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const items = json.results?.users ?? {};
  return Object.values(items) as QBTUser[];
}

export async function getAllUsers(company: CompanyId): Promise<QBTUser[]> {
  const res = await fetch(`${QBT_BASE_URL}/users`, {
    headers: qbtHeaders(company),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBT getAllUsers failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const items = json.results?.users ?? {};
  return Object.values(items) as QBTUser[];
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
