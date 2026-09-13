import nodemailer, { type Transporter } from "nodemailer";

/**
 * 邮件发送（SMTP）
 *
 * 只在服务端 Route Handler 里使用：nodemailer 依赖 Node 内置模块，
 * 不能在客户端组件中 import。
 *
 * 环境变量（.env，容器由 docker-compose 的 env_file 注入）：
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
 *   MAIL_FROM（可选，缺省回落到 SMTP_USER）
 */

export class MailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailError";
  }
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: Transporter | null = null;

/** SMTP 配置是否完整；不完整时前端提示「邮件服务未配置」，而不是直接报错 */
export function isMailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new MailError("MAIL_NOT_CONFIGURED");
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host,
    port,
    // 465 走隐式 TLS；587 / 25 走 STARTTLS（nodemailer 自动升级）
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    auth: { user, pass },
  });

  return transporter;
}

/** 发送邮件；配置缺失抛 MAIL_NOT_CONFIGURED，发送失败抛 MAIL_SEND_FAILED */
export async function sendMail(msg: MailMessage): Promise<void> {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "";
  try {
    await getTransporter().sendMail({
      from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
  } catch (e) {
    if (e instanceof MailError) throw e;
    throw new MailError("MAIL_SEND_FAILED");
  }
}
