# Mebaco AI Assistant Handoff

この文書は、Mebaco に AI 支援機能を入れるための方針整理と、別環境の Codex が続きを進めるための引き継ぎメモです。

## 目的

Mebaco はローカル完結のローコード開発アプリである。AI 支援機能では、ユーザーが作りたいアプリを自然文で指示すると、AI が Mebaco の編集操作を使って UI や処理を組み立て、必要に応じて verify を実行し、エラーのない状態まで自律的に修正する体験を目指す。

最初の対応範囲は OpenAI / ChatGPT API キーのみでよい。ユーザー自身の API キーを使い、Mebaco 本体は外部サーバーを持たずにローカルアプリとして動作する前提。

## 結論

実現可能。ただし、AI に Project JSON や内部ツリー構造を直接編集させる設計は避ける。

恒久的に実用できる形にするなら、AI には Mebaco が許可した「編集ツール」だけを使わせる。AI は以下のような手順で作業する。

1. 現在のプロジェクト構造を観察する。
2. 選択ノードや対象ノードで利用可能なアクションを確認する。
3. Mebaco の既存アクションメニューや編集処理を通じて変更する。
4. verify を実行する。
5. エラーがあれば、結果を読んで追加の編集を行う。
6. 完了条件を満たした場合だけ、作業完了としてユーザーに返す。

この方針なら、AI の出力品質を Mebaco 側の検証・既存編集制約・操作ログで支えられる。

## 重要な考え方

AI が `list_actions(nodeId)` などを直接 HTTP API や CLI として叩く必要はない。最小構成では、Mebaco アプリ内の TypeScript 関数として実装すればよい。

OpenAI API には、利用可能なツール名、説明、引数スキーマを渡す。モデルは「このツールをこの引数で呼びたい」という tool call を返す。Mebaco 側がその tool call を受け取り、実際の TypeScript 関数を実行し、結果を再びモデルへ返す。

概念的には次の流れ。

```text
ユーザー:
  検索フォーム付きの一覧画面を作って

Mebaco:
  OpenAI Responses API にユーザー指示とツール定義を送る

AI:
  inspect_tree({ scope: "project" }) を呼びたいと返す

Mebaco:
  inspect_tree を実行し、構造要約を返す

AI:
  list_actions({ nodeId: 12 }) を呼びたいと返す

Mebaco:
  そのノードで使えるアクション候補を返す

AI:
  run_action({ actionId: "add-app", args: {...} }) を呼びたいと返す

Mebaco:
  Mebaco の既存編集処理で実際に変更する

AI:
  verify({ scope: "project" }) を呼びたいと返す

Mebaco:
  verify 結果を返す

AI:
  エラーがあれば修正を続け、エラーがなければ完了する
```

## CLI / API / MCP の要否

初期実装では CLI も MCP も不要。

推奨順序は次の通り。

1. アプリ内 TypeScript 関数として AI ツール層を作る。
2. OpenAI Responses API の function calling で自律ループを作る。
3. 操作ログ、差分、verify 結果を UI に出す。
4. 必要になったら CLI を追加する。
5. 外部 AI クライアントから Mebaco を操作したくなったら MCP を追加する。

CLI があると、自動評価や回帰テストには便利。

```bash
mebaco-ai run "Todoアプリを作って" --project sample.mbc
mebaco-ai verify sample.mbc
```

MCP が必要になるのは、Codex、Claude Desktop、他のエージェント基盤など、Mebaco 外部の AI クライアントに Mebaco 操作能力を公開したい段階。

## OpenAI API 側の前提

OpenAI の function calling / tool calling は、アプリケーションが定義した関数をモデルが要求し、アプリケーション側が実行結果を返す仕組み。

参考:

- https://developers.openai.com/api/docs/guides/function-calling
- https://developers.openai.com/api/docs/guides/tools
- https://developers.openai.com/api/docs/guides/agents/running-agents

実装方式としては、まず Responses API の function calling を使うのがよい。Agents SDK はループやオーケストレーションを任せやすいが、Mebaco 内部の状態・UI・承認フローとの統合を考えると、最初は自前ループのほうが制御しやすい。

ユーザーの API キーを使う場合、キーの保存先と扱いは慎重に決める。Tauri アプリなので、平文 localStorage ではなく OS の credential store 相当を使えるならそちらが望ましい。少なくとも、プロジェクトファイルには保存しない。

API を使う以上、ユーザーの指示やプロジェクト要約は OpenAI に送信される。ローカル完結アプリとして、この点は UI 上で明示する必要がある。

## Mebaco 側の接続点

現時点で AI ツール化しやすい既存構造は以下。

- `apps/studio/src/system/workspace/tree/context-menu/tree-context-menu-resolver.ts`
  - ノード、親ノード、rootNode からアクションメニューを解決している。
  - `list_actions(nodeId)` の入口候補。

