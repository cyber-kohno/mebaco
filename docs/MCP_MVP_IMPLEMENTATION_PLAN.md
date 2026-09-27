# Mebaco Studio MCP MVP Implementation Plan

## 目的

Codex などの外部エージェントが、Mebaco Studio で開いているプロジェクトの未保存状態を MCP 経由で参照し、安全な範囲で GUI 状態を更新できることを実証する。

MCP ツールの検出を Studio の起動タイミングに依存させないため、Codex が起動する静的な stdio MCP アダプターと、Studio が動的に公開する開発セッションを分離する。

```text
Codex
  -> stdio MCP
  -> mebaco-mcp.exe
  -> localhost の内部ブリッジ
  -> Mebaco Studio / Tauri Rust
  -> Tauri event + invoke
  -> WebView / TypeScript
  -> 現在の TreeStore
```

## 設計原則

- Codex から見える MCP ツール一覧は常に固定する。
- Studio の起動、プロジェクトのオープン、MCP の ON/OFF は、動的な開発セッションとして表現する。
- 各プロジェクト操作は実行時にセッションの有効性を再確認する。
- 保存ファイルではなく、WebView 上の現在の `TreeStore` を参照・操作する。
- Studio は MCP プロトコルを実装せず、認証付きのローカル内部ブリッジを提供する。
- MVP ではプロジェクト内容を変更せず、可逆な GUI 状態変更だけを許可する。

## MVP の対象

- ランタイム不要の単体実行ファイル `mebaco-mcp.exe`
- stdio MCP の `ping` と固定ツール一覧
- Codex からの stdio MCP 起動とツール呼び出し
- mbc ターミナルの `mcp start`、`mcp stop`、`mcp status`
- ヘッダへの開発セッション公開状態の表示
- プロジェクト終了時の自動公開解除
- Studio 開発セッションの検出
- Studio へのメッセージ表示
- GUI で開いているプロジェクトの要約取得
- MCP 経由の選択ノード変更
- localhost 限定、セッショントークン、タイムアウト、構造化エラー、操作ログ

## MVP の対象外

- Project JSON の直接編集
- 要素の追加、削除、汎用更新
- `apply_batch` と編集トランザクション
- verify の MCP 公開
- クエリ DSL
- Streamable HTTP MCP
- 複数 Studio セッションの同時操作
- 外部ネットワークへの公開
- MCP プラグインの公開
- Computer Use
- アプリ内 OpenAI API

## MCP ツール

### `ping`

`mebaco-mcp.exe`だけで完結する疎通確認。Studio が起動していなくても成功する。

### `list_development_sessions`

現在公開されている Studio 開発セッションを返す。Studio が停止中または MCP が OFF の場合は空配列を返す。

### `show_message`

指定した開発セッションの Studio にメッセージを表示する。

### `get_project_summary`

指定した開発セッションの現在の `TreeStore` から、総ノード数、選択ノード ID、root kind、element kind ごとの件数を返す。

### `select_node`

指定した node ID を検証し、Studio 上の選択ノードを変更する。プロジェクト内容は変更しない。

## 配布とツールチェーン

- `mebaco-mcp.exe`は独立した Rust crate として実装する。
- Node.js、Python、OpenSSL などの外部ランタイムを要求しない。
- stdout は MCP JSON-RPC 専用、ログは stderr に出力する。
- Studio と MCP crate の MSRV を Rust 1.88 に統一する。
- Rust edition は当面 2021 のままとし、MSRV 更新と edition 移行を分離する。
- 公式 Rust MCP SDK `rmcp` の stdio transport を使用する。
- Windows release build を主要な MVP 配布対象とする。

## ディレクトリ構成

```text
apps/mcp/
  Cargo.toml
  src/
    main.rs
    server.rs
    tools/
    bridge/

apps/studio/src/system/mcp/
  mcp-session-controller.ts
  mcp-session-state.ts
  mcp-tool-handler.ts
  mcp-types.ts
  McpStatusBadge.svelte

apps/studio/src/system/infra/tauri/
  mcp.ts

apps/studio/src/system/terminal/catalog/
  mcp-catalog.ts

apps/studio/src-tauri/src/mcp/
  mod.rs
  session.rs
  server.rs
  bridge.rs
```

