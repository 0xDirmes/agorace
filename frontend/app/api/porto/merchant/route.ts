import { Route, Router } from "porto/server";

const route = Router({ basePath: "/api/porto" }).route(
  "/merchant",
  Route.merchant({
    address: process.env.MERCHANT_ADDRESS as `0x${string}`,
    key: process.env.MERCHANT_PRIVATE_KEY as `0x${string}`,
    sponsor: true,
  }),
);

export const GET = route.fetch;
export const OPTIONS = route.fetch;
export const POST = route.fetch;
