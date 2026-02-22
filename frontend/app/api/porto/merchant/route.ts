import { Route, Router } from "porto/server";
import { NextRequest, NextResponse } from "next/server";

const route = Router({ basePath: "/api/porto" }).route(
  "/merchant",
  Route.merchant({
    address: process.env.MERCHANT_ADDRESS as `0x${string}`,
    key: process.env.MERCHANT_PRIVATE_KEY as `0x${string}`,
    sponsor: true,
  }),
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://id.porto.sh",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function withCors(request: NextRequest) {
  const response = await route.fetch(request);
  const newResponse = new NextResponse(response.body, response);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}

export const GET = withCors;
export const POST = withCors;
