import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { getToken, setToken } from "../lib/api";
import { siweLogin } from "../lib/auth";

const ADDR_KEY = "dhow.jwt.addr";

export interface Session {
  address?: string;
  isConnected: boolean;
  authed: boolean;
  busy: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

export function useSession(): Session {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();
  const [token, setTok] = useState<string | null>(getToken());
  const [busy, setBusy] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(ADDR_KEY);
    setTok(null);
    disconnect();
  }, [disconnect]);

  // Security: the token belongs to one wallet. If the connected account changes
  // to a different address, drop the session so the new wallet must sign in.
  useEffect(() => {
    if (!token || !address) return;
    const authedAddr = localStorage.getItem(ADDR_KEY);
    if (authedAddr && authedAddr !== address.toLowerCase()) {
      setToken(null);
      localStorage.removeItem(ADDR_KEY);
      setTok(null);
    }
  }, [address, token]);

  const login = useCallback(async () => {
    setBusy(true);
    try {
      let addr = address;
      if (!addr) {
        const connector = connectors[0];
        if (!connector) throw new Error("No wallet connector found");
        const res = await connectAsync({ connector });
        addr = res.accounts[0];
      }
      if (!addr) throw new Error("No account");
      const t = await siweLogin({
        address: addr,
        chainId,
        signMessage: (message) => signMessageAsync({ message }),
      });
      localStorage.setItem(ADDR_KEY, addr.toLowerCase());
      setTok(t);
    } finally {
      setBusy(false);
    }
  }, [address, connectors, connectAsync, chainId, signMessageAsync]);

  return { address, isConnected, authed: Boolean(token), busy, login, logout };
}
