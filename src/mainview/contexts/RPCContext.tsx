import { createContext, useContext, ReactNode } from 'react';
import { createRPC, Electroview } from 'electrobun/view';
import type { SelectorSchema } from '../types/index';

type LocalSchema = {
    requests: SelectorSchema['webview']['requests'];
    messages: SelectorSchema['bun']['messages'];
};

type RemoteSchema = {
    requests: SelectorSchema['bun']['requests'];
    messages: SelectorSchema['webview']['messages'];
};

type RPC = ReturnType<typeof createRPC<LocalSchema, RemoteSchema>>;

const RPCContext = createContext<RPC | null>(null);

let globalRpc: RPC | null = null;

function getRpc() {
    if (!globalRpc) {
        globalRpc = createRPC<LocalSchema, RemoteSchema>({
            maxRequestTime: 5000,
        });
        new Electroview({ rpc: globalRpc });
    }
    return globalRpc;
}

export { getRpc as getRPC };

export function RPCProvider({ children }: { children: ReactNode }) {
    const rpc = getRpc();
    return <RPCContext.Provider value={rpc}>{children}</RPCContext.Provider>;
}

export function useRPC(): RPC {
    const rpc = useContext(RPCContext);
    if (!rpc) {
        throw new Error('useRPC must be used within an RPCProvider');
    }
    return rpc;
}
