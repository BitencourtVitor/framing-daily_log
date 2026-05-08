import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM ?? "noreply@premiumframing.com";

function parseList(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

interface EmailActivity {
  workType: string;
  description: string;
  timeStart: string;
  timeEnd: string;
  workerNames: string[];
  chargeableSub?: string;
}

interface LogEmailData {
  supervisorName: string;
  date: string;
  locationPath: string[];
  activities: EmailActivity[];
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const WORK_TYPE_LABEL: Record<string, string> = {
  "normal":      "Normal Labor",
  "back-charge": "Back Charge",
  "extra":       "Extra",
  "warranty":    "Warranty",
};

function buildHtml(log: LogEmailData, highlightBackCharge: boolean): string {
  const location = log.locationPath.length > 0 ? log.locationPath.join(" › ") : "—";

  const activitiesHtml = log.activities.map((a, i) => {
    const isBC = a.workType === "back-charge";
    const label = WORK_TYPE_LABEL[a.workType] ?? a.workType;
    const bg = isBC ? "#FEF9EE" : "#F9FAFB";
    const labelColor = isBC ? "#D97706" : "#6B7280";

    return `
      <div style="background:${bg};border:1px solid #E5E7EB;border-radius:8px;padding:12px;margin-bottom:10px;${isBC && highlightBackCharge ? "border-left:4px solid #D97706;" : ""}">
        <div style="font-size:11px;font-weight:700;color:${labelColor};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
          ${label} · Activity ${i + 1}${isBC && a.chargeableSub ? ` — Chargeable to: ${a.chargeableSub}` : ""}
        </div>
        <div style="font-size:13px;color:#111827;margin-bottom:6px;">${a.description}</div>
        <div style="font-size:11px;color:#6B7280;">
          ${fmtTime(a.timeStart)} → ${fmtTime(a.timeEnd)}
          ${a.workerNames.length > 0 ? ` &nbsp;·&nbsp; ${a.workerNames.join(", ")}` : ""}
        </div>
      </div>`;
  }).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F3F4F6;padding:32px 16px;margin:0;">
      <div style="max-width:560px;margin:0 auto;">
        <div style="background:#5B69D4;border-radius:10px 10px 0 0;padding:20px 24px;">
          <div style="color:#fff;font-size:18px;font-weight:700;">Daily Log</div>
          <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:2px;">Premium Framing</div>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 10px 10px;padding:24px;">
          <table style="width:100%;margin-bottom:20px;border-collapse:collapse;">
            <tr>
              <td style="font-size:12px;color:#6B7280;padding:4px 0;">Supervisor</td>
              <td style="font-size:13px;color:#111827;font-weight:600;padding:4px 0;">${log.supervisorName}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#6B7280;padding:4px 0;">Date</td>
              <td style="font-size:13px;color:#111827;font-weight:600;padding:4px 0;">${log.date}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#6B7280;padding:4px 0;">Jobsite</td>
              <td style="font-size:13px;color:#111827;font-weight:600;padding:4px 0;">${location}</td>
            </tr>
          </table>
          <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Activities</div>
          ${activitiesHtml}
        </div>
        <div style="text-align:center;font-size:11px;color:#9CA3AF;margin-top:16px;">
          Premium Framing — Confidential
        </div>
      </div>
    </body>
    </html>`;
}

export async function sendDailyLogEmail(log: LogEmailData): Promise<void> {
  if (!resend) return;
  const to = parseList(process.env.EMAIL_RECIPIENTS_DL);
  if (!to.length) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Daily Log] ${log.supervisorName} — ${log.date}`,
    html: buildHtml(log, false),
  });
}

export async function sendBackChargeEmail(log: LogEmailData): Promise<void> {
  if (!resend) return;
  const to = parseList(process.env.EMAIL_RECIPIENTS_BC);
  if (!to.length) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Back Charge Alert] ${log.supervisorName} — ${log.date}`,
    html: buildHtml(log, true),
  });
}
