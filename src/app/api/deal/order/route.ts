import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  getOrder,
  markPaid,
} from "@/lib/deals";

// 建单：POST /api/deal/order  body: { dealId: number }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dealId = Number(body?.dealId);
    if (!Number.isInteger(dealId)) {
      return NextResponse.json({ error: "INVALID_DEAL_ID" }, { status: 400 });
    }
    const order = await createOrder(dealId);
    return NextResponse.json(order);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CREATE_ORDER_FAILED";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 查单：GET /api/deal/order?code=XXXX
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "MISSING_CODE" }, { status: 400 });
  }
  const order = await getOrder(code);
  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(order);
}

// 标记已付：PATCH /api/deal/order  body: { code: string }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code ?? "");
    if (!code) {
      return NextResponse.json({ error: "MISSING_CODE" }, { status: 400 });
    }
    const order = await markPaid(code);
    return NextResponse.json(order);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "MARK_PAID_FAILED";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
