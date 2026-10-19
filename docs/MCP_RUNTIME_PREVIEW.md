# MCP による実行時プレビュー検証

Computer Use を使わず、Studio の実際の Svelte ランタイムを MCP から操作・検査する。
モデルの静的検証 (`verify_expression`) や変更の検証 (`apply_changes` の dry-run) とは別の機能。
MCP アダプターと Studio の両方を再ビルドし、Studio を再起動して開発セッションを公開する。
MCP ツール一覧の再読込が必要なクライアントでは、クライアントも再起動する。

## ツール

| ツール | 用途 |
| --- | --- |
| `start_preview` | 未保存モデルのスナップショットからプレビューを開始し、最初の状態を返す |
| `inspect_preview` | 描画要素・エラー・ログ・寸法・フォーカス・スクロール状態を取得 |
| `interact_preview` | 要素 ID を指定して input / click / focus / blur / scroll を一回実行し、更新後の状態を取得 |
| `close_preview` | 指定した MCP 所有のプレビューだけを閉じる |

`list_development_sessions` で `sessionId`、`get_project_overview` などで現在の revision とアプリ定義 UUID を取得する。
`start_preview` の `appId` は数値のツリーノード ID ではなく、その定義 UUID。

```json
{
  "sessionId": "<session UUID>",
  "appId": "<app definition UUID>",
  "expectedRevision": 3,
  "viewport": { "width": 1024, "height": 768 }
}
```

返却された `previewId` は inspect / interact / close で必須。
返却された `elements` の `nodeId`、`refKey`、`tagName`、`text`、`label` で対象を特定し、`elementId` を使用する。
再マウントすると `elementId` が変わるので、毎回最新の結果から取得する。任意のセレクターや JavaScript は受け付けない。

```json
{
  "sessionId": "<session UUID>",
  "previewId": "<preview UUID>",
  "elementId": "<elementId from snapshot>",
  "action": "input",
  "value": "日本語"
}
```

## 変換エディタの回帰確認例

1. 日本語欄に `input` で `日本語` を入れる。
2. 日本語→Unicode ボタンを `click` し、右だけが `\u65e5\u672c\u8a9e` に変わることを確認する。
3. 日本語欄に空文字を `input` し、`blur` で確定する。
4. Unicode→日本語ボタンを `click` し、左が日本語に戻り、右が変わらないことを確認する。
5. Unicode 欄を入力・blur し、文字列が倍にならないことを確認する。
6. 長文を入力し、該当欄の `scrollableY` が true、外枠 `frame.scrollableY` が false であることを確認する。
7. `close_preview` で終了する。

`input` は値の置換と input イベントの発火を行う。blur は自動では行わない。
`click` はフォーカス移動（前の欄の blur）と、その処理の完了を待ってからクリックする。
contenteditable は描画用テキストノードを保持して更新する。リッチテキスト編集や IME の再現には使わない。

## 返却情報と判定

- `runtimeFailure`: ランタイムで捕捉された実行・スタイルなどのエラー。正常時は null。
- `diagnostics`: Text / タグ属性の式評価エラー（プレビュー中に発生したものを最大100件保持）。
- `logs`: アプリの `$log` 出力。モデルのログレベル設定に従い、最新100件・各2000文字まで。グローバル console の横取りはしない。
- `elements`: 描画されたタグと元のノード ID、テキスト、入力値、refKey、明示的 role/aria-label、フォーカス、寸法、スクロール量、overflow/resize スタイル。完全なアクセシビリティツリーではない。
- `runtime` / `frame` / `dialog`: ランタイム領域、外側のスクロール枠、Preview ヘッダーを含むダイアログの計測値。
- `settled` / `pendingActions`: Svelte の更新とタグイベントの非同期処理の待機状態。バックグラウンド effect・タイマー・アニメーション等のすべての完了を意味しない。`settled: false` を合格扱いしない。
- `ready`: 表示領域がマウント済みか。false の場合も previewId は返すので、再度 inspect するか close できる。
- `activeAppId`: 遷移がある場合も含め、現在表示中のアプリ定義 UUID。
- `stale`: 開始時と現在のモデル revision が違う。状態取得・終了は可能だが、操作は拒否する。閉じて開始し直す。
- `elementsTruncated` / `textTruncated`: 出力上限で切り詰めたか。必要なら `maxElements`（1–500、既定200）、`maxTextLength`（1–16000、既定4096）を指定する。テキストの総予算は64000文字。

`timeoutMs` は0–2000（既定500）。click/input/focus はフォーカス後と操作後にそれぞれ待機し、Studio の5秒ブリッジタイムアウト内に収める。
非表示・disabled・inert の要素、古い/他プレビューの elementId は操作できない。
パスワード欄の `value` は返却時に伏せる。

## 安全性と範囲

手動プレビューは勝手に置き換えたり閉じたりしない。プレビュー自体は Studio に表示される。
モデルや revision、保存状態を変更しない。key-value ストレージはプレビュー専用メモリ内に隔離し、Resource のファイル・SQLite I/O は拒否する。
Resource を使うアプリはそのアクセスでエラーになるため、この機能の検証範囲外。通常の手動プレビューの動作は変更しない。

`viewport` は **アプリの表示コンテナーの CSS ピクセル寸法**。Preview ヘッダーはその外側に付く。
ネイティブ WebView 自体をリサイズするものではないため、`vh` / `vw` やメディアクエリは元の WebView 寸法を参照する。
`webViewViewport` も返すので区別できる。今回のような `height: 100%` / flex の高さ配分や内外のスクロール検査に使える。
実画面サイズに依存するメディアクエリの検証には、別途 WebView のサイズ変更を伴う E2E テストが必要。

イベントは合成イベントで、`isTrusted`、実キー操作、IME、ドラッグ、ネイティブダイアログは再現しない。
実際の描画結果とイベントハンドラーを検証する機能であり、スクリーンショットの視覚評価を代替しない。

## 開発者用テスト

`code/apps/studio/scripts/test-mcp-preview.mjs` は、製品の Studio とは独立した Vite サーバーとヘッドレス Chromium で実描画を確認する。
テスト専用 TreeStore に置き換えるため、開いているプロジェクトは操作しない。
Playwright が別の場所にある場合は `MEBACO_PLAYWRIGHT_MODULE` にエントリーポイントの file URL を指定する。
既定はインストール済み Edge (`msedge`)。`MEBACO_TEST_BROWSER_CHANNEL=chrome` で Chrome を使用できる。
`code/apps/studio` で `node scripts/test-mcp-preview.mjs` を実行する。ブラウザーとサーバーは終了時に閉じる。

テスト範囲: 双方向変換、空欄からの復元、blur の重複、実 textarea、フォーカス、固定サイズ、内側スクロール、外枠 overflow 検出、出力制限、revision 競合、閉じたプレビュー ID、実行エラー、終了処理。
