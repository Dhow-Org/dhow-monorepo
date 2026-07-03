import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { erc20Abi, financingPoolAbi } from "../lib/contracts";
import type { ChainConfig } from "./useApi";

/** Client-side (buyer-funded) chain actions: faucet + pay an outstanding advance. */
export function useBuyerActions(config: ChainConfig | undefined) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Mint test USDC to `to` (testnet TestERC20 faucet). */
  const faucet = useCallback(
    async (to: Address, human = 200_000) => {
      if (!config || !publicClient) return;
      setBusy("faucet");
      setError(null);
      try {
        const hash = await writeContractAsync({
          address: config.usdc,
          abi: erc20Abi,
          functionName: "mint",
          args: [to, BigInt(human) * 1_000_000n],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      } catch (e) {
        setError((e as Error).message.split("\n")[0]);
      } finally {
        setBusy(null);
      }
    },
    [config, publicClient, writeContractAsync],
  );

  /** Approve then repay an advance from the connected (buyer) wallet. */
  const pay = useCallback(
    async (advanceOnChainId: number, totalDue: bigint) => {
      if (!config || !publicClient || !address) return;
      setBusy(`pay-${advanceOnChainId}`);
      setError(null);
      try {
        const allowance = (await publicClient.readContract({
          address: config.usdc,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, config.financingPool],
        })) as bigint;
        if (allowance < totalDue) {
          const approveHash = await writeContractAsync({
            address: config.usdc,
            abi: erc20Abi,
            functionName: "approve",
            args: [config.financingPool, totalDue],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        const repayHash = await writeContractAsync({
          address: config.financingPool,
          abi: financingPoolAbi,
          functionName: "repay",
          args: [BigInt(advanceOnChainId), totalDue],
        });
        await publicClient.waitForTransactionReceipt({ hash: repayHash });
        return true;
      } catch (e) {
        setError((e as Error).message.split("\n")[0]);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [config, publicClient, writeContractAsync],
  );

  return { faucet, pay, busy, error };
}
