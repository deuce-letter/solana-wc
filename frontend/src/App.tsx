import { useWalletSocket } from "./hooks/useWalletSocket";
import { ApprovalDialog } from "./components/ApprovalDialog";
import { CommunicationLog } from "./components/CommunicationLog";
import { ConnectionSettings } from "./components/ConnectionSettings";
import { PairingForm } from "./components/PairingForm";
import { SessionList } from "./components/SessionList";
import { WalletAddress } from "./components/WalletAddress";

import "./App.css";

export default function App() {
  const wallet = useWalletSocket();

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">SOLANA WALLET</p>
          <h1>WalletConnect</h1>
        </div>
        <div className={`connection-state ${wallet.status}`} role="status">
          <div className="status-row">
            <span className="status-dot" />
            {wallet.status === "connected"
              ? "接続済み"
              : wallet.status === "connecting"
                ? "接続中"
                : "未接続"}
            {wallet.status === "disconnected" && (
              <button
                className="text-button"
                type="button"
                onClick={wallet.reconnect}
              >
                再接続
              </button>
            )}
          </div>
          <WalletAddress address={wallet.address} status={wallet.status} />
        </div>
      </header>

      <PairingForm
        disabled={wallet.status !== "connected"}
        message={wallet.pairingMessage}
        onPair={wallet.pairWithUri}
      />

      {wallet.error && (
        <p className="error-message" role="alert">
          {wallet.error}
        </p>
      )}

      <SessionList
        sessions={wallet.sessions}
        disabled={wallet.status !== "connected"}
        onDisconnect={wallet.disconnectSession}
      />
      <ConnectionSettings
        host={wallet.serverHost}
        port={wallet.serverPort}
        serverUrl={wallet.serverUrl}
        disabled={wallet.status !== "disconnected"}
        onHostChange={wallet.setServerHost}
        onPortChange={wallet.setServerPort}
        onApply={wallet.applyServerAddress}
      />
      <CommunicationLog entries={wallet.logs} onClear={wallet.clearLogs} />
      <ApprovalDialog
        approval={wallet.activeApproval}
        queueLength={wallet.approvals.length}
        onResolve={wallet.decideApproval}
      />
    </main>
  );
}
