interface ConnectionSettingsProps {
  host: string;
  port: string;
  serverUrl: string;
  disabled: boolean;
  onHostChange: (host: string) => void;
  onPortChange: (port: string) => void;
  onApply: () => void;
}

export function ConnectionSettings({
  host,
  port,
  serverUrl,
  disabled,
  onHostChange,
  onPortChange,
  onApply,
}: ConnectionSettingsProps) {
  return (
    <details className="connection-settings">
      <summary>接続設定</summary>
      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        <label>
          ホスト
          <input
            value={host}
            onChange={(event) => onHostChange(event.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          ポート
          <input
            type="number"
            min="1"
            max="65535"
            step="1"
            value={port}
            onChange={(event) => onPortChange(event.target.value)}
            disabled={disabled}
          />
        </label>
        <button type="submit" disabled={disabled}>
          接続先を適用
        </button>
        <span className="server-url">{serverUrl}</span>
      </form>
    </details>
  );
}
