interface CommunicationLogProps {
  entries: string[];
  onClear: () => void;
}

export function CommunicationLog({
  entries,
  onClear,
}: CommunicationLogProps) {
  return (
    <section className="communication-log" aria-labelledby="log-heading">
      <div className="log-header">
        <h2 id="log-heading">Socket.IO 通信ログ</h2>
        <button type="button" onClick={onClear}>
          クリア
        </button>
      </div>
      <textarea
        aria-label="Socket.IO 通信ログ"
        value={entries.join("\n\n")}
        readOnly
        spellCheck={false}
        placeholder="接続・送受信イベントがここに表示されます。"
      />
    </section>
  );
}
