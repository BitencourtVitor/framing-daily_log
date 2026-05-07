import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Path,
} from "@react-pdf/renderer";

// ─── Design tokens — matches app palette ──────────────────────────────────────

const C = {
  primary:    "#5B69D4",
  primaryBg:  "#EEF0FB",
  foreground: "#111827",
  muted:      "#6B7280",
  mutedBg:    "#F3F4F6",
  border:     "#E5E7EB",
  card:       "#FFFFFF",
  white:      "#FFFFFF",
  amber:      "#D97706",
  amberBg:    "#FEF9EE",
  amberBdr:   "#FCD34D",
  emerald:    "#059669",
  emeraldBg:  "#F0FDF4",
  emeraldBdr: "#6EE7B7",
  purple:     "#7C3AED",
  purpleBg:   "#FAF5FF",
  purpleBdr:  "#C4B5FD",
  blue:       "#2563EB",
  blueBg:     "#EFF6FF",
  blueBdr:    "#93C5FD",
  page:       "#F9FAFB",
};

const WORK_TYPE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "normal":      { label: "Normal Labor", color: C.blue,    bg: C.blueBg,    border: C.blueBdr    },
  "back-charge": { label: "Back Charge",  color: C.amber,   bg: C.amberBg,   border: C.amberBdr   },
  "extra":       { label: "Extra",        color: C.purple,  bg: C.purpleBg,  border: C.purpleBdr  },
  "warranty":    { label: "Warranty",     color: C.emerald, bg: C.emeraldBg, border: C.emeraldBdr },
};

// ─── Inline SVG icons (lucide paths) ──────────────────────────────────────────

function Icon({ d, color = C.muted, size = 10 }: { d: string; color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ marginRight: 3 }}>
      <Path d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const ICONS = {
  calendar: "M8 2v4M16 2v4M3 10h18M3 4h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  user:     "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  mapPin:   "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0M12 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  clock:    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  camera:   "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3L14.5 4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  wrench:   "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  users:    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.foreground,
    backgroundColor: C.page,
    paddingBottom: 52,
  },

  // Minimal top bar
  topBar: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  topBarAccent: { width: 3, height: 22, backgroundColor: C.primary, borderRadius: 2 },
  topBarTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.foreground },
  topBarSub:   { fontSize: 8, color: C.muted, marginTop: 1 },
  topBarRight: { alignItems: "flex-end" },
  topBarDate:  { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.foreground },
  topBarSupervisor: { fontSize: 8, color: C.muted, marginTop: 2 },

  // Body
  body: { paddingHorizontal: 32, paddingTop: 20 },

  // Card container
  card: {
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
  },

  // Meta info rows
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  metaText: { fontSize: 9, color: C.foreground },
  metaMuted: { fontSize: 9, color: C.muted },

  // Location breadcrumb
  breadcrumbRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 2 },
  breadcrumbItem: { fontSize: 9, color: C.primary, fontFamily: "Helvetica-Bold" },
  breadcrumbSep:  { fontSize: 9, color: C.muted },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionAccent: { width: 3, height: 12, backgroundColor: C.primary, borderRadius: 1 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: C.border },

  // Activity card
  actCard: {
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  actHeader: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 99,
    borderWidth: 1,
  },
  actBadgeText: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  actNum: { fontSize: 8, color: C.muted },
  actBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  actDesc: { fontSize: 9, color: C.foreground, lineHeight: 1.55, marginBottom: 6 },
  actMeta: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 6 },
  actMetaItem: { flexDirection: "row", alignItems: "center" },
  actMetaText: { fontSize: 8, color: C.muted },

  // Worker chips
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  chip: { backgroundColor: C.primaryBg, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  chipText: { fontSize: 7.5, color: C.primary, fontFamily: "Helvetica-Bold" },

  // Photo grid — activity (3 col, full image height)
  photoGrid3: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  photoWrap3: { width: "31%", borderRadius: 5, overflow: "hidden", backgroundColor: C.mutedBg },
  photoImg3:  { width: "100%", objectFit: "contain" },

  // Photo grid — general (1 col, full width)
  photoGrid1: { flexDirection: "column", gap: 12 },
  photoWrap1: { width: "100%", borderRadius: 6, overflow: "hidden", backgroundColor: C.mutedBg },
  photoImg1:  { width: "100%", objectFit: "contain" },

  photoCaption: { fontSize: 6.5, color: C.muted, marginTop: 2, textAlign: "center" },

  // Logo in header
  topBarLogo: { width: 30, height: 30, objectFit: "contain" },

  // Notes
  noteBlock: { marginBottom: 12 },
  noteLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  noteText: { fontSize: 9, color: C.foreground, lineHeight: 1.55 },
  noteNA:   { fontSize: 9, color: C.muted, fontStyle: "italic" },
  machineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.mutedBg,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 4,
    gap: 8,
  },
  machineTitle: { flex: 1, fontSize: 9, color: C.foreground, fontFamily: "Helvetica-Bold" },
  machineUnit: {
    fontSize: 7.5,
    color: C.primary,
    backgroundColor: C.primaryBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
    fontFamily: "Helvetica-Bold",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: C.muted },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PDFPhoto {
  activityIndex: number | null;
  dataUrl: string;
  filename: string;
}