共通 Rust crate は MVP の開始時点では作らない。共有すべき通信型が安定した段階で `crates/mebaco-bridge-protocol` を検討する。

## Studio 開発セッション

`mcp start`は MCP サーバーの起動ではなく、現在のプロジェクトを外部開発セッションとして公開する操作とする。

Studio は開発セッションごとに次を保持する。

- session ID
- Studio の PID
- localhost の動的内部ポート
- ランダムなセッショントークン
- プロジェクト表示名
- dirty 状態
- 作成時刻または heartbeat

セッション情報はユーザーのローカルアプリデータ配下へ記録する。`mebaco-mcp.exe`はツール呼び出し時に PID、endpoint、token、応答を検証し、stale session を除外する。

## フェーズ一覧

### フェーズ 0: 技術方式の再確定

状態: **完了**

- [x] 静的 stdio MCP と動的 Studio 開発セッションを分離
- [x] `mebaco-mcp.exe`を独立 Rust crate とする
- [x] 公式 `rmcp` の stdio transport を採用
- [x] Studio と MCP crate の MSRV を Rust 1.88 に統一
- [x] Rust edition は 2021 を維持
- [x] Studio との接続は localhost の認証付き内部ブリッジとする
- [x] Tauri event + invoke で WebView のライブ状態へ接続する
- [x] MCP ツール一覧と Studio セッション状態を分離

### フェーズ 1: 静的 stdio MCP の最小実装

状態: **完了**

- `apps/mcp` Rust crate
- `ping`ツール
- stderr logging
- MCP initialize、tools/list、tools/call
- unit test と release build

確認:

- Studio が停止中でも MCP 初期化と`ping`が成功する
- stdout にログが混入しない
- Codex から起動可能な単体 exe が生成される

### フェーズ 2: Codex との stdio 実接続

状態: **完了**

- [x] `codex mcp add mebaco -- <absolute-path-to-mebaco-mcp.exe>`
- [x] 新しい Codex タスクでツール発見
- [x] Codex から`ping`
- [x] Studio 未起動時も MCP 接続が正常であることを確認

確認結果:

- Codex の一時タスクから`mebaco/ping`の実呼び出しに成功
- tool result: `{"application":"Mebaco Studio","status":"ok","studioRequired":false}`
- 非対話実行で approval policy が`never`の場合、MCP tool call は拒否される。`on-request`と自動承認レビューでは成功する

中止判定:

- Codex から安定して stdio MCP を起動できなければ、Studio 固有機能へ進まず原因を解消する

### フェーズ 3: Studio の開発セッション状態

状態: **完了**

- [x] Studio の`rust-version`を1.88へ更新（フェーズ1完了後に先行実施）
- [x] `McpSessionStatus`とstore
- [x] `mcp start`、`mcp stop`、`mcp status`
- [x] 二重開始、未開始停止、プロジェクト未オープンの処理
- [x] この段階では外部 listener を起動しない

確認:

- [x] ターミナル操作に応じて公開状態が正しく変化する
- [x] Studio の`cargo check`と既存テストが通る

確認結果:

- MCP セッションcontroller / terminal catalog の追加テスト: 6件成功
- Studio frontend 全体: 158 files / 901 tests 成功
- Svelte / TypeScript check 成功
- Studio Tauri `cargo check` 成功
- `available`はこのフェーズではStudio内の状態のみ。localhost内部ブリッジはフェーズ5で接続する

### フェーズ 4: ヘッダの公開状態表示

状態: **完了**

- [x] Save ボタン左側へ status badge
- [x] 停止中は非表示
- [x] starting、available、connected、stopping、error
- [x] ローカライズ文言

確認:

- [x] Save、Close、Restart のレイアウトを崩さない（実GUIで確認）
- [x] ターミナル操作と badge が同じsession storeに同期する

確認結果:

