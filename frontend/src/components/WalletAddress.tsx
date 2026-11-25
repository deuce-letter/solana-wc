import { useEffect, useRef, useState } from "react";

import type { SocketStatus } from "../hooks/useWalletSocket";

interface WalletAddressProps {
  address: string;
  status: SocketStatus;
}

type CopyFeedback = { state: "copied" | "failed"; address: string } | null;

function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletAddress({ address, status }: WalletAddressProps) {
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  async function copyAddress() {
    if (status !== "connected" || !address) return;

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    try {
      await navigator.clipboard.writeText(address);
      setCopyFeedback({ state: "copied", address });
    } catch (error) {
      console.error("Failed to copy wallet address", error);
      setCopyFeedback({ state: "failed", address });
    }

    resetTimerRef.current = setTimeout(() => {
      setCopyFeedback(null);
      resetTimerRef.current = null;
    }, 1800);
  }

  const canCopy = status === "connected" && Boolean(address);
  const copyState =
    canCopy && copyFeedback?.address === address ? copyFeedback.state : "idle";
  const label =
    copyState === "copied"
      ? "コピーしました"
      : copyState === "failed"
        ? "コピーできませんでした"
        : canCopy
          ? "アドレスをコピー"
          : "アドレス未取得";

  return (
    <div className="wallet-address">
      <button
        className="address-row"
        type="button"
        title={address || "アドレス未取得"}
        aria-label={`${label}${address ? `: ${address}` : ""}`}
        disabled={!canCopy}
        onClick={copyAddress}
      >
        {canCopy && copyState === "idle" && (
          <span className="address-copy-hint">コピー</span>
        )}
        <span>
          {copyState === "copied"
            ? "✓ コピー済み"
            : copyState === "failed"
              ? "コピー失敗"
              : address
                ? shortenAddress(address)
                : "—"}
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {copyState === "copied"
          ? "ウォレットアドレスをコピーしました"
          : copyState === "failed"
            ? "ウォレットアドレスをコピーできませんでした"
            : ""}
      </span>
    </div>
  );
}
