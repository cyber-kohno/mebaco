# 複数機能セッション管理：経緯・実装状況・引き継ぎ

更新日: 2026-10-23（日本時間）

## 1. 現在の到達点と次の作業

**現行のUI・起動・終了の挙動を維持したまま、内部の複数セッション管理と画面保持の基盤を実装済み。次はユーザーとUI仕様を決める段階。**

一般ユーザー向けのタブUIや複数起動操作は、まだ追加していない。内部APIとブラウザテストでは、複数機能のState・画面インスタンスを独立して保持できることを確認した。

この文書は、別環境のCodexで会話と実装を継続するための引き継ぎ資料。将来のUIに関する未決事項を、承認済みの仕様として扱わないこと。

## 2. 要望の背景と確認した事実

- パッケージは複数機能（ランチャー）をまとめてリリースする単位で、開発プロジェクトも複数機能を扱う。
- 実運用では、同じドメインに関係する複数機能を開いて、作業途中の状態を維持しながら切り替えたい。
- 以前の実装では単一の実行セッションだけを保持していた。別機能を操作するには現在の機能を終了するか、Mebacoクライアント自体を複数起動する必要があった。
- 開発タブ上部の「Launchers」は、開発ツリーに登録されたランチャー一覧を表示する画面。その一覧から機能を起動すると、全画面の操作画面へ移る。
- 開発側のLaunchersとクライアントタブからの起動は、共通の `PreviewController.open`、`ApplicationRuntimeScreen`、`RuntimeView` を使用している。

両起動経路には次の差があるが、機能画面の実装は共通である。

| 項目 | 開発側のLaunchers | クライアント側 |
| --- | --- | --- |
| 実行定義 | 現在編集中のツリーのコピー | インストール済みパッケージから生成した実行プロジェクト |
| リソース設定 | 開発側の設定 | クライアントで設定したパス |
| Storageのスコープ | 開発プロジェクト用 | パッケージ用 |

## 3. ユーザーと合意した要件・作業順序

### 要件

1. ランチャー一覧から起動する機能は、複数セッションを同時に保持し、将来的にはタブで切り替えて操作できるようにする。
2. 各機能セッションのStateは独立する。
3. タブの切り替えやランチャー一覧への移動だけでは、機能セッションを終了・リセットしない。
4. 明示的に終了したセッションだけを破棄する。
5. 「機能セッションを起動する」と「機能の複数管理画面へ移動する」を分ける。
6. 開発ツリーからのテスト起動は、従来どおり単一でよい。

**複数機能間のデータ同期は不要であり、Mebaco本体の責務ではない。**

相談途中で共有データの同期を論点として挙げたが、ユーザーが明確に対象外と訂正した。自動再取得・同期イベント・機能間State共有などを、この要件の必須機能として追加しないこと。Stateの独立と、StorageやDB・ファイルの保存先を別々にすることは同義ではなく、既存の保存先スコープは維持している。

### 合意した作業順序

1. **下準備：現行UIの挙動を維持し、内部を複数セッションに対応させる。今回ここまで実装。**
2. ユーザーと複数管理画面・タブ・ランチャー一覧との行き来などのUI仕様を決める。
3. 決定したUIと起動導線を実装する。

## 4. 実装したデータ構造とAPI

中心となるファイルは [runtime-session-store.ts](../code/apps/studio/src/system/runtime/runtime-session-store.ts)。

### セッションと管理状態

- `Session.id`: 起動インスタンスごとのUUID。ランチャーID・App定義IDとは別物。
- `Session.revision`: セッション内容の置き換え時に増える番号。画面を再生成する境界として使用。
- `Session.kind`: `application` / `preview`。現状は `presentation` の有無から決定する。開発側／クライアント側という起動元の識別子ではない。
- 各セッションはApp・プロジェクト定義、Resource・Storage・Logの各セッション、起動引数、表示情報などを保持する。
- 内部管理状態は `{ sessions: Session[], activeId: string | null }`。
- `sessions`: 全セッションを購読する読み取り用ストア。
- `store`: 選択中の1セッション、または `null` を返す読み取り用の互換ストア。既存UIやプレビュー関連の参照を維持するために残している。

`store === null` は「セッションが1つもない」とは限らない。`deactivate()` 後や選択中セッションの終了後にも、非選択セッションが残り得る。今後のUIやガードの実装では用途に応じて `sessions` を参照すること。

### APIの意味

| API | 現在の動作 |
| --- | --- |
| `create(input, { activate? })` | セッションを追加してIDを返す。通常は選択も行う。`activate: false` なら現在の選択を変えずに追加できる |
| `find(id)` | 指定セッションを取得。なければ `null` |
| `activate(id)` | 存在するセッションを選択。成功／失敗を返す |
| `deactivate()` | 選択だけを解除し、全セッションを保持する |
| `replace(id, input)` | 指定セッションのIDとkindを維持し、内容を置き換えてrevisionを増やす。選択は変えない |
| `open(input)` | 現行UI用の互換起動。選択中のセッションを置き換える形で、新しいIDのセッションを作成する。他の非選択セッションを一括削除するAPIではない |
| `close(id?)` | 指定セッションだけを終了。省略時は選択中が対象。選択中を閉じた場合は選択を `null` にし、他のセッションを自動選択しない |

