import { Electroview } from "electrobun/view";
import type { AppRPC } from "..";

// Define and export the typed RPC client
export const rpcClient = Electroview.defineRPC<AppRPC>({
  handlers: {
    requests: {},
  },
});