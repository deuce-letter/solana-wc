# Frontend: 署名依頼の管制室

WalletConnect経由で届いた接続・署名リクエストを確認して、承認するか拒否するかを選ぶReactアプリです。
ブラウザは秘密鍵を持ちません。鍵を握っているバックエンドに「この依頼、通していい？」と伝える係です。

## できること

- Socket.IOバックエンドへの接続状態表示と再接続
- バックエンドからSolanaウォレットアドレスを受信・コピー
- WalletConnect URIを使ったDAppとのペアリング
- セッション提案と署名リクエストの確認・承認・拒否
- 接続中セッションの一覧表示と切断
- Socket.IOの送受信ログ表示・クリア
- バックエンドの接続先ホスト・ポート変更

署名リクエストは `solana_signMessage` と `solana_signTransaction` が対象です。
実際に署名するのはバックエンドで、フロントエンドは承認・拒否の意思を返します。

## 起動

リポジトリルートで依存関係をインストールし、フロントエンドだけ起動する場合:

```bash
yarn install
yarn workspace frontend dev
```

通常はバックエンドも一緒に起動します。

```bash
yarn dev
```

Viteの既定URLは `http://localhost:5173` です。バックエンドは既定で `http://127.0.0.1:3001` を使用します。

接続先が異なる場合は画面下部の「接続設定」を開き、ホストとポートを入力して適用してください。
接続中は設定を変更できません。いったん切断してから変更します。

## 使い方

1. バックエンドを起動し、画面上部が「接続済み」になるのを待ちます。
2. WalletConnect URIを「DApp を接続」欄へ貼り付けて接続します。
3. 接続リクエストまたは署名リクエストが届いたら、DApp名・URL・リクエスト内容を確認します。
4. 内容を理解したうえで「接続を承認」「承認して署名」または「拒否」を選びます。
5. 不要になったセッションは一覧から切断します。

依頼はキューに入り、先頭の1件ずつ表示されます。確認ダイアログを閉じるだけでは拒否になりません。明示的に「拒否」を選んでください。

## 通信イベント

フロントエンドとバックエンドで共有するイベント型は [`shared/src/socket.ts`](../shared/src/socket.ts) にあります。

| 方向 | イベント | 用途 |
| --- | --- | --- |
| Backend → Frontend | `wallet:address` | ウォレットアドレス |
| Backend → Frontend | `wc:sessions` | 接続中セッション一覧 |
| Backend → Frontend | `wc:session_request` | 署名リクエスト |
| Backend → Frontend | `wc:session_proposal` | 接続提案 |
| Frontend → Backend | `wc:pair` | WalletConnect URIの送信 |
| Frontend → Backend | `wc:disconnect` | セッション切断 |
| Frontend → Backend | `wc:approve_request` / `wc:reject_request` | 署名依頼の判断 |
| Frontend → Backend | `wc:approve_proposal` / `wc:reject_proposal` | 接続提案の判断 |

通信ログは直近300件まで画面上に保持されます。ペアリングURIはログに記録されないよう伏せています。

## 主なファイル

- `src/App.tsx`: 各画面部品を組み合わせるアプリ本体
- `src/hooks/useWalletSocket.ts`: Socket.IO接続、画面状態、イベント処理
- `src/components/PairingForm.tsx`: URI入力
- `src/components/SessionList.tsx`: セッション一覧・切断
- `src/components/ApprovalDialog.tsx`: 接続提案・署名依頼の確認
- `src/components/ConnectionSettings.tsx`: バックエンド接続先設定
- `src/components/CommunicationLog.tsx`: Socket.IO通信ログ
- `src/components/WalletAddress.tsx`: アドレス表示・コピー

## 開発コマンド

```bash
yarn workspace frontend lint
yarn workspace frontend build
```

## 注意事項

- 表示された内容を確認せずに署名を承認しないでください。特にトランザクションのパラメーターは、送信元が信頼できるかを含めて確認してください。
- 通信ログには受信イベントの内容が表示されます。共有画面や録画に注意し、不要なら「クリア」を使ってください。
- 接続先ホストを変更すると、そのサーバーへSocket.IO接続を試みます。信頼できるバックエンドだけを指定してください。
- ブラウザを閉じたりバックエンドとの接続が切れたりすると、画面上の保留中リクエストは消えます。署名処理自体のタイムアウトや応答はバックエンド側の挙動に従います。

## ToDo
- トランザクションパーサ・シミュレータ
- RPC接続
- 独自Txの組み立て(任意メッセージ署名とかSolana Payとか)
