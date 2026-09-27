import { apiSuccess } from "../../../../../lib/http/response";

export async function GET() {
  return apiSuccess({
    status: "ok",
    service: "zsite",
    version: "v1",
    timestamp: new Date().toISOString(),
  });
}