- MCP status presentation の追加テスト: 5件成功
- MCP 関連テスト: 3 files / 11 tests 成功
- Studio frontend 全体: 159 files / 906 tests 成功
- Svelte / TypeScript check 成功（既存のa11y warning 2件のみ）
- Vite production build 成功（既存のchunk warningあり）

### フェーズ 5: Studio 内部ブリッジとセッション公開

状態: **完了**

- [x] `127.0.0.1`の動的ポートで内部 listener を起動
- [x] セッショントークンによる認証
- [x] セッション記述ファイルの作成・削除
- [x] PID、endpoint、token を含むsession descriptor
- [x] Tauri event/invoke の request/response bridge
- [x] timeout と WebView unavailable error

確認:

- [x] `mcp start`のセルフプローブがlistenerからWebViewまで往復する（実GUIで確認）
- [x] session tokenが一致する要求だけを内部ブリッジで受け付ける
- [x] `mcp stop`でlistenerとsession descriptorが削除される（実GUIで確認）
- PID、endpointの利用時検証と異常終了後のstale除外は、descriptorを読むフェーズ6で実装する

確認結果:

- Studio Rust tests: 18件成功（HTTP request parsingを含む）
- Studio frontend: 160 files / 910 tests 成功
- MCP controller、WebView tool handler、terminal catalogのテスト成功
- Svelte / TypeScript check 成功

### フェーズ 6: 動的 Studio セッションの検出

状態: **完了**

- [x] `list_development_sessions`
- [x] Studio 停止中またはMCP OFFは空配列
- [x] Studio の ON/OFF をツール呼び出しごとに再取得
- [ ] セッション消失時の`SESSION_NOT_AVAILABLE`（セッション指定ツールを追加するフェーズ7で確認）

確認:

- [x] release版MCPへ実際に接続し、公開中のStudioセッションを検出できる
- [x] Studioを`mcp stop`した後、再取得結果が空配列になる（実環境で確認）
- [x] descriptor消失を同じプロセスの次回取得で反映するunit test

確認結果:

- MCP adapter tests: 5件成功
- release build成功
- MCP JSON-RPCの`tools/list`に`list_development_sessions`が公開されることを確認
- 実セッション`test2.migrated.mbc`をtoken非公開の結果として取得
- 同じStudio環境で`mcp stop`後、descriptor 0件と`{"sessions":[]}`を確認
- `mcp start`と`mcp status`にSession ID、localhost endpoint、Studio PIDを表示
- ヘッダbadgeにはSession ID先頭8文字を表示し、tooltipには完全なSession ID、endpoint、PIDを表示
- 認証tokenはターミナルとMCP tool resultのどちらにも表示しない
- PID、IPv4 loopback endpoint、64桁token、認証付きhealth応答、session ID一致を検証
- 無効またはstaleなdescriptorは結果から除外し、ファイル自体は競合回避のため削除しない

### フェーズ 7: GUI へのメッセージ表示

状態: **完了**

- [x] `show_message`
- [x] Studio のtoastへの表示
- [x] TypeScript error と timeout の構造化

確認:

- [x] Codex から指定したメッセージが Studio に表示される（確認ダイアログで確認）

確認結果:

- MCP adapter tests: 7件成功（認証付きbridge POSTを含む）
- Studio frontend: 160 files / 913 tests 成功
- Svelte / TypeScript check成功
- release版`mebaco-mcp.exe`を更新
- 終了済みPIDのstale descriptorを指定すると`SESSION_NOT_AVAILABLE`になることを実環境で確認

### フェーズ 8: GUI プロジェクトの参照

状態: **実装完了・実GUI確認待ち**

- [x] 純粋なツリー集計関数
- [x] `get_project_summary`
- [x] 保存前の変更を含むライブ状態

確認:

- [ ] Studio で要素を変更すると、Codex の再取得結果が変化する（実GUIで確認）

確認結果:

- 純粋なツリー集計テスト: 2件成功
- Studio frontend 全体: 162 files / 918 tests 成功
- release版`mebaco-mcp.exe`を更新

### フェーズ 9: GUI 状態の更新

状態: **完了**

