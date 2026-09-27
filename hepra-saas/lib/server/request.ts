import { headers } from "next/headers";

export async function getRequestId(): Promise<string> {
  const value = (await headers()).get("x-request-id");
  return value || crypto.randomUUID();
}
