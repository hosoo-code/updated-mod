import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { err, withSecurity } from "./security";

type Handler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  ctx: { params: Promise<P> }
) => Promise<NextResponse>;

/**
 * API route wrapper:
 * - Same-origin (CSRF) шалгалт + rate limiting
 * - AuthError / ZodError-г зөв Монгол мессежтэй JSON болгоно
 */
export function withApi<P extends Record<string, string>>(
  handler: Handler<P>
): Handler<P> {
  return async (req, ctx) => {
    const sec = withSecurity(req, "api", 120);
    if (sec) return sec;
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof AuthError) {
        return err(e.message, e.status);
      }
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return err(first?.message ?? "Мэдээлэл буруу байна.", 400);
      }
      console.error("[api]", e);
      return err("Серверийн алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.", 500);
    }
  };
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Хүсэлтийн формат буруу байна.");
  }
}
