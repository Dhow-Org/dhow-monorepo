import { api, setToken } from "./api";

/** Build an EIP-4361 (Sign-In With Ethereum) message the backend can parse. */
function buildSiweMessage(p: {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}): string {
  return [
    `${p.domain} wants you to sign in with your Ethereum account:`,
    p.address,
    "",
    p.statement,
    "",
    `URI: ${p.uri}`,
    "Version: 1",
    `Chain ID: ${p.chainId}`,
    `Nonce: ${p.nonce}`,
    `Issued At: ${p.issuedAt}`,
  ].join("\n");
}

/** Full SIWE handshake: nonce -> sign -> verify -> store JWT. */
export async function siweLogin(opts: {
  address: string;
  chainId: number;
  signMessage: (message: string) => Promise<string>;
}): Promise<string> {
  const { nonce } = await api<{ nonce: string }>("/auth/nonce", { auth: false });
  const message = buildSiweMessage({
    domain: window.location.host,
    address: opts.address,
    statement: "Sign in to Dhow.",
    uri: window.location.origin,
    chainId: opts.chainId,
    nonce,
    issuedAt: new Date().toISOString(),
  });
  const signature = await opts.signMessage(message);
  const { token } = await api<{ token: string; address: string }>("/auth/verify", {
    method: "POST",
    auth: false,
    body: { message, signature },
  });
  setToken(token);
  return token;
}