- `apps/studio/src/system/ui/action-menu/action-menu-state.ts`
  - アクションメニュー項目の型がある。
  - 現在の `callback` は UI 操作用なので、AI には安定した `actionId` と schema を返す形に拡張したい。

- `apps/studio/src/system/workspace/tree/destination/tree-destination-controller.ts`
  - Copy / Move / Extract signature など、複数ステップのツリー操作がある。
  - AI から扱う場合は、途中状態を明示的な tool result として返せる設計が必要。

- `apps/studio/src/system/terminal/catalog/verify-catalog.ts`
  - `verify current` / `verify project` の実装がある。
  - `verify(scope)` の入口候補。

- `apps/studio/src/system/terminal/command-types.ts`
  - コマンド実行コンテキストがある。
  - `openPreview`, `requestChoice`, `requestInput` など AI ループと似た抽象が含まれている。

注意: 上記パスは 2026-09-23 時点の作業ツリーで確認したもの。大規模なリネーム途中のような未コミット変更があるため、別環境では `rg "TreeContextMenuResolver"` や `rg "createVerifyCatalog"` で探すこと。

## 最初に作るべき内部モジュール案

名前は仮。

```text
apps/studio/src/system/ai/
  assistant-controller.ts
  assistant-session-store.ts
  openai-client.ts
  tool-registry.ts
  tools/
    inspect-tree-tool.ts
    inspect-node-tool.ts
    list-actions-tool.ts
    run-action-tool.ts
    verify-tool.ts
    preview-tool.ts
    get-errors-tool.ts
```

最初は UI と密結合にしすぎず、次のような純粋寄りの API を目指す。

```ts
type AiToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; recoverable: boolean }

type AiToolContext = {
  rootNode: TreeNode.Node
  selectedNodeId: number
  commitRootChange: (rootNode: TreeNode.Node) => void
  selectNode: (nodeId: number) => void
  appendLog: (message: string) => void
}
```

ただし、既存の編集処理が Svelte store や UI ダイアログに依存している場合は、最初から完全な純粋化を狙いすぎない。AI 用アダプタを薄く作り、既存の安全な操作経路を呼ぶことを優先する。

## AI に渡すツール候補

### `inspect_tree`

現在のプロジェクト構造を要約して返す。全 JSON を返すのではなく、AI が判断しやすい軽量表現にする。

引数例:

```json
{
  "scope": "project | selected | app",
  "maxDepth": 4
}
```

返却例:

```json
{
  "root": {
    "nodeId": 1,
    "kind": "project",
    "children": [
      { "nodeId": 2, "kind": "release" },
      { "nodeId": 5, "kind": "apps" },
      { "nodeId": 9, "kind": "common" }
    ]
  }
}
```

### `inspect_node`

対象ノードの詳細、編集可能フィールド、子スロット、参照情報を返す。

### `list_actions`

指定ノードで AI が実行できるアクションを返す。

重要: UI 表示用 label だけでは不十分。AI 用には安定した `actionId`、必要引数 schema、実行前条件、危険度を返す。

```json
{
  "nodeId": 12,
  "actions": [
    {
      "actionId": "add-child-tag",
      "label": "Add tag",
      "parameters": {
        "type": "object",
        "properties": {
          "tag": { "type": "string" }
        },
        "required": ["tag"]
      },
      "risk": "normal"
    }
  ]
}
```

### `run_action`

`list_actions` で返した `actionId` と引数を受け取り、Mebaco の既存編集処理で実行する。

アクション実行結果には、変更されたノード、選択ノード、警告、次に必要な入力などを含める。

```json
{
  "ok": true,
  "changedNodeIds": [42],
  "selectedNodeId": 42,
  "message": "Added tag under component body."
}
```

### `verify`

既存 verify を実行する。

```json
{
  "scope": "current | app | project"
}
```

返却は AI が修正に使いやすいように構造化する。

```json
{
  "verified": 12,
  "errors": [
    {
      "nodeId": 42,
      "kind": "function",
      "message": "Unknown state: searchText"
    }
  ],
  "skipped": 8
}
```

### `open_preview`

ランチャーを起動してプレビューできるか確認する。最初は画面キャプチャまでは不要で、起動可否と runtime error の有無を返すだけでもよい。

### `get_errors`

現在 UI が保持している検証エラー、式エラー、ランタイムエラーをまとめて返す。

## 完了条件

AI に「できました」と言わせるだけでは不十分。Mebaco 側に完了条件を持たせる。

初期 MVP の完了条件:

- `verify project` の error が 0。
- 主要ランチャーが起動できる。
- AI が実行した操作ログが残っている。
- 最後の AI 応答に、作成内容と未検証事項が含まれている。

将来的な完了条件:

- runtime preview にエラーがない。
- 参照切れがない。
- 未使用・重複・命名衝突がない。
- 主要フローの簡易操作テストが通る。

## ドキュメント整備方針

AI に Mebaco を理解させるためのドキュメントは、普通の説明文だけでは弱い。次の 4 層で作る。

