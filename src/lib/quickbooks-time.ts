/**
 * QuickBooks Time (TSheets) API client
 * OAuth2 — tokens stored in env after initial authorization flow.
 * Docs: https://tsheetsteam.github.io/api_docs/
 */

const QBT_BASE_URL = "https://rest.tsheets.com/api/v1";

function qbtHeaders() {
  return {
    Authorization: `Bearer ${process.env.QBT_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
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

export async function getTimesheetsForDate(date: string): Promise<QBTTimesheet[]> {
  const params = new URLSearchParams({
    start_date: date,
    end_date: date,
    on_the_clock: "no",
    supplemental_data: "no",
  });

  const res = await fetch(`${QBT_BASE_URL}/timesheets?${params}`, {
    headers: qbtHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBT getTimesheets failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const items = json.results?.timesheets ?? {};
  return Object.values(items) as QBTTimesheet[];
}

export async function getUsers(userIds: number[]): Promise<QBTUser[]> {
  const params = new URLSearchParams({ ids: userIds.join(",") });

  const res = await fetch(`${QBT_BASE_URL}/users?${params}`, {
    headers: qbtHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBT getUsers failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const items = json.results?.users ?? {};
  return Object.values(items) as QBTUser[];
}

export async function getAllUsers(): Promise<QBTUser[]> {
  const res = await fetch(`${QBT_BASE_URL}/users`, {
    headers: qbtHeaders(),
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
