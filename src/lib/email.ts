import nodemailer from "nodemailer";

// ─── Transporter ──────────────────────────────────────────────────────────────

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.EMAIL_FROM
  ? `"Premium Framing" <${process.env.EMAIL_FROM}>`
  : "noreply@premiumframing.com";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailPhoto {
  filename: string;  // descriptive name shown as attachment title
  buffer: Buffer;
  mimetype: string;
}

export interface EmailActivity {
  workType: string;
  description: string;
  timeStart: string;
  timeEnd: string;
  workerNames: string[];
  chargeableSub?: string;
}

export interface EmailNotes {
  machineEntries: { title: string; unit: string }[];
  machinesNA: boolean;
  materials: string;      materialsNA: boolean;
  problems: string;       problemsNA: boolean;
  nextDayPlan: string;    nextDayPlanNA: boolean;
  supervisorNotes: string; supervisorNotesNA: boolean;
}

export interface EmailSubcontractor {
  company: string;
  workerNames: string[];
  description: string;
}

export interface EmailLog {
  supervisorName: string;
  date: string;
  locationPath: string[];
  workers: { name: string }[];
  activities: EmailActivity[];
  subcontractors: EmailSubcontractor[];
  notes: EmailNotes;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WORK_TYPE_LABEL: Record<string, string> = {
  "normal":      "Normal Labor",
  "back-charge": "Back Charge",
  "extra":       "Extra",
  "warranty":    "Warranty",
};

const WORK_TYPE_COLOR: Record<string, string> = {
  "normal":      "#3B82F6",
  "back-charge": "#D97706",
  "extra":       "#8B5CF6",
  "warranty":    "#10B981",
};

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtDate(iso: string) {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ─── HTML: shared pieces ──────────────────────────────────────────────────────

function htmlHeader(title: string, subtitle: string, accentColor = "#5B69D4") {
  return `
    <div style="background:${accentColor};border-radius:10px 10px 0 0;padding:22px 28px;">
      <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${title}</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:3px;">${subtitle}</div>
    </div>`;
}

function htmlInfoTable(rows: [string, string][]) {
  return `
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="font-size:11px;color:#6B7280;padding:5px 0;width:90px;vertical-align:top;">${label}</td>
          <td style="font-size:13px;color:#111827;font-weight:600;padding:5px 0;">${value || "—"}</td>
        </tr>`).join("")}
    </table>`;
}

function htmlSectionTitle(title: string) {
  return `<div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px;">${title}</div>`;
}

function htmlDivider() {
  return `<hr style="border:none;border-top:1px solid #F3F4F6;margin:18px 0;" />`;
}

function htmlActivityCard(activity: EmailActivity, index: number) {
  const label = WORK_TYPE_LABEL[activity.workType] ?? activity.workType;
  const color = WORK_TYPE_COLOR[activity.workType] ?? "#6B7280";
  const isBC  = activity.workType === "back-charge";
  const bg    = isBC ? "#FFFBEB" : "#F9FAFB";
  const border = isBC ? `border-left:3px solid ${color};` : "";

  return `
    <div style="background:${bg};border:1px solid #E5E7EB;${border}border-radius:8px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="background:${color}1A;color:${color};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:2px 8px;border-radius:99px;">${label}</span>
        <span style="font-size:11px;color:#9CA3AF;">Activity ${index + 1}</span>
      </div>
      <div style="font-size:13px;color:#111827;margin-bottom:8px;line-height:1.5;">${activity.description}</div>
      <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap;">
        <span>⏱ ${fmtTime(activity.timeStart)} → ${fmtTime(activity.timeEnd)}</span>
        ${activity.workerNames.length > 0 ? `<span>👷 ${activity.workerNames.join(", ")}</span>` : ""}
        ${isBC && activity.chargeableSub ? `<span style="color:${color};font-weight:600;">⚡ Chargeable to: ${activity.chargeableSub}</span>` : ""}
      </div>
    </div>`;
}

function htmlNoteRow(label: string, value: string, isNA: boolean) {
  if (isNA) return `
    <div style="margin-bottom:10px;">
      <div style="font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${label}</div>
      <div style="font-size:12px;color:#9CA3AF;font-style:italic;">N/A</div>
    </div>`;
  if (!value.trim()) return "";
  return `
    <div style="margin-bottom:10px;">
      <div style="font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${label}</div>
      <div style="font-size:13px;color:#374151;white-space:pre-wrap;">${value}</div>
    </div>`;
}

