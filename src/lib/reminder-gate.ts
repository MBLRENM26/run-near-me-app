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
    {
      error: "Reminder sending disabled",
      detail:
        "Race-reminder sending is disabled by containment policy. Set REMINDER_SENDING_ENABLED=\"true\" to re-enable.",
    },
    { status: 503 },
  );
}
