# Solana WC Backend

WalletKitからWalletConnectセッションを受け、承認待ちの署名リクエストをSocket.IO経由でフロントエンドへ渡すバックエンドです。

## 起動

リポジトリルートから:

```bash
yarn workspace backend dev
```

ウォッチモード:

```bash
yarn workspace backend dev:watch
```

バックエンドはデフォルトで `127.0.0.1:3001` をリッスンします。

## 起動フロー

1. Solanaウォレットを読み込む
2. Reown WalletKitを初期化する
3. Socket.IOサーバーを起動する
4. 準備完了をログへ出力する

ウォレット読み込みに失敗するとプロセスは終了します。
起動時のウォレットは約束された署名者ですが、署名リクエストごとにフロントエンド承認を必要とします。

## ウォレット

`SOLANA_PRIVATE_KEY` を優先し、未設定なら `~/.config/solana/id.json` を読みます。
秘密鍵はBase58形式で、32バイトseedまたは64バイトkeypairを受け付けます。

任意で設定できる `SOLANA_PUBLIC_KEY` は導出アドレスとの一致確認に使われます。
読み込み後、署名・検証の自己テストを実行します。

## WalletKit

Solana mainnetの `solana_signMessage` と `solana_signTransaction` に対応します。
セッション提案はロード済みウォレットのアドレスで自動承認されます。

署名リクエストはフロントエンドへ送られ、承認または拒否を最大120秒待ちます。
タイムアウト、拒否、署名失敗時はリクエスト側へ `USER_REJECTED` を返します。
未接続中のリクエストもメモリに保持され、フロントエンド再接続時に再送されます。

`solana_signAndSendTransaction` はまだ未対応です。

## Socket.IO

接続時に次を通知します。

- ウォレットアドレス
- アクティブなWalletConnectセッション
- 保留中の署名リクエスト

フロントエンドは次のイベントを送信できます。

- `wc:pair`: WalletConnect URIでペアリング
- `wc:disconnect`: セッション切断
- `wc:approve_request`: リクエスト承認
- `wc:reject_request`: リクエスト拒否

既定オリジンは `http://localhost:5173` と `http://127.0.0.1:5173`。
追加オリジンは `FRONTEND_ORIGIN` で指定できます。

## 環境変数

テンプレートは [.env.example](./.env.example) を参照してください。

| 変数 | 内容 |
| --- | --- |
| `REOWN_PROJECT_ID` | Reown / WalletConnectのプロジェクトID |
| `SOLANA_PRIVATE_KEY` | Base58秘密鍵 |
| `SOLANA_PUBLIC_KEY` | 導出アドレスとの一致確認用 |
| `SOCKET_PORT` | ソケットポート。既定値は `3001` |
| `FRONTEND_ORIGIN` | 追加許可オリジン |
| `LOG_LEVEL` | Pinoログレベル |

[index.ts](./index.ts) は起動時に [loadenv.ts](./loadenv.ts) を最初に読み込み、バックエンドの `.env` を環境変数へ展開します。
秘密鍵はリポジトリへコミットしないでください。
