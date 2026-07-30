// Containment gate for race-reminder sending.
// Fail-closed: sending is disabled unless REMINDER_SENDING_ENABLED is exactly "true".
// Purpose-specific and deliberately independent of IMPORT_SECRET.

export function isReminderSendingEnabled(
  value: string | undefined | null,
): boolean {
  return value === "true";
}

export function reminderDisabledResponse(): Response {
  return Response.json(
    { error: "Reminder sending unavailable" },
    { status: 503 },
  );
}
