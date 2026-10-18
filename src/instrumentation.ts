// Next.js server xatolari (sahifa, server amali, route handler ichida ushlanmagan xato): monitoringga.
// API route'larining kutilgan xatolari handle() ichida ushlanadi va bu yerga kelmaydi (session.ts, errorResponse)
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { captureError } = await import("./lib/monitoring");
  await captureError(error, {
    area: "next",
    method: request.method,
    path: request.path.split("?")[0],
    routePath: context.routePath,
    routeType: context.routeType,
    digest: (error as { digest?: string }).digest,
  });
};