function htmlWrapper(body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;background:#F3F4F6;padding:28px 16px;margin:0;">
  <div style="max-width:580px;margin:0 auto;">
    ${body}
    <div style="text-align:center;font-size:11px;color:#9CA3AF;margin-top:20px;padding-bottom:8px;">
      Premium Framing — Confidential · Do not forward
    </div>
  </div>
</body>
</html>`;
}

// ─── DL Email HTML ────────────────────────────────────────────────────────────

function buildDLHtml(log: EmailLog): string {
  const location = log.locationPath.join(" › ");
  const workerList = log.workers.map((w) => w.name).join(", ");

  const activitiesHtml = log.activities.map((a, i) => htmlActivityCard(a, i)).join("");

  const subsHtml = log.subcontractors.length > 0
    ? log.subcontractors.map((s) => `
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:12px 14px;margin-bottom:8px;">
          <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:4px;">${s.company}</div>
          ${s.workerNames.length > 0 ? `<div style="font-size:11px;color:#6B7280;margin-bottom:3px;">Workers: ${s.workerNames.join(", ")}</div>` : ""}
          ${s.description ? `<div style="font-size:12px;color:#374151;">${s.description}</div>` : ""}
        </div>`).join("")
    : "";

  const machinesHtml = log.notes.machinesNA
    ? `<div style="font-size:12px;color:#9CA3AF;font-style:italic;margin-bottom:10px;">N/A</div>`
    : log.notes.machineEntries.length > 0
      ? log.notes.machineEntries.map((m) =>
          `<div style="font-size:12px;color:#374151;padding:3px 0;">${m.title}${m.unit ? ` <span style="color:#6B7280;font-family:monospace;">[${m.unit}]</span>` : ""}</div>`
        ).join("")
      : "";

  const body = `
    ${htmlHeader("Daily Log", `Premium Framing · ${fmtDate(log.date)}`)}
    <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 10px 10px;padding:24px 28px;">
      ${htmlInfoTable([
        ["Supervisor", log.supervisorName],
        ["Date",       fmtDate(log.date)],
        ["Jobsite",    location],
        ["Workers",    workerList],
      ])}

      ${htmlDivider()}
      ${htmlSectionTitle(`Activities (${log.activities.length})`)}
      ${activitiesHtml}

      ${log.subcontractors.length > 0 ? `
        ${htmlDivider()}
        ${htmlSectionTitle("Subcontractors")}
        ${subsHtml}` : ""}

      ${htmlDivider()}
      ${htmlSectionTitle("Site Notes")}

      ${log.notes.machineEntries.length > 0 || log.notes.machinesNA ? `
        <div style="margin-bottom:10px;">
          <div style="font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Machines & Equipment</div>
          ${machinesHtml}
        </div>` : ""}

      ${htmlNoteRow("Materials Delivered",  log.notes.materials,      log.notes.materialsNA)}
      ${htmlNoteRow("Problems / Delays",    log.notes.problems,       log.notes.problemsNA)}
      ${htmlNoteRow("Plan for Next Day",    log.notes.nextDayPlan,    log.notes.nextDayPlanNA)}
      ${htmlNoteRow("Supervisor Notes",     log.notes.supervisorNotes, log.notes.supervisorNotesNA)}
    </div>`;

  return htmlWrapper(body);
}

// ─── BC Email HTML ────────────────────────────────────────────────────────────

function buildBCHtml(log: EmailLog, activity: EmailActivity, activityIndex: number): string {
  const location = log.locationPath.join(" › ");

  const body = `
    ${htmlHeader("⚠ Back Charge Alert", `Premium Framing · ${fmtDate(log.date)}`, "#D97706")}
    <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 10px 10px;padding:24px 28px;">
      ${htmlInfoTable([
        ["Supervisor",  log.supervisorName],
        ["Date",        fmtDate(log.date)],
        ["Jobsite",     location],
        ["Activity",    `#${activityIndex + 1} of ${log.activities.length}`],
        ["Chargeable",  activity.chargeableSub ?? "—"],
      ])}

      ${htmlDivider()}
      ${htmlSectionTitle("Back Charge Activity")}
      ${htmlActivityCard(activity, activityIndex)}
    </div>`;

  return htmlWrapper(body);
}

// ─── Public send functions ────────────────────────────────────────────────────

export async function sendDailyLogEmail(params: {
  to: string[];
  log: EmailLog;
  photos: EmailPhoto[];
}): Promise<void> {
  if (!params.to.length) return;
  const transporter = getTransporter();

  const attachments = params.photos.map((p) => ({
    filename: p.filename,
    content:  p.buffer,
    contentType: p.mimetype,
  }));

  await transporter.sendMail({
    from: FROM,
    to:   params.to,
    subject: `[Daily Log] ${params.log.supervisorName} — ${params.log.date}`,
    html: buildDLHtml(params.log),
    attachments,
  });
}

export async function sendBackChargeEmail(params: {
  to: string[];
  log: EmailLog;
  activity: EmailActivity;
  activityIndex: number;
  photos: EmailPhoto[];
}): Promise<void> {
  if (!params.to.length) return;
  const transporter = getTransporter();

  const attachments = params.photos.map((p) => ({
    filename: p.filename,
    content:  p.buffer,
    contentType: p.mimetype,
  }));

  await transporter.sendMail({
    from: FROM,
    to:   params.to,
    subject: `[Back Charge] ${params.log.supervisorName} — ${params.log.date} — Activity ${params.activityIndex + 1}`,
    html: buildBCHtml(params.log, params.activity, params.activityIndex),
    attachments,
  });
}