`create` は、`preview` が既にある場合、そのプレビューを閉じてから新規作成する。内部APIでも開発プレビューを複数保持しない。

終了時には、そのセッションのinspectionとResourceセッションをdisposeする。置き換え時には、次のセッションへ引き継ぐ同一インスタンスをdisposeしない。

### 起動・機能間遷移

[preview-controller.ts](../code/apps/studio/src/system/runtime/preview/preview-controller.ts) を変更した。

- `OpenOptions.retainExisting: true` で既存セッションを残して追加起動できる。省略時は従来の起動挙動。
- `PreviewController.open` の戻り値は従来どおりboolean。起動したIDを返す高水準APIや、画面選択なしで起動するコントローラーAPIまでは追加していない。
- `transition(projectNode, appDefinitionId, launchValues, sessionId?)` は、ID指定時にそのセッションだけを遷移させる。省略時は互換動作として選択中を対象にする。
- `RuntimeView` は自分の `sessionId` を渡して遷移する。他タブを選択していても遷移先が混線しない。
- 遷移では同じIDを維持し、Resource・Storage・Logなどを引き継ぐ。対象セッションの画面はrevision更新により再生成する。別セッションの追加起動とは区別している。
- 終了済みIDや異なるprojectNodeからの遅延遷移は拒否する。
- `close(sessionId?)` も対象IDを指定できる。

## 5. 画面保持の実装と、壊してはいけない境界

Stateの実体は、セッションストアにシリアライズして保管しているわけではない。**`RuntimeView` と配下のコンポーネントをマウントしたまま保持することで、作業状態を維持する。**

### ApplicationRuntimeScreen

[ApplicationRuntimeScreen.svelte](../code/apps/studio/src/system/runtime/view/ApplicationRuntimeScreen.svelte) はapplicationセッションを `session.id` で列挙する。

- 非選択画面は `hidden` と `inert` にし、DOM・コンポーネントを破棄しない。
- 各画面の終了ボタンは、自分のセッションIDを指定して終了する。
- セッション内の実行画面は `session.revision` をkeyにする。

### RuntimeSessionView

[RuntimeSessionView.svelte](../code/apps/studio/src/system/runtime/view/RuntimeSessionView.svelte) は新規追加した、実行画面の初期化境界。

- マウント時に `untrack(() => session)` で実行定義とセッション参照を取得し、それを `RuntimeView` へ渡す。
- セッションの選択変更だけでは、RuntimeViewの初期化式やStateを再評価させない。
- 起動インスタンスの終了、またはrevision更新時に破棄・再生成する。

実装途中の実ブラウザテストでは、セッションオブジェクトをkeyにするだけでは切り替え時のState再初期化を防げなかった。revisionによるkeyと、この初期化境界を組み合わせて修正した。

**選択中の画面だけを `{#if}` で描画する方式や、ストア更新のたびに実行画面のpropsを再初期化する方式へ戻さないこと。** テストではState値に加えて同一DOMの保持も検証している。

### 描画スコープ

[render-instance-scope.ts](../code/apps/studio/src/system/runtime/render/render-instance-scope.ts) に `provideRenderInstanceScope(sessionId)` を追加し、RuntimeViewで設定している。同一モデルのノードIDが複数画面に存在しても、描画用のクラス名が衝突しないようセッションIDで分離する。

`PreviewDialog` と `DirectRuntimeRoot` にもRuntimeViewへのセッションID受け渡しを追加した。ただし、application向けの複数画面保持ホストは `ApplicationRuntimeScreen`。開発プレビューやショートカット直接起動に、タブ管理UIを追加したわけではない。

## 6. 今回変更していない起動導線・未実装範囲

- [DevelopLauncherController](../code/apps/studio/src/system/workspace/develop-launcher-controller.ts) は既存セッションが選択されている場合の起動ガードを維持し、`retainExisting` を指定していない。
- [ClientLauncher](../code/apps/studio/src/system/client/client-launcher.ts) も `retainExisting` を指定していない。
- 現行の起動ボタンは従来どおり起動して操作画面へ移る。終了ボタンはセッションを終了し、元の画面へ戻る。
- `AppRoot` の全画面表示判定やキーボード制御は、引き続き選択中セッションを基準にしている。
- 登録済みセッションの一覧・タブ・再選択ボタン・一覧へ戻る専用操作などは未実装。
- セッションはメモリ上の管理。Mebacoの終了・再起動をまたぐ作業状態の復元は未実装であり、今回の合意範囲にも含まれていない。
- 非表示の機能はマウントを維持するため、Effectや非同期処理が継続し得る。非選択時の停止・再開ポリシーは追加していない。
- パッケージ形式、Storageスコープ、機能間データ同期は変更していない。

