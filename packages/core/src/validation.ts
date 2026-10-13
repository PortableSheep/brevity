export type ValidationRules = Record<string, string | string[]>;

export type ValidationResult = {
  passes: () => boolean;
  fails: () => boolean;
  errors: () => Record<string, string[]>;
  validated: () => Record<string, unknown>;
};

export function validateRules(
  accessor: (field: string) => unknown,
  rules: ValidationRules,
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const data: Record<string, unknown> = {};

  for (const [field, rawRules] of Object.entries(rules)) {
    const value = accessor(field);
    data[field] = value;
    const list = Array.isArray(rawRules) ? rawRules : String(rawRules).split("|");
    for (const rule of list) {
      const parts = String(rule).split(":");
      const [name, param] = parts;
      if (!["required", "email", "int", "slug", "min", "max"].includes(name)) {
        throw new TypeError(`Unknown validation rule "${name}" for "${field}".`);
      }
      const bounded = name === "min" || name === "max";
      if (
        parts.length > 2 ||
        (bounded
          ? param === undefined || !/^\d+$/.test(param) || !Number.isSafeInteger(Number(param))
          : param !== undefined)
      ) {
        throw new TypeError(`Invalid validation rule "${rule}" for "${field}".`);
      }
      if (!passes(name, value, param)) {
        errors[field] = errors[field] ?? [];
        errors[field].push(message(field, name, param));
      }
    }
  }

  return {
    passes: () => Object.keys(errors).length === 0,
    fails: () => Object.keys(errors).length > 0,
    errors: () => errors,
    validated: () => data,
  };
}

export class Validator {
  validate(data: Record<string, unknown>, rules: ValidationRules): ValidationResult {
    return validateRules((field) => data[field], rules);
  }
}

function passes(rule: string, value: unknown, param?: string): boolean {
  if (rule === "required") return value !== undefined && value !== null && value !== "";
  if (rule === "email") return value == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
  if (rule === "int") return value == null || /^-?\d+$/.test(String(value));
  if (rule === "slug") return value == null || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value));
  if (rule === "min") return value == null || String(value).length >= Number(param || 0);
  if (rule === "max") return value == null || String(value).length <= Number(param || 0);
  return true;
}

function message(field: string, rule: string, param?: string): string {
  if (rule === "required") return `${field} is required.`;
  if (rule === "email") return `${field} must be a valid email.`;
  if (rule === "int") return `${field} must be an integer.`;
  if (rule === "slug") return `${field} must be a slug.`;
  if (rule === "min") return `${field} must be at least ${param}.`;
  if (rule === "max") return `${field} must be at most ${param}.`;
  return `${field} is invalid.`;
}
