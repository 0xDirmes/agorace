"use client";

import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { porto } from "porto/wagmi";
import { Mode } from "porto";
import { arbitrumSepolia } from "./chains";

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    porto({
      mode: Mode.relay(),
      merchantUrl: "/api/porto/merchant",
    }),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
