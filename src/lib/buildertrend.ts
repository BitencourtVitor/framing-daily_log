const BT_BASE_URL = process.env.BT_BASE_URL ?? "https://api.buildertrend.net";
const BT_API_KEY = process.env.BT_API_KEY!;

function btHeaders() {
  return {
    "Authorization": `Bearer ${BT_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface BTDailyLogPayload {
  date: string;   // YYYY-MM-DD
  title: string;
  notes: string;
}

export interface BTDailyLogResponse {
  id: string;
  [key: string]: unknown;
}

export async function createDailyLog(payload: BTDailyLogPayload): Promise<BTDailyLogResponse> {
  const res = await fetch(`${BT_BASE_URL}/v2/dailylogs`, {
    method: "POST",
    headers: btHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Buildertrend createDailyLog failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function uploadAttachment(
  logId: string,
  filename: string,
  mimetype: string,
  data: Uint8Array
): Promise<string> {
  const form = new FormData();
  const blob = new Blob([data as unknown as ArrayBuffer], { type: mimetype });
  form.append("file", blob, filename);
  form.append("dailyLogId", logId);

  const res = await fetch(`${BT_BASE_URL}/v2/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BT_API_KEY}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Buildertrend uploadAttachment failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.id as string;
}
