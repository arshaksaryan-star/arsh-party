import { NextResponse } from "next/server";
import { endCustomerSession } from "@/lib/customer-session";

export async function POST() {
  await endCustomerSession();
  return NextResponse.json({ ok: true });
}
