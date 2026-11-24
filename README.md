# solana-wc

Solanaの秘密鍵をローカルの「くすり箱」から取り出し、WalletConnect経由でやってきた署名依頼を、
ブラウザのフロントエンドが承認・拒否する`※todo`小さなSigner基地です。

前段で憧れていたのは `~/.config/solana/id.json` を直接読んでWalletConnectできる世界。
このリポジトリは、その夢の実装に向けてバックエンドを用意しています。
なお、秘密鍵は万能の金庫番ではなく、承認されなければ一切署名しません。

## 何が動いているの?

ルートの `yarn dev` はバックエンドとフロントエンドを同時に起動します。

- `backend/`: WalletKit、Socket.IO、Solana署名処理
- `frontend/`: 署名承認画面（現在はViteテンプレート状態）
- `shared/`: フロントエンドとバックエンドで共有するSocket.IOイベント型

```text
DApp
  |
  | WalletConnect / Reown
  v
WalletKit（バックエンド）
  |
  | Socket.IO
  v
承認画面（フロントエンド）
  |
  | approve / reject
  v
Solanaキーから署名
```

## バックエンドの登場人物

### `index.ts` - 遠征隊の司令塔

起動時に次の順番で基地を立ち上げます。

1. Solanaウォレットを読み込む
2. WalletKitを初期化する
3. Socket.IOサーバーを起動する
4. ウォレットアドレスを含む準備完了ログを出す

ウォレットの読み込みに失敗した場合は致命的エラーとして終了します。
`SIGINT` を受け取るとソケットサーバーを閉じて終了します。

### `components/solana-wallet.ts` - 秘密鍵ハンドラー

ウォレットは次の優先順位で読み込まれます。

1. `SOLANA_PRIVATE_KEY`
2. `~/.config/solana/id.json`

秘密鍵はBase58として扱い、32バイトのseedまたは64バイトのkeypairに対応します。
読み込んだキーは起動時に署名・検証テストを行い、任意の `SOLANA_PUBLIC_KEY` と導出されたアドレスが一致するかも確認します。

一度読み込んだウォレットはキャッシュされます。以降は毎回ディスクや環境変数を掘り返しません。

### `components/walletkit.ts` - WalletConnectの受付係

Reown WalletKitを初期化し、次を担当します。

- DAppからのセッション提案を承認
- セッションの一覧・切断
- `solana_signMessage`
- `solana_signTransaction`
- フロントエンドによる承認待ち

承認時にSolana mainnetだけを公開し、公開アカウントとしてロード済みウォレットのアドレスを渡します。

署名リクエストは最大120秒間待機します。フロントエンドが承認しない場合は拒否扱いです。
接続中のフロントエンドがなくてもリクエスト情報はメモリ上に残るため、新しいフロントエンドが接続した時点で再送されます。

対応していないメソッドや署名失敗時は、WalletConnectへ `USER_REJECTED` を返します。
`solana_signAndSendTransaction` はTODOです。

### `components/socket-server.ts` - フロントエンドとの会話窓口

バックエンドはデフォルトで `127.0.0.1:3001` にSocket.IOサーバーを立てます。

接続時には次をフロントエンドへ送ります。

- `wallet:address`
- 現在アクティブなWalletConnectセッション
- 承認待ちの署名リクエスト

フロントエンドからは次のイベントを受け取ります。

- `wc:pair`
- `wc:disconnect`
- `wc:approve_request`
- `wc:approve_proposal`
- `wc:reject_request`
- `wc:reject_proposal`

Socket.IOは通常の `localhost:5173` と `127.0.0.1:5173` を許可します。
追加オリジンは `FRONTEND_ORIGIN` で指定できます。

### `components/ConfKeyValueStorage.ts` - WalletKitの記憶力

WalletConnectのキーバリュー状態を、ユーザー設定ストアで永続化します。
設定名は `walletkit`、プロジェクト名は `solana-wc`です。

セッションやペアリング情報を再起動後も忘れにくくします。

### `components/logger.ts` - 小さな実況アナウンサー

Pinoでログを出します。

- 開発環境: カラー付きの読みやすいログ
- 本番環境: 構造化ログ
- `LOG_LEVEL` または `NODE_ENV` で振る舞いを調整

## 環境変数

バックエンド用テンプレートは [backend/.env.example](backend/.env.example) にあります。

| 変数 | 必須 | 内容 |
| --- | --- | --- |
| `REOWN_PROJECT_ID` | WalletKit起動時に必要 | Reown / WalletConnectのプロジェクトID |
| `SOLANA_PRIVATE_KEY` | 任意 | Base58秘密鍵（32バイトseedまたは64バイトkeypair） |
| `SOLANA_PUBLIC_KEY` | 任意 | 秘密鍵から導出されるアドレスとの一致確認用 |
| `SOCKET_PORT` | 任意 | Socket.IOポート。既定値は `3001` |
| `FRONTEND_ORIGIN` | 任意 | CORSで追加許可するフロントエンドオリジン |
| `LOG_LEVEL` | 任意 | `silent`, `fatal`, `error`, `warn`, `info`, `debug`, `trace` |

`SOLANA_PRIVATE_KEY` が未設定の場合は `~/.config/solana/id.json` を使用します。
起動時に [backend/loadenv.ts](backend/loadenv.ts) が読み込まれ、バックエンドの `.env` を環境変数へ展開します。
秘密鍵は絶対にコミットしないでください。

## 起動

依存関係を入れてから全体を起動します。

```bash
yarn install
yarn dev
```

バックエンドだけ起動する場合:

```bash
yarn workspace backend dev
```

開発中のウォッチ起動:

```bash
yarn workspace backend dev:watch
```

バックエンドは `http://127.0.0.1:3001`、フロントエンドはVite既定の `http://localhost:5173` を想定しています。

## 型の共通化

Socket.IOのイベント名とペイロードは [shared/src/socket.ts](shared/src/socket.ts) に集約されています。
これにより「バックエンドは送る側、フロントエンドは受ける側」と、どっちが何をしゃべるのかを型で追跡できます。

## 現在の注意点

- `solana_signTransaction` と `solana_signMessage` だけに対応します
- フロントエンド承認リクエストは120秒でタイムアウトします
- フロントエンドは現在Viteテンプレートのままで、バックエンドとの完全なUI連携は未実装です
- 秘密鍵を扱うため、本番利用前には認証、監査ログ、ネットワーク制限、秘密鍵保管方式の強化が必要です

### 動作確認

- 木星に到着した!（jup.ag に接続）
- シャチを手名付けた!（orca.so でMessageSignを確認）
