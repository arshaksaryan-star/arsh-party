import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { CERT_VALID_MONTHS, KOPILKA, makeCertCode, offerFor, validateCertificate, type CertificateRow } from "@/lib/certificates";
import { hasZvezdaAccess } from "@/lib/zvezda";
import { formatPhone } from "@/lib/lead";
import { escapeHtml, isNotifyConfigured, notifyOwner } from "@/lib/notify";
import { createPayment, isOnlinePaymentConfigured } from "@/lib/payments";
import { insertRow, isSupabaseConfigured, updateRow } from "@/lib/supabase";

/**
 * Покупка подарочного сертификата. Создаём сертификат «ждёт оплаты» с уникальным кодом.
 * Есть онлайн-оплата — отдаём ссылку на страницу банка; нет — уведомляем владельца,
 * он присылает ссылку на оплату и отмечает оплату в админке.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму. Обновите страницу." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const result = validateCertificate(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors, error: "Проверьте поля формы." }, { status: 422 });
  const input = result.input;
  // «Копилка» продаётся только на тайной странице /zvezda.
  if (input.kind === "kopilka" && !(await hasZvezdaAccess())) {
    return NextResponse.json({ error: "Этот сертификат доступен только на тайной странице." }, { status: 403 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Продажа сертификатов временно недоступна. Позвоните нам." }, { status: 503 });
  }

  const offer = offerFor(input.kind);
  let row: CertificateRow | null = null;
  for (let attempt = 0; attempt < 3 && !row; attempt++) {
    try {
      row = await insertRow<CertificateRow>("certificates", {
        code: makeCertCode((size) => randomBytes(size)),
        kind: input.kind,
        title: offer?.title ?? "Сертификат",
        amount: input.amount,
        balance: input.amount,
        buyer_name: input.buyerName,
        buyer_phone: input.buyerPhone,
        buyer_email: input.buyerEmail,
        recipient_name: input.recipientName,
        message: input.message,
        receipt_via: input.receiptVia,
        status: "pending",
        ...(input.kind === "kopilka" ? { growth_percent: KOPILKA.percent, growth_max_months: KOPILKA.maxMonths } : {}),
      });
    } catch (error) {
      // код совпал с существующим (почти невозможно) — пробуем другой
      console.error("[certificate] insert", error);
    }
  }
  if (!row) return NextResponse.json({ error: "Не получилось оформить. Попробуйте ещё раз или позвоните нам." }, { status: 502 });

  const origin = new URL(request.url).origin;
  const certUrl = `${origin}/sertifikat/${row.code}`;

  if (isNotifyConfigured()) {
    const lines = [
      `🎁 <b>Сертификат ${escapeHtml(row.code)}</b> — ${row.amount.toLocaleString("ru-RU")} ₽`,
      escapeHtml(row.title),
      ...(row.kind === "kopilka" ? [`Копилка: +${KOPILKA.percent}% шашлыком за месяц ожидания, до ${KOPILKA.maxMonths} мес.`] : []),
      "",
      `Покупатель: ${escapeHtml(row.buyer_name)}, ${escapeHtml(formatPhone(row.buyer_phone))}`,
      ...(row.buyer_email ? [`E-mail: ${escapeHtml(row.buyer_email)}`] : []),
      `Чек прислать: ${input.receiptVia === "email" && row.buyer_email ? `на e-mail ${escapeHtml(row.buyer_email)}` : `SMS на ${escapeHtml(formatPhone(row.buyer_phone))}`}`,
      ...(row.recipient_name ? [`Кому: ${escapeHtml(row.recipient_name)}`] : []),
      "",
      isOnlinePaymentConfigured()
        ? "Ждёт онлайн-оплаты."
        : `Ждёт оплаты: пришлите покупателю ссылку на оплату и отметьте «Оплачен» в админке → Сертификаты. Срок — ${CERT_VALID_MONTHS} мес. с оплаты.`,
    ];
    await notifyOwner(lines.join("\n")).catch((error) => console.error("[certificate] notify", error));
  }

  if (isOnlinePaymentConfigured()) {
    try {
      const payment = await createPayment({
        amount: row.amount,
        description: `Подарочный сертификат Arsh Party ${row.code}`,
        orderId: row.id,
        returnUrl: certUrl,
        receipt:
          input.receiptVia === "email" && input.buyerEmail ? { via: "email", email: input.buyerEmail } : { via: "sms", phone: input.buyerPhone },
      });
      await updateRow("certificates", row.id, { payment_id: payment.paymentId });
      return NextResponse.json({ ok: true, redirect: payment.confirmationUrl });
    } catch (error) {
      console.error("[certificate] payment", error);
    }
  }

  return NextResponse.json({ ok: true, pending: true, code: row.code, url: `/sertifikat/${row.code}` });
}
