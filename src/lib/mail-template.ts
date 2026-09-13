import { formatYuan } from "@/lib/format-money";

/**
 * 券码邮件模板（HTML + 纯文本双版本）
 *
 * 内容全部由服务端按券码查库组装，不接收客户端传来的商品信息。
 */

export interface VoucherMailData {
  code: string;
  dealTitle: string;
  price: number;
  originalPrice: number;
  address: string;
  area: string;
  includes: string[];
}

const BRAND = "CQ LOCAL";

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderVoucherSubject(data: VoucherMailData): string {
  return `Your ${BRAND} voucher ${data.code} — ${data.dealTitle}`;
}

export function renderVoucherText(data: VoucherMailData): string {
  const lines = [
    `${BRAND} — Voucher`,
    "",
    `Deal: ${data.dealTitle}`,
    data.originalPrice > data.price
      ? `Price paid: ${formatYuan(data.price)} (was ${formatYuan(data.originalPrice)})`
      : `Price paid: ${formatYuan(data.price)}`,
    `Voucher code: ${data.code}`,
  ];

  if (data.address) lines.push(`Address: ${data.address}`);
  if (data.area) lines.push(`Area: ${data.area}`);

  if (data.includes.length) {
    lines.push("", "What's included:");
    for (const item of data.includes) lines.push(`- ${item}`);
  }

  lines.push(
    "",
    "How to redeem: show this voucher code to reception or the merchant.",
    "",
    "This voucher is non-transferable and cannot be exchanged for cash.",
  );

  return lines.join("\n");
}

export function renderVoucherHtml(data: VoucherMailData): string {
  const esc = (s: string) => escapeHtml(s);

  const oldPrice =
    data.originalPrice > data.price
      ? `<span style="font-size:14px;color:#9aa3af;text-decoration:line-through;margin-left:6px;">${esc(formatYuan(data.originalPrice))}</span>`
      : "";

  const meta: string[] = [];
  if (data.address) meta.push(row("Address", esc(data.address)));
  if (data.area) meta.push(row("Area", esc(data.area)));

  const includes = data.includes.length
    ? `<tr><td style="padding:18px 24px 0;">
         <div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:#ff5b36;">WHAT&apos;S INCLUDED</div>
         <ul style="margin:8px 0 0;padding-left:18px;color:#d8dde5;font-size:14px;line-height:1.7;">
           ${data.includes.map((i) => `<li>${esc(i)}</li>`).join("")}
         </ul>
       </td></tr>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#0d0f12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;margin:0 auto;background:#171a1f;border:1px solid #2a2f37;border-radius:18px;color:#fff;">
      <tr>
        <td style="padding:22px 24px 0;">
          <div style="font-size:12px;letter-spacing:.2em;font-weight:900;color:#ffd0c4;">${BRAND}</div>
          <h1 style="font-size:22px;line-height:1.25;margin:8px 0 0;font-weight:800;">${esc(data.dealTitle)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <span style="font-size:28px;font-weight:900;">${esc(formatYuan(data.price))}</span>${oldPrice}
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px 0;">
          <div style="background:#0d0f12;border:1px dashed #3a414c;border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:#9aa3af;letter-spacing:.1em;font-weight:700;">VOUCHER CODE</div>
            <div style="font-size:30px;font-weight:900;letter-spacing:.08em;margin-top:6px;">${esc(data.code)}</div>
          </div>
        </td>
      </tr>
      ${meta.length ? `<tr><td style="padding:18px 24px 0;"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">${meta.join("")}</table></td></tr>` : ""}
      ${includes}
      <tr>
        <td style="padding:18px 24px 0;">
          <div style="font-size:13px;line-height:1.6;color:#d8dde5;">Show this voucher code to reception or the merchant to redeem.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px 24px;">
          <div style="font-size:12px;line-height:1.6;color:#747b86;">This voucher is non-transferable and cannot be exchanged for cash.</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:12px;color:#747b86;width:76px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#d8dde5;vertical-align:top;">${value}</td>
  </tr>`;
}
