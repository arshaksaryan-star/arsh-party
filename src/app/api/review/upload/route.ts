import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { checkMediaFile, mediaExtension, REVIEW_MEDIA } from "@/lib/site-review";
import { createSignedUploadUrl, isSupabaseConfigured, REVIEW_BUCKET } from "@/lib/supabase";

/**
 * Выдаёт одноразовые ссылки для загрузки фото и видео к отзыву.
 * Браузер загружает файлы прямо в закрытое хранилище Supabase, затем отправляет отзыв с путями файлов.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Прикрепить файлы сейчас нельзя. Отправьте отзыв без них." }, { status: 503 });
  }

  let files: { type?: unknown; size?: unknown }[];
  try {
    const body = (await request.json()) as { files?: unknown };
    files = Array.isArray(body.files) ? body.files : [];
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать запрос." }, { status: 400 });
  }
  if (files.length === 0 || files.length > REVIEW_MEDIA.maxFiles) {
    return NextResponse.json({ error: `Можно прикрепить до ${REVIEW_MEDIA.maxFiles} файлов.` }, { status: 422 });
  }

  const uploads: { path: string; uploadUrl: string }[] = [];
  for (const file of files) {
    const type = typeof file.type === "string" ? file.type : "";
    const size = typeof file.size === "number" ? file.size : Number.POSITIVE_INFINITY;
    const problem = checkMediaFile({ type, size });
    if (problem) return NextResponse.json({ error: problem }, { status: 422 });
    const path = `pending/${randomUUID()}.${mediaExtension(type)}`;
    try {
      uploads.push({ path, uploadUrl: await createSignedUploadUrl(REVIEW_BUCKET, path) });
    } catch (error) {
      console.error("[review] sign upload:", error);
      return NextResponse.json({ error: "Не получилось подготовить загрузку. Попробуйте ещё раз или отправьте отзыв без файлов." }, { status: 502 });
    }
  }
  return NextResponse.json({ uploads });
}
