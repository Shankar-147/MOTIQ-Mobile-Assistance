/** "GENERAL_SERVICE" -> "General Service" — a display label for a backend enum value. */
export function enumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