- [x] `select_node`
- [x] node ID の検証
- [x] 選択変更と表示領域への reveal 要求
- [ ] 操作ログ

確認:

- [x] Codex が指定したノードを Studio 上で確認できる
- [x] プロジェクト内容は変更されない設計である

実装結果:

- Studio のライブ `TreeStore` で node ID を検証し、選択状態を更新
- ツリー表示へ対象ノードの reveal 要求を発行
- 不正な node ID は `INVALID_PARAMS` として拒否
- MCP adapter の release build 成功、Rust unit test 7件成功
- 実GUIで node `50` から node `1` への選択変更を確認

### フェーズ 10: ライフサイクル・安全性・総合確認

状態: **確認中**

- [x] Project Close、Restart、ウィンドウ終了時の自動公開解除
- [ ] 不正 token、schema 違反、timeout、二重操作
- [x] release build とクリーン Windows 環境での起動
- [x] exe のインストール先と Codex 登録手順
- [x] 既知の問題と次段階の判断材料

追加確認結果:

- Restartとウィンドウ×終了に共通のMCP停止ガードを追加
- MCP停止失敗時は終了を中断し、エラートーストを表示
- Studio frontend 全体: 161 files / 915 tests 成功

## MVP 完了条件

1. Codex が Studio の状態に関係なく`mebaco-mcp.exe`を起動できる。
2. Codex が固定ツール一覧と`ping`を取得できる。
3. `mcp start`で現在のプロジェクトが開発セッションとして公開される。
4. ヘッダに公開状態が表示される。
5. 同じ Codex タスクから後で公開された Studio セッションを検出できる。
6. `show_message`が Studio の GUI に反映される。
7. `get_project_summary`が現在の GUI ツリーを集計する。
8. 保存前の GUI 変更が次回集計へ反映される。
9. `select_node`が GUI の選択状態を変更する。
10. `mcp stop`とProject Closeでセッションが直ちに無効になる。
11. 失敗や timeout で Studio、MCP、Codexがhangしない。

MVP状態: **完了扱い（2026-09-27）**

安全性の追加検証は継続課題とするが、固定stdio MCP、動的Studioセッション、ライブ状態参照、GUIメッセージ、ノード選択、自動停止までの技術実証を完了した。

## MVP後: 固定設計モデルResource

状態: **完了**

- [x] `mebaco://model/core`
- [x] `mebaco://model/components-and-retention`
- [x] `mebaco://model/styles`
- [x] App Entryをアプリ分析の起点として定義
- [x] Componentの直接contentとRetention/Elements構造を定義
- [x] Retentionのスコープ、可視性、ローカルComponentを定義
- [x] Styleの式、parameter、inheritance、value/default/delegateを定義
- [x] MCP `resources/list`と`resources/read`を公開

確認結果:

- MCP adapter unit test: 11件成功
- release build成功
- release版に対する`resources/list`と`mebaco://model/core`の`resources/read`成功
- 新規Codex実行から3つのResourceを発見し、`mebaco://model/core`の読取に成功
- CodexがApp EntryとRetention/Elementsの違いをResource本文に沿って説明できることを確認
- 現行Studio実装との再照合でRetentionの可視性とStyle type-defaultの説明を補正
- Resource audience/priority注釈と`mebaco/modelVersion`メタデータを追加
- 最新確認: MCP adapter unit test 12件成功、release build成功、更新版でResource一覧・Style本文・versionメタデータの取得成功

## MVP後: 読み取りツール設計

状態: **読み取りツール6種実装完了・分析効率の再評価待ち**

- [x] 概要からApp、Component、個別ノード、参照へ段階的に調べる取得フロー
- [x] `get_project_overview`
- [x] `get_app_context`
- [x] `get_component_structure`
- [x] `get_node_details`
- [x] `get_node_references`
- [x] `get_app_analysis_context`
- [x] session指定、live state、Retention/Elements、結果上限、部分結果、プロジェクトデータの扱いを定義

設計書: [MCP_READ_TOOLS_DESIGN.md](MCP_READ_TOOLS_DESIGN.md)

実装状況:

