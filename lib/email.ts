import net from "node:net";
import tls from "node:tls";

type EmailAddress = {
  email: string;
  name?: string | null;
};

type SendEmailInput = {
  to: EmailAddress;
  subject: string;
  text: string;
  html: string;
};

type SmtpResponse = {
  code: number;
  message: string;
};

type EmailDeliveryResult = {
  sent: boolean;
  provider: "smtp" | "disabled";
  message?: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

type ReaderState = {
  buffer: string;
};

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === "true" ? 465 : 587));
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || user;
  const secure = process.env.SMTP_SECURE === "true";
  const requireTls = process.env.SMTP_REQUIRE_TLS !== "false";
  if (!host || !user || !pass || !from) return null;
  return { host, port, user, pass, from, secure, requireTls };
}

function parseAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function formatAddress(address: EmailAddress | string) {
  if (typeof address === "string") return address;
  const cleanEmail = address.email.replace(/[<>\r\n]/g, "").trim();
  const cleanName = address.name?.replace(/["\r\n]/g, "").trim();
  return cleanName ? `"${cleanName}" <${cleanEmail}>` : cleanEmail;
}

function encodeHeader(value: string) {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function escapeData(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function renderMessage(input: SendEmailInput, from: string) {
  const boundary = `sentinelle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return [
    `From: ${formatAddress(from)}`,
    `To: ${formatAddress(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@sentinelle.local>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    "",
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

function parseResponse(buffer: string): { response: SmtpResponse; rest: string } | null {
  const parts = buffer.split(/\r?\n/);
  let consumed = 0;
  let currentCode: string | null = null;
  const lines: string[] = [];

  for (const line of parts) {
    if (!line) {
      consumed += line.length + 2;
      continue;
    }
    const match = line.match(/^(\d{3})([\s-])(.*)$/);
    if (!match) break;
    currentCode ??= match[1];
    if (match[1] !== currentCode) break;
    lines.push(line);
    consumed += line.length + 2;
    if (match[2] === " ") {
      return {
        response: { code: Number(match[1]), message: lines.join("\n") },
        rest: buffer.slice(consumed)
      };
    }
  }

  return null;
}

async function readResponse(socket: SmtpSocket, state: ReaderState): Promise<SmtpResponse> {
  for (;;) {
    const parsed = parseResponse(state.buffer);
    if (parsed) {
      state.buffer = parsed.rest;
      return parsed.response;
    }

    const chunk = await new Promise<Buffer>((resolve, reject) => {
      const onData = (data: Buffer) => {
        cleanup();
        resolve(data);
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        socket.off("data", onData);
        socket.off("error", onError);
      };
      socket.once("data", onData);
      socket.once("error", onError);
    });
    state.buffer += chunk.toString("utf8");
  }
}

async function expect(socket: SmtpSocket, state: ReaderState, expected: number[]) {
  const response = await readResponse(socket, state);
  if (!expected.includes(response.code)) {
    throw new Error(`SMTP ${response.code}: ${response.message}`);
  }
  return response;
}

async function command(socket: SmtpSocket, state: ReaderState, line: string, expected: number[]) {
  socket.write(`${line}\r\n`);
  return expect(socket, state, expected);
}

async function connectSmtp(config: NonNullable<ReturnType<typeof smtpConfig>>) {
  const state: ReaderState = { buffer: "" };
  let socket: SmtpSocket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host })
    : net.connect({ host: config.host, port: config.port });

  await new Promise<void>((resolve, reject) => {
    const event = config.secure ? "secureConnect" : "connect";
    socket.once(event, () => resolve());
    socket.once("error", reject);
  });

  await expect(socket, state, [220]);
  await command(socket, state, `EHLO ${process.env.SMTP_EHLO_DOMAIN || "sentinelle.local"}`, [250]);

  if (!config.secure && config.requireTls) {
    await command(socket, state, "STARTTLS", [220]);
    socket = tls.connect({ socket, servername: config.host });
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", () => resolve());
      socket.once("error", reject);
    });
    state.buffer = "";
    await command(socket, state, `EHLO ${process.env.SMTP_EHLO_DOMAIN || "sentinelle.local"}`, [250]);
  }

  const auth = Buffer.from(`\u0000${config.user}\u0000${config.pass}`, "utf8").toString("base64");
  await command(socket, state, `AUTH PLAIN ${auth}`, [235]);
  return { socket, state };
}

export async function sendEmail(input: SendEmailInput): Promise<EmailDeliveryResult> {
  const config = smtpConfig();
  if (!config) {
    return {
      sent: false,
      provider: "disabled",
      message: "SMTP non configuré. Renseignez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS et SMTP_FROM dans Render."
    };
  }

  const { socket, state } = await connectSmtp(config);
  try {
    await command(socket, state, `MAIL FROM:<${parseAddress(config.from)}>`, [250]);
    await command(socket, state, `RCPT TO:<${input.to.email}>`, [250, 251]);
    await command(socket, state, "DATA", [354]);
    socket.write(`${escapeData(renderMessage(input, config.from))}\r\n.\r\n`);
    await expect(socket, state, [250]);
    await command(socket, state, "QUIT", [221]);
    return { sent: true, provider: "smtp" };
  } finally {
    socket.end();
  }
}

export async function sendInvitationEmail(input: {
  to: EmailAddress;
  inviterName: string;
  companyName: string;
  activationUrl: string;
  expiresAt: Date;
}) {
  const subject = "Invitation SENTINELLE";
  const text = [
    `Bonjour ${input.to.name || ""}`.trim(),
    "",
    `${input.inviterName} vous invite à rejoindre SENTINELLE pour ${input.companyName}.`,
    "Vous pouvez créer votre mot de passe avec le lien sécurisé ci-dessous :",
    input.activationUrl,
    "",
    `Ce lien expire le ${input.expiresAt.toLocaleDateString("fr-FR")} à ${input.expiresAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
    "",
    "Si vous n'êtes pas concerné, vous pouvez ignorer ce message."
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111722">
      <h1 style="font-size:22px;color:#124740">Invitation SENTINELLE</h1>
      <p>Bonjour ${input.to.name || ""},</p>
      <p><strong>${input.inviterName}</strong> vous invite à rejoindre SENTINELLE pour <strong>${input.companyName}</strong>.</p>
      <p><a href="${input.activationUrl}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Créer mon mot de passe</a></p>
      <p style="font-size:13px;color:#526179">Ce lien expire le ${input.expiresAt.toLocaleDateString("fr-FR")} à ${input.expiresAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.</p>
      <p style="font-size:13px;color:#526179">Si le bouton ne fonctionne pas, copiez ce lien :<br>${input.activationUrl}</p>
    </div>
  `;

  return sendEmail({ to: input.to, subject, text, html });
}
