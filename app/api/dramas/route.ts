import { NextResponse } from "next/server";
import { getAllDramas } from "@/lib/dramas";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAllDramas());
}
