export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> };

export function requiredString(value: unknown, field: string): string[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [`${field} is required.`];
  }
  return [];
}

export function validateObject<T extends Record<string, unknown>>(
  input: unknown,
  rules: Partial<Record<keyof T, (value: unknown) => string[]>>,
): ValidationResult<T> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { success: false, errors: { _form: ["Request body must be an object."] } };
  }

  const errors: Record<string, string[]> = {};
  const source = input as Record<string, unknown>;

  for (const [field, rule] of Object.entries(rules)) {
    if (!rule) continue;
    const messages = rule(source[field]);
    if (messages.length) errors[field] = messages;
  }

  return Object.keys(errors).length
    ? { success: false, errors }
    : { success: true, data: source as T };
}
