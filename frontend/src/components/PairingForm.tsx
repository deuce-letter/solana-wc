import { useState } from "react";

interface PairingFormProps {
  disabled: boolean;
  message: string;
  onPair: (uri: string) => boolean;
}

export function PairingForm({ disabled, message, onPair }: PairingFormProps) {
  const [uri, setUri] = useState("");

  return (
    <section className="pairing-panel" aria-labelledby="pairing-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONNECT A DAPP</p>
          <h2 id="pairing-heading">DApp を接続</h2>
        </div>
      </div>
      <form
        className="pairing-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (onPair(uri)) setUri("");
        }}
      >
        <label className="sr-only" htmlFor="pairing-uri">
          WalletConnect URI
        </label>
        <input
          id="pairing-uri"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="WalletConnect URI を貼り付け"
          value={uri}
          onChange={(event) => setUri(event.target.value)}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled}>
          接続
        </button>
      </form>
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
