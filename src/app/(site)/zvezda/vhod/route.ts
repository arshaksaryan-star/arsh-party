import { NextResponse } from "next/server";
import { checkZvezdaPassword, createZvezdaToken, ZVEZDA_COOKIE, zvezdaCookieSecure } from "@/lib/zvezda";

/** QR с визитки: /zvezda/vhod?k=пароль → вход на 30 дней и переход на тайную страницу. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("k") ?? "";
  const target = new URL("/zvezda", url);
  if (!checkZvezdaPassword(key)) {
    target.searchParams.set("oops", "1");
    return NextResponse.redirect(target, 303);
  }
  const response = NextResponse.redirect(target, 303);
  const { token, expires } = createZvezdaToken();
  response.cookies.set(ZVEZDA_COOKIE, token, { httpOnly: true, secure: await zvezdaCookieSecure(), sameSite: "lax", path: "/", expires });
  return response;
}