### 1. 概念ドキュメント

Project、App、Component、State、Transition、Style、Function、Launcher などの意味と使い分け。

### 2. 操作カタログ

各 node kind で可能な操作、必須引数、失敗条件、生成される構造。これは手書きではなく、可能なら ElementDefinition / context menu 定義から自動生成する。

### 3. 実装レシピ集

AI が迷いやすい定番構成を、Mebaco 的な作り方としてまとめる。

例:

- Todo アプリ
- 検索付き一覧
- 入力フォーム
- 詳細モーダル
- 共通コンポーネント化
- 共通スタイル定義
- 非同期 fetch
- SQLite resource を使った CRUD

### 4. 検証ルール

どの verify をいつ実行し、どのエラーをどの操作で直すか。エラー別の修正レシピもあるとよい。

## 開発コスト感

ざっくりの見積もり。

- 技術検証: 1-2 週間
  - API キー設定
  - 1 つの AI チャット UI
  - `inspect_tree`
  - `verify`
  - 簡単な要素追加

- MVP: 4-8 週間
  - 主要アクションの tool 化
  - 自律ループ
  - verify での自己修正
  - 操作ログ
  - ユーザー承認つきの変更適用

- 実用版: 2-4 か月
  - 差分確認
  - リトライ設計
  - 失敗時復旧
  - レシピ整備
  - 評価用サンプルプロジェクト

- 高信頼版: 4-6 か月以上
  - 自動評価
  - プレビュー検証
  - 複数モデル対応
  - コスト制御
  - 長時間タスク管理
  - 操作権限と監査

## リスクと注意点

### Project JSON 直接編集は避ける

AI に JSON を直接出力させると、短期的には速いが、内部整合性、参照更新、リファクタリング、検証状態の保持が崩れやすい。Mebaco の価値である構造編集を迂回してしまう。

### アクション ID の安定化が必要

現在のアクションメニューは UI の callback 中心。AI に使わせるには、安定した `actionId` と schema が必要。

### 複数ステップ操作の設計が必要

Move / Copy / Extract signature のように、開始、宛先選択、確認、名前入力がある操作は、AI ツールとして状態遷移を明示する必要がある。

### ユーザー承認の境界

AI が大きな変更を行う場合、即時 commit ではなく draft として保持し、差分確認後に適用する設計も検討する。MVP では、操作ログと undo / project backup で代替してもよい。

### コスト制御

AI ループは tool call を何度も回すため、上限が必要。

- 最大ステップ数
- 最大トークン数
- 最大実行時間
- verify 失敗時の最大修正回数
- ユーザー確認が必要な操作の分類

## 最初の実装タスク案

1. `system/ai` 配下に AI セッションとツールレジストリの骨組みを作る。
2. `inspect_tree` を実装する。
3. `verify` を AI ツールとして実装する。
4. OpenAI API キー設定 UI を作る。
5. Responses API にユーザー指示と tool schema を送る。
6. 返ってきた tool call を実行して、結果を再送するループを作る。
7. `list_actions` を作る。ただし最初は read-only で候補表示だけ。
8. 安全な単純アクション 1-2 個だけ `run_action` 対応する。
9. Todo アプリや検索画面など、評価用の固定プロンプトを用意する。

## MVP で扱うとよいユースケース

最初は広くしすぎない。

おすすめ:

- 既存 App 配下に簡単な画面を追加する。
- 既存 Component に tag / text を追加する。
- state を追加して text input と表示をつなぐ。
- Style を作って既存要素に適用する。
- verify エラーを読んで式や参照名を直す。

避ける:

- 大規模な自動リファクタリング。
- 複雑な resource / SQLite / fetch 連携。
- 複数 App / Launcher / Release をまたぐ変更。
- 完全自動の削除操作。

## 次の Codex へのメモ

この機能は「AI チャットを横に置く」だけではなく、Mebaco の編集モデルを AI 操作用ツールとして再定義する仕事になる。

最初に見るべき場所:

- `apps/studio/src/system/workspace/tree/context-menu/tree-context-menu-resolver.ts`
- `apps/studio/src/system/ui/action-menu/action-menu-state.ts`
- `apps/studio/src/system/terminal/catalog/verify-catalog.ts`
- `apps/studio/src/system/terminal/command-types.ts`
- `apps/studio/src/system/workspace/tree/destination/tree-destination-controller.ts`

次に決めるべきこと:

- AI 用 `actionId` をどこで定義するか。
- 既存 context menu と AI action catalog を統合するか、別レイヤーにするか。
- `run_action` が即時 commit するか、draft change として保持するか。
- API キー保存方法。
- OpenAI SDK を入れるか、`fetch` で Responses API を直接叩くか。

推奨は、まず既存 UI 操作に影響を与えない `inspect_tree` と `verify` から作ること。そのあと、最も安全な追加操作だけ `run_action` 対応する。
