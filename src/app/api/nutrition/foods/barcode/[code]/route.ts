import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { lookupNutritionBarcode } from "@/modules/nutrition/services/catalog-search.service";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    await requireNutritionUser(request);
    const { code } = await context.params;
    const { item, source } = await lookupNutritionBarcode(code);

    if (!item) {
      return NextResponse.json({ item: null, source }, { status: 404 });
    }

    return NextResponse.json({ item, source });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Barcode lookup failed",
      unexpectedStatus: 500,
    });
  }
}
