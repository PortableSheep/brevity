import { authApp } from "./supabase.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before starting`);
  return value;
}

authApp({
  origin: required("APP_ORIGIN"),
  supabaseUrl: required("SUPABASE_URL"),
  publishableKey: required("SUPABASE_PUBLISHABLE_KEY"),
}).listen(Number(process.env.PORT ?? 3000));