- [x] `get_project_overview`、`get_app_context`、`get_component_structure`をstdio MCPから公開
- [x] Studioの現在のTreeStoreを読み、未保存状態・Retention/Elements分岐を返す
- [x] Component構造の深さ・ノード数を制限し、入力範囲外を拒否
- [x] ノード詳細をkind別allowlistで返し、ソース情報は明示要求時のみ上限付きで返す
- [x] ReferenceGraphで扱う意味・構造参照を方向別に返し、coverageの限界を明示
- [x] Entry起点のApp分析情報を一回で取得し、Common等の依存先定義も再帰的に同梱
- [x] State/Variable/Constant/Function/Styleの実モデルに詳細allowlistを整合
- [x] Rust release buildとStudio TypeScript/Svelte check
- [x] ユーザー操作中のStudioで、既存5ツールを通した読み取りを確認
- [x] スライドパズルで分析用一括ツールから盤面・画像・移動処理を取得
- [ ] 同一プロジェクトで分析時間・ツール呼び出し回数を再計測

### 分析効率の評価手順

1. `mebaco-mcp.exe`を再起動し、Codex側の`tools/list`に`get_app_analysis_context`が現れることを確認する。
2. Studioで対象プロジェクトを開き、MCPを公開する。
3. `list_development_sessions`で対象Session IDを選び、`get_project_overview`でApp IDを取得する。
4. `get_app_analysis_context`を1回呼び出し、Entry、State、View、Function、Style、依存先まで把握できるか確認する。
5. 比較値として、従来フロー（`get_app_context`、`get_component_structure`、必要な`get_node_details`/`get_node_references`）の呼び出し数と応答量を記録する。

Codexのモデル推論時間は環境や会話履歴に左右されるため、MCP側では呼び出し回数、応答サイズ、追加照会の有無を主指標とする。目標は、通常の目的把握を一括分析1回で完了し、個別照会を0〜2回に抑えることとする。

Studio実機での利用確認後、参照関係のProperty単位の説明精度と、必要なkind別詳細allowlistの拡張要否を判断する。仕様と制限値は[MCP_READ_TOOLS_DESIGN.md](MCP_READ_TOOLS_DESIGN.md)を参照。

## MVP後: 更新基盤

状態: **基盤実装・最初の更新ツール実装完了**

- [x] TreeStoreの共通トランザクションAPI
- [x] ライブTreeStore revisionと参照応答への公開
- [x] `expectedRevision`による適用直前の競合検出
- [x] Rustメモリ上のUndo/Redo履歴
- [x] Tree、選択ノード、展開状態、表示Criteriaの復元
- [x] `Ctrl+Z` Undo、`Ctrl+Y` Redo
- [x] `set_node_disabled`による更新・dry run・capability検証
- [ ] kind別編集schemaと汎用的な既存ノード更新
- [ ] 複数operationのアトミック適用
- [ ] ノード追加・削除・移動のMCP公開

更新は保存ファイルではなく現在のTreeStoreへ適用する。読み取り結果の`revision`を更新要求の`expectedRevision`として必須にし、不一致の場合は`REVISION_CONFLICT`として変更前に拒否する。Undo/Redoも新しい状態遷移であるためrevisionを増加させる。

最初の縦断的な更新ツールとして`set_node_disabled`を公開する。対象kindの`canDisable`をStudio側で確認し、`dryRun=true`では変更せず、適用可否・変更見込み・現在revisionを返す。

## フェーズごとの進め方

- 各フェーズは独立してテスト可能な差分にする。
- フェーズ完了時に、変更ファイル、テスト結果、既知の問題を報告する。
- ユーザーの確認後に次フェーズへ進む。
- 後続フェーズのためだけの大規模リファクタリングは行わない。
- 既存の未コミット変更には触れない。

## 参考資料

- OpenAI Docs MCP: https://developers.openai.com/learn/docs-mcp
- OpenAI MCP connections: https://developers.openai.com/api/docs/guides/agents-api/tools/mcp
- Model Context Protocol Rust SDK: https://github.com/modelcontextprotocol/rust-sdk
