import { apiSuccess } from "../../../lib/http/response";

export async function GET() {
  return apiSuccess({
    status: "ok",
    service: "zsite",
    timestamp: new Date().toISOString(),
  });
}