## 7. 検証結果と再実行

2026-10-23の実装時点で以下を確認した。

| 検証 | 結果 |
| --- | --- |
| 関連Vitest | 40ファイル、220件成功 |
| `npm run check` | 成功。Svelte/TypeScriptのエラーなし。既存のアクセシビリティ警告2件あり |
| `scripts/test-launchers.mjs` | 実ブラウザで成功。従来操作に加え、複数セッションのState・DOM保持、CSS分離、片方の終了後の他方保持を確認 |
| 変更対象の `git diff --check` | 成功 |

### ユニットテスト

`code/apps/studio` を作業ディレクトリとして実行する。

```powershell
npm exec -- vitest run src/system/runtime src/system/client src/system/workspace/develop-launcher-controller.test.ts src/system/application/debug src/system/mcp/mcp-preview-controller.test.ts
npm run check
```

新規の [runtime-session-store.test.ts](../code/apps/studio/src/system/runtime/runtime-session-store.test.ts) は6件。登録と選択の分離、独立したセッション保持、同一プロジェクトを参照する非選択セッションの遷移、個別終了、従来起動の互換動作、プレビューの単一制限を検証している。

### ブラウザテスト

[test-launchers.mjs](../code/apps/studio/scripts/test-launchers.mjs) と [harness.ts](../code/apps/studio/tests/launchers-browser/harness.ts) を拡張した。テスト用の起動APIから同じ機能を2つ起動し、一方のカウンターStateを変更して検証する。本番UIにテスト用操作を追加したわけではない。

```powershell
# Playwrightが通常のモジュール解決で見つからない場合のみ指定する。
# 値は別環境で利用できるPlaywrightのindex.mjsへのfile URLに置き換える。
$env:MEBACO_PLAYWRIGHT_MODULE = 'file:///path/to/playwright/index.mjs'
node scripts/test-launchers.mjs
```

テストはローカルViteサーバーとheadless Edgeを使用する。`MEBACO_TEST_BROWSER_CHANNEL` でブラウザchannelを変更できる。現在の製品情報virtual moduleを解決するため、テスト用サーバーにも `studioMcpIdentityPlugin` を追加済み。

実装環境では、サンドボックスの一時フォルダーでVitestのrenameがEPERMになったため、`TEMP` / `TMP` をワークスペース内の `node_modules/.runtime-test-temp` に向けて実行した。ブラウザ起動はサンドボックス外での実行が必要だった。これは環境依存の実行上の問題で、実装の要件ではない。

ブラウザテストではTauriブリッジがないため、edit history初期化のconsole.errorが出るが、ページ例外はなく、検証自体は成功した。既存の型チェック警告は `ConfirmDialogLayer.svelte` と `CommandConsoleLayer.svelte` のrole指定。

## 8. 次のCodexで行うこと

最初にユーザーとUI仕様を決める。すぐにタブUIを独断で追加する段階ではない。

確認・決定すべき事項の候補は以下。現時点では未決。

1. 複数機能の操作画面の位置と名称、タブの表示位置。
2. ランチャー一覧と操作画面の行き来、起動と画面移動を分けたボタン構成。
3. 新規起動後に自動で操作画面を開くか、一覧に残るか。
4. 同じランチャーの再起動で、新セッションを追加するか既存を選択するか。内部構造は同一ランチャーの複数起動にも対応できる。
5. タブ名・並び順・起動元の識別、開発側とクライアント側のセッションを同じ一覧で扱うか。
6. 選択中タブを終了した後に隣のタブを選ぶか、一覧へ戻るか。内部APIの現状は選択解除のみ。
7. 起動済みセッションがあるときの開発プレビュー、プロジェクト切り替え、パッケージ更新・削除、ショートカット直接起動との関係。

実装時には既存の `store` 参照を点検し、「選択中か」「何か起動中か」「開発プレビューがあるか」を混同しないこと。特に `AppRoot`、キーボード制御、開発Launchersの起動ガード、MCPプレビューのガードなどは、UI仕様に応じて見直す候補になる。

## 9. 別環境へ移す際の注意

この文書を作成した時点で、今回のコード変更は未コミットの作業ツリーにある。**文書だけでなく、新規ファイルも含めてコード差分を別環境へ移す必要がある。** この作業ではコミット・pushは行っていない。

主な新規ファイル:

- `code/apps/studio/src/system/runtime/runtime-session-store.test.ts`
- `code/apps/studio/src/system/runtime/view/RuntimeSessionView.svelte`
- この文書

既存ファイルの変更は、本文で説明したruntime関連ファイルと、ブラウザテスト・ハーネスにある。`git status` / `git diff` で現状を確認すること。

また、作業開始前からの `code/apps/studio/src-tauri/Cargo.toml` の変更、およびこの文書作成時に存在した既存docsの `docs/bak` への移動差分は、この複数セッション対応の変更ではない。それらを今回の変更として説明したり、取り消したりしないこと。
