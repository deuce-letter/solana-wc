import type { WcSessionSummary } from "@solana-wc/shared/socket";

import { PeerAvatar } from "./PeerAvatar";

interface SessionListProps {
  sessions: WcSessionSummary[];
  disabled: boolean;
  onDisconnect: (topic: string) => void;
}

function formatExpiry(expiry: number): string {
  return new Date(expiry * 1000).toLocaleString();
}

export function SessionList({
  sessions,
  disabled,
  onDisconnect,
}: SessionListProps) {
  return (
    <section className="sessions-section" aria-labelledby="sessions-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONNECTED APPS</p>
          <h2 id="sessions-heading">接続中のセッション</h2>
        </div>
        <span className="session-count">{sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            ◇
          </div>
          <p>接続中のセッションはありません</p>
          <span>WalletConnect URI から DApp を接続できます。</span>
        </div>
      ) : (
        <ul className="session-list">
          {sessions.map((session) => (
            <li className="session-card" key={session.topic}>
              <PeerAvatar
                name={session.peerName}
                icon={session.peerIcon}
                baseUrl={session.peerUrl}
              />
              <div className="session-info">
                <h3>{session.peerName}</h3>
                {session.peerDescription && (
                  <p className="session-description">
                    {session.peerDescription}
                  </p>
                )}
                <p className="session-url">{session.peerUrl}</p>
                <p className="session-expiry">
                  有効期限: {formatExpiry(session.expiry)}
                </p>
              </div>
              <button
                className="disconnect-button"
                type="button"
                disabled={disabled}
                onClick={() => onDisconnect(session.topic)}
              >
                切断
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
