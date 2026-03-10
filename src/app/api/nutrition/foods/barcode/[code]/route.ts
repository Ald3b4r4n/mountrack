import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";
import { lookupNutritionBarcode } from "@/modules/nutrition/services/catalog-search.service";
import { barcodeLookupParamsSchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { user } = await requireNutritionUser(request);
    const { code } = barcodeLookupParamsSchema.parse(await context.params);
    const { item, source } = await lookupNutritionBarcode(user.uid, code);

    if (!item) {
      return NextResponse.json({ item: null, source }, { status: 404, headers: getNutritionStorageHeaders() });
    }

    return NextResponse.json({ item, source }, { headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Barcode lookup failed",
      unexpectedStatus: 500,
    });
  }
}
