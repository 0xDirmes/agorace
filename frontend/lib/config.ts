"use client";

import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { porto } from "porto/wagmi";
import { arbitrumSepolia } from "./chains";

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    porto({
      merchantUrl: "/api/porto/merchant",
    }),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [arbitrumSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
