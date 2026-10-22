/** Uses the hour supplied by the user's device, never the server's timezone. */
export function getGreeting(hour: number, displayName = ""): string {
  const name = displayName.trim().slice(0, 40);
  const suffix = name ? `, ${name}` : "";
  if (hour >= 5 && hour < 12) return `Good morning${suffix}.`;
  if (hour >= 12 && hour < 17) return `Good afternoon${suffix}.`;
  if (hour >= 17 && hour < 21) return `Good evening${suffix}.`;
  return `It’s a late-night jam session${suffix}.`;
}
