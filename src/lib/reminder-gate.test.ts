import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isReminderSendingEnabled,
  reminderDisabledResponse,
} from "./reminder-gate";

describe("isReminderSendingEnabled", () => {
  it("only the exact string 'true' enables sending", () => {
    expect(isReminderSendingEnabled("true")).toBe(true);
    for (const v of [
      undefined,
      null,
      "",
      " ",
      "TRUE",
      "True",
      "1",
      "yes",
      "false",
      "true ",
    ]) {
      expect(isReminderSendingEnabled(v as any)).toBe(false);
    }
  });

  it("disabled response is non-2xx and explains why", async () => {
    const res = reminderDisabledResponse();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Reminder sending disabled");
  });
});

// Prove the handler rejects before auth / db / email side effects.
const supabaseAdmin = { from: vi.fn() };
const sendRaceEmail = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return supabaseAdmin;
  },
}));
vi.mock("@/lib/race-email.server", () => ({
  sendRaceEmail: (...args: unknown[]) => sendRaceEmail(...args),
}));

async function getHandler() {
  const mod = await import("@/routes/api/public/hooks/send-race-reminders");
  const server: any = (mod.Route as any).options?.server ?? (mod.Route as any).server;
  return server.handlers.POST as (ctx: { request: Request }) => Promise<Response>;
}

function req(headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/public/hooks/send-race-reminders", {
    method: "POST",
    headers,
  });
}

describe("send-race-reminders enable gate", () => {
  const original = { ...process.env };

  beforeEach(() => {
    supabaseAdmin.from.mockReset();
    sendRaceEmail.mockReset();
    process.env.IMPORT_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("rejects with 503 before any side effect when flag is missing", async () => {
    delete process.env.REMINDER_SENDING_ENABLED;
    const res = await (await getHandler())(
      { request: req({ "x-admin-secret": "test-secret" }) },
    );
    expect(res.status).toBe(503);
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
    expect(sendRaceEmail).not.toHaveBeenCalled();
  });

  it("rejects with 503 when flag is 'false' or empty", async () => {
    for (const v of ["false", "", "1"]) {
      process.env.REMINDER_SENDING_ENABLED = v;
      const res = await (await getHandler())(
        { request: req({ "x-admin-secret": "test-secret" }) },
      );
      expect(res.status).toBe(503);
    }
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
    expect(sendRaceEmail).not.toHaveBeenCalled();
  });

  it("with exact 'true' it reaches the existing auth boundary and still sends nothing", async () => {
    process.env.REMINDER_SENDING_ENABLED = "true";
    const res = await (await getHandler())({ request: req() }); // no secret header
    expect(res.status).toBe(401);
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
    expect(sendRaceEmail).not.toHaveBeenCalled();
  });
});
