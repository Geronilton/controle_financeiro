import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sessao";
const SESSION_DURATION = 60 * 60 * 24 * 7;

const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET não configurado.");
}

const KEY = crypto
  .createHash("sha256")
  .update(SESSION_SECRET)
  .digest();

function criptografar(usuarioId: number): string {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    KEY,
    iv
  );

  const texto = usuarioId.toString();

  const encrypted = Buffer.concat([
    cipher.update(texto, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
}

function descriptografar(valor: string): number | null {
  try {
    const partes = valor.split(".");

    if (partes.length !== 3) {
      return null;
    }

    const [ivHex, tagHex, encryptedHex] = partes;

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      KEY,
      iv
    );

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const usuarioId = Number(
      decrypted.toString("utf8")
    );

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return null;
    }

    return usuarioId;
  } catch {
    return null;
  }
}

export async function criarSessao(usuarioId: number) {
  const cookieStore = await cookies();

  const sessao = criptografar(usuarioId);

  cookieStore.set(COOKIE_NAME, sessao, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function obterUsuarioId(): Promise<number | null> {
  const cookieStore = await cookies();

  const cookie = cookieStore.get(COOKIE_NAME);

  if (!cookie) {
    return null;
  }

  return descriptografar(cookie.value);
}

export async function exigirUsuarioId(): Promise<number> {
  const usuarioId = await obterUsuarioId();

  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }

  return usuarioId;
}

export async function encerrarSessao() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}