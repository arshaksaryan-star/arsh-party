import "server-only";

/**
 * Онлайн-оплата сертификатов через эквайринг банка владельца.
 * Банк — Точка (14.11.2026), подключаем: адаптер появится после получения ключа API: пока онлайн-оплаты нет, сертификат создаётся
 * «ждёт оплаты», владелец получает уведомление, присылает ссылку на оплату сам
 * и в админке нажимает «Оплачен». Когда банк подключим, здесь появится его адаптер.
 */

export function isOnlinePaymentConfigured(): boolean {
  return false;
}

/** receipt — куда банк/касса пришлёт чек по 54-ФЗ: e-mail или телефон (SMS). */
export type PaymentRequest = {
  amount: number;
  description: string;
  orderId: string;
  returnUrl: string;
  receipt: { via: "email"; email: string } | { via: "sms"; phone: string };
};
export type PaymentStart = { paymentId: string; confirmationUrl: string };

export async function createPayment(request: PaymentRequest): Promise<PaymentStart> {
  void request;
  throw new Error("Онлайн-оплата ещё не подключена");
}
