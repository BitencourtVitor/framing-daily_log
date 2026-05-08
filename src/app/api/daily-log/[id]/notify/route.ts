import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";
import { Photo } from "@/models/Photo";
import { EmailConfig } from "@/models/EmailConfig";
import { getPhotoBuffer } from "@/lib/storage";
import { sendDailyLogEmail, sendBackChargeEmail, type EmailPhoto } from "@/lib/email";

function extFrom(filename: string, mimetype: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    const ext = parts.pop()!.toLowerCase();
    if (ext.length <= 5) return ext;
  }
  const sub = mimetype.split("/")[1] ?? "jpg";
  return sub === "jpeg" ? "jpg" : sub;
}

const WORK_TYPE_LABEL: Record<string, string> = {
  normal:        "Normal",
  "back-charge": "Back Charge",
  extra:         "Extra",
  warranty:      "Warranty",
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const log = await DailyLog.findById(id).lean();
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [photos, config] = await Promise.all([
    Photo.find({ logId: id }).lean(),
    EmailConfig.findOne().lean(),
  ]);

  if (!config || (!config.dlRecipients.length && !config.bcRecipients.length)) {
    return NextResponse.json({ ok: true, skipped: "no recipients" });
  }

  // Fetch all buffers in parallel
  const resolved = await Promise.all(
    photos.map(async (p) => ({ photo: p, buffer: await getPhotoBuffer(p.storageKey) }))
  );

  // Build photo lists per category
  const generalPhotos: EmailPhoto[] = [];
  const activityPhotoMap = new Map<number, EmailPhoto[]>();
  const generalCounter = { n: 0 };
  const activityCounters = new Map<number, number>();

  for (const { photo, buffer } of resolved) {
    if (!buffer) continue;
    const ext = extFrom(photo.filename, photo.mimetype);

    if (photo.activityIndex === null || photo.activityIndex === undefined) {
      generalCounter.n++;
      generalPhotos.push({
        filename: `General Photo ${generalCounter.n}.${ext}`,
        buffer,
        mimetype: photo.mimetype,
      });
    } else {
      const idx = photo.activityIndex as number;
      const n = (activityCounters.get(idx) ?? 0) + 1;
      activityCounters.set(idx, n);
      const activity = log.activities[idx];
      const label = activity ? (WORK_TYPE_LABEL[activity.workType] ?? activity.workType) : `Activity ${idx + 1}`;
      const ep: EmailPhoto = {
        filename: `Activity ${idx + 1} - ${label} - Photo ${n}.${ext}`,
        buffer,
        mimetype: photo.mimetype,
      };
      if (!activityPhotoMap.has(idx)) activityPhotoMap.set(idx, []);
      activityPhotoMap.get(idx)!.push(ep);
    }
  }

  const allActivityPhotos = Array.from(activityPhotoMap.values()).flat();
  const allPhotos = [...generalPhotos, ...allActivityPhotos];

  const emailLog = {
    supervisorName: log.supervisorName,
    date:           log.date,
    locationPath:   log.locationPath ?? [],
    workers:        log.workers,
    activities:     log.activities.map((a) => ({
      workType:     a.workType,
      description:  a.description,
      timeStart:    a.timeStart,
      timeEnd:      a.timeEnd,
      workerNames:  a.workerNames ?? [],
      chargeableSub: a.chargeableSub,
    })),
    subcontractors: log.subcontractors ?? [],
    notes:          log.notes,
  };

  const sends: Promise<void>[] = [];

  if (config.dlRecipients.length) {
    sends.push(
      sendDailyLogEmail({ to: config.dlRecipients, log: emailLog, photos: allPhotos })
        .catch((e) => console.error("[email:DL]", e))
    );
  }

  if (config.bcRecipients.length) {
    log.activities.forEach((activity, idx) => {
      if (activity.workType !== "back-charge") return;
      const bcPhotos = activityPhotoMap.get(idx) ?? [];
      sends.push(
        sendBackChargeEmail({
          to:            config.bcRecipients,
          log:           emailLog,
          activity: {
            workType:     activity.workType,
            description:  activity.description,
            timeStart:    activity.timeStart,
            timeEnd:      activity.timeEnd,
            workerNames:  activity.workerNames ?? [],
            chargeableSub: activity.chargeableSub,
          },
          activityIndex: idx,
          photos:        bcPhotos,
        }).catch((e) => console.error(`[email:BC:${idx}]`, e))
      );
    });
  }

  await Promise.all(sends);

  return NextResponse.json({ ok: true });
}