export interface PDFActivity {
  description: string;
  timeStart: string;
  timeEnd: string;
  workType: string;
  workerNames: string[];
}

export interface PDFSub {
  company: string;
  workerNames: string[];
  description: string;
}

export interface PDFMachine {
  title: string;
  unit: string;
}

export interface PDFNotes {
  machineEntries: PDFMachine[];
  machinesNA: boolean;
  materials: string;
  materialsNA: boolean;
  problems: string;
  problemsNA: boolean;
  nextDayPlan: string;
  nextDayPlanNA: boolean;
  supervisorNotes: string;
  supervisorNotesNA: boolean;
}

export interface PDFLogData {
  date: string;
  supervisorName: string;
  status: string;
  createdAt: string;
  locationPath: string[];
  activities: PDFActivity[];
  subcontractors: PDFSub[];
  notes: PDFNotes;
  logoSrc?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionAccent} />
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

function TopBar({ log }: { log: PDFLogData }) {
  return (
    <View style={s.topBar} fixed>
      <View style={s.topBarLeft}>
        <View style={s.topBarAccent} />
        {log.logoSrc && <Image src={log.logoSrc} style={s.topBarLogo} />}
        <View>
          <Text style={s.topBarTitle}>Daily Log</Text>
          <Text style={s.topBarSub}>Premium Framing</Text>
        </View>
      </View>
      <View style={s.topBarRight}>
        <Text style={s.topBarDate}>{fmtDate(log.date)}</Text>
        <Text style={s.topBarSupervisor}>{log.supervisorName}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Premium Framing — Confidential</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

export function DailyLogPDF({ log, photos }: { log: PDFLogData; photos: PDFPhoto[] }) {
  const generalPhotos = photos.filter((p) => p.activityIndex === null);

  return (
    <Document
      title={`Daily Log — ${log.date} — ${log.supervisorName}`}
      author="Premium Framing"
      creator="Premium Framing Daily Log"
    >
      <Page size="A4" style={s.page}>
        <TopBar log={log} />

        <View style={s.body}>
          {/* Meta card */}
          <View style={s.card}>
            <View style={s.metaRow}>
              <Icon d={ICONS.calendar} color={C.muted} size={10} />
              <Text style={[s.metaText, { fontFamily: "Helvetica-Bold" }]}>{fmtDate(log.date)}</Text>
            </View>
            <View style={s.metaRow}>
              <Icon d={ICONS.user} color={C.muted} size={10} />
              <Text style={s.metaMuted}>{log.supervisorName}</Text>
            </View>
            {log.locationPath?.length > 0 && (
              <View style={[s.metaRow, { marginBottom: 0 }]}>
                <Icon d={ICONS.mapPin} color={C.primary} size={10} />
                <View style={s.breadcrumbRow}>
                  {log.locationPath.map((seg, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <Text style={s.breadcrumbSep}> › </Text>}
                      <Text style={s.breadcrumbItem}>{seg}</Text>
                    </React.Fragment>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Activities */}
          {log.activities.length > 0 && (
            <>
              <SectionHeader title="Premium Framing Activities" />
              {log.activities.map((act, i) => {
                const cfg = WORK_TYPE[act.workType] ?? WORK_TYPE["normal"];
                const actPhotos = photos.filter((p) => p.activityIndex === i);
                return (
                  <View key={i} style={[s.actCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]} wrap={false}>
                    <View style={[s.actHeader, { backgroundColor: cfg.bg }]}>
                      <View style={[s.actBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                        <Text style={[s.actBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <Text style={s.actNum}>Activity {i + 1}</Text>
                    </View>

                    <View style={s.actBody}>
                      <Text style={s.actDesc}>{act.description}</Text>

                      <View style={s.actMeta}>
                        <View style={s.actMetaItem}>
                          <Icon d={ICONS.clock} color={C.muted} size={9} />
                          <Text style={s.actMetaText}>{fmtTime(act.timeStart)} → {fmtTime(act.timeEnd)}</Text>
                        </View>
                        {actPhotos.length > 0 && (
                          <View style={s.actMetaItem}>
                            <Icon d={ICONS.camera} color={C.muted} size={9} />
                            <Text style={s.actMetaText}>{actPhotos.length} photo{actPhotos.length !== 1 ? "s" : ""}</Text>
                          </View>
                        )}
                      </View>

                      {act.workerNames.length > 0 && (
                        <View style={s.chipsRow}>
                          {act.workerNames.map((w, wi) => (
                            <View key={wi} style={s.chip}>
                              <Text style={s.chipText}>{w}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {actPhotos.length > 0 && (
                        <View style={s.photoGrid3}>
                          {actPhotos.map((p, pi) => (
                            <View key={pi} style={s.photoWrap3}>
                              <Image src={p.dataUrl} style={s.photoImg3} />
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Notes */}
          <SectionHeader title="Site Notes" />
          <View style={s.card}>
            {/* Machines */}
            <View style={s.noteBlock}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Icon d={ICONS.wrench} color={C.muted} size={9} />
                <Text style={s.noteLabel}>Machines &amp; Equipment on Site</Text>
              </View>
              {log.notes.machinesNA ? (
                <Text style={s.noteNA}>Not applicable</Text>
              ) : log.notes.machineEntries.length > 0 ? (
                log.notes.machineEntries.map((m, i) => (
                  <View key={i} style={s.machineRow}>
                    <Text style={s.machineTitle}>{m.title}</Text>
                    {m.unit ? <Text style={s.machineUnit}>{m.unit}</Text> : null}
                  </View>
                ))
              ) : (
                <Text style={s.noteNA}>—</Text>
              )}
            </View>

            {[
              { label: "Materials Delivered",  value: log.notes.materials,       na: log.notes.materialsNA },
              { label: "Problems / Delays",    value: log.notes.problems,        na: log.notes.problemsNA },
              { label: "Plan for Next Day",    value: log.notes.nextDayPlan,     na: log.notes.nextDayPlanNA },
              { label: "Notes for Supervisor", value: log.notes.supervisorNotes, na: log.notes.supervisorNotesNA },
            ].map(({ label, value, na }) => (
              <View key={label} style={s.noteBlock}>
                <Text style={s.noteLabel}>{label}</Text>
                {na ? (
                  <Text style={s.noteNA}>Not applicable</Text>
                ) : value ? (
                  <Text style={s.noteText}>{value}</Text>
                ) : (
                  <Text style={s.noteNA}>—</Text>
                )}
              </View>
            ))}
          </View>

          {/* General photos */}
          {generalPhotos.length > 0 && (
            <>
              <SectionHeader title="General Photos" />
              <View style={s.photoGrid1}>
                {generalPhotos.map((p, i) => (
                  <View key={i} style={s.photoWrap1} wrap={false}>
                    <Image src={p.dataUrl} style={s.photoImg1} />
                    <Text style={s.photoCaption}>{p.filename}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <Footer />
      </Page>
    </Document>
  );
}
