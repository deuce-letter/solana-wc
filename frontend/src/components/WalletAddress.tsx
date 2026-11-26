import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { getBase58Encoder } from "@solana/kit";
import JazziconModule from "react-jazzicon";

import type { SocketStatus } from "../hooks/useWalletSocket";

interface WalletAddressProps {
  address: string;
  status: SocketStatus;
}

type JazziconComponent = React.ComponentType<ComponentProps<typeof JazziconModule>>;

const Jazzicon: JazziconComponent =
  "default" in JazziconModule
    ? (JazziconModule as unknown as { default: JazziconComponent }).default
    : JazziconModule;

type CopyFeedback = { state: "copied" | "failed"; address: string } | null;

const base58Encoder = getBase58Encoder();
function solanaAddressToSeed(address: string): number {
try {
    const bytes = base58Encoder.encode(address);
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash + bytes[i]) | 0;
    }
    return Math.abs(hash);
  } catch {
    return Math.round(1e7 * Math.random());
  }
}

function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletAddress({ address, status }: WalletAddressProps) {
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const jazziconSeed = useMemo(() => {
    return address ? solanaAddressToSeed(address) : null;
  }, [address]);

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
        {jazziconSeed !== null && (
          <span className="address-avatar" aria-hidden="true">
            <Jazzicon diameter={20} seed={jazziconSeed} />
          </span>
        )}
        <span>
          {copyState === "copied"
            ? "✓ コピー済み"
            : copyState === "failed"
              ? "✕ コピー失敗"
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
