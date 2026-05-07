import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog, IDailyLog } from "@/models/DailyLog";
import { Photo } from "@/models/Photo";
import { getPhotoBuffer, photoToDataUrl } from "@/lib/storage";
import { renderToBuffer } from "@react-pdf/renderer";
import { DailyLogPDF, PDFPhoto } from "@/components/pdf/DailyLogPDF";
import React from "react";
import { DocumentProps } from "@react-pdf/renderer";

function logoDataUrl() {
  try {
    const buf = readFileSync(join(process.cwd(), "public/images/sublogo_framing.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const isAdmin = session.role === "admin" || session.role === "dev";
  const query = isAdmin ? { _id: id } : { _id: id, supervisorId: session.userId };
  const log = (await DailyLog.findOne(query).lean()) as IDailyLog | null;

  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dbPhotos = await Photo.find({ logId: id }).sort({ activityIndex: 1, createdAt: 1 }).lean();

  const baseUrl = new URL(req.url).origin;

  const pdfPhotos: PDFPhoto[] = (
    await Promise.all(
      dbPhotos.map(async (p) => {
        const buf = await getPhotoBuffer(p.storageKey);
        if (!buf) return null;
        return {
          activityIndex: p.activityIndex ?? null,
          dataUrl: photoToDataUrl(buf, p.mimetype),
          filename: p.filename,
          publicUrl: `${baseUrl}/api/photo/public?key=${encodeURIComponent(p.storageKey)}`,
        } as PDFPhoto;
      })
    )
  ).filter((p): p is PDFPhoto => p !== null);

  const pdfData = {
    date: log.date,
    supervisorName: log.supervisorName,
    status: log.status,
    createdAt: (log.createdAt as Date).toISOString(),
    locationPath: log.locationPath ?? [],
    logoSrc: logoDataUrl(),
    activities: (log.activities ?? []).map((a) => ({
      description: a.description,
      timeStart: a.timeStart,
      timeEnd: a.timeEnd,
      workType: a.workType,
      workerNames: a.workerNames,
    })),
    subcontractors: (log.subcontractors ?? []).map((s) => ({
      company: s.company,
      workerNames: s.workerNames,
      description: s.description,
    })),
    notes: {
      machineEntries:    log.notes?.machineEntries    ?? [],
      machinesNA:        log.notes?.machinesNA        ?? false,
      materials:         log.notes?.materials         ?? "",
      materialsNA:       log.notes?.materialsNA       ?? false,
      problems:          log.notes?.problems          ?? "",
      problemsNA:        log.notes?.problemsNA        ?? false,
      nextDayPlan:       log.notes?.nextDayPlan       ?? "",
      nextDayPlanNA:     log.notes?.nextDayPlanNA     ?? false,
      supervisorNotes:   log.notes?.supervisorNotes   ?? "",
      supervisorNotesNA: log.notes?.supervisorNotesNA ?? false,
    },
  };

  // renderToBuffer expects ReactElement<DocumentProps>; DailyLogPDF renders <Document> at root
  const element = React.createElement(DailyLogPDF, {
    log: pdfData,
    photos: pdfPhotos,
  }) as unknown as React.ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(element);

  const filename = `daily-log-${log.date}-${log.supervisorName.replace(/\s+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
