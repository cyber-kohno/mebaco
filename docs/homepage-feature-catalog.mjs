export const featureCatalog = [
  {
    id: 'studio-shell', title: 'Studioの画面と作業領域', implementation: 'observed', publication: 'candidate-v1', page: '/start/',
    sources: ['apps/studio/src/system/AppRoot.svelte', 'apps/studio/src/system/application/shell/AppModeTabs.svelte'],
    note: 'Develop / Client / Settingの3領域を持つデスクトップアプリ。',
  },
  {
    id: 'project-lifecycle', title: 'Projectの新規作成・読込・保存', implementation: 'observed', publication: 'candidate-v1', page: '/start/first-project/',
    sources: ['apps/studio/src/system/project/project-file.ts', 'apps/studio/src/system/project/project-session-store.ts'],
    note: '新規、Open、Save、Save As、Dirty状態、未保存変更の保護を含む。',
  },
  {
    id: 'project-format-migration', title: 'Project形式・検証・移行', implementation: 'observed', publication: 'review-before-v1', page: '/reference/project-files/',
    sources: ['apps/studio/src/system/project/project-file.ts', 'apps/studio/src/system/version.ts'],
    note: 'MBCアーカイブとManifestを扱う。サポートする旧形式、移行方針、互換性保証を確認する。',
  },
  {
    id: 'tree-editing', title: 'Program Treeと要素編集', implementation: 'observed', publication: 'candidate-v1', page: '/guides/build-ui/',
    sources: ['apps/studio/src/system/workspace/tree/TreeView.svelte', 'apps/studio/src/system/workspace/element-definition/element-registry.ts'],
    note: '82種類のElement kindをRegistryに登録。親子配置条件は各Element Definitionに分散している。',
  },
  {
    id: 'tree-navigation', title: 'ツリー移動・表示範囲・参照グラフ', implementation: 'observed', publication: 'candidate-v1', page: '/reference/elements/',
    sources: ['apps/studio/src/system/workspace/tree/tree-navigation-controller.ts', 'apps/studio/src/system/workspace/tree/tree-viewport-controller.ts', 'apps/studio/src/system/workspace/reference/ReferenceGraphPanel.svelte'],
    note: 'Ancestor path、選択範囲、参照グラフを含む。表示動作と操作方法を初版UIで確認する。',
  },
  {
    id: 'edit-history', title: '編集履歴・Undo・Redo', implementation: 'observed', publication: 'review-before-v1', page: '/reference/',
    sources: ['apps/studio/src/system/workspace/history/edit-history-controller.ts', 'apps/studio/src/system/infra/tauri/edit-history.ts'],
    note: '履歴の保存範囲、上限、アプリ再起動後の保持期間を確認する。',
  },
  {
    id: 'tree-search-shortcuts', title: '要素検索・キーボード操作', implementation: 'observed', publication: 'candidate-v1', page: '/reference/',
    sources: ['apps/studio/src/system/workspace/search/element-search-controller.ts', 'apps/studio/src/system/workspace/shortcut/shortcut-registry.ts'],
    note: '検索対象、検索構文、ショートカット一覧をソースから抽出する。',
  },
  {
    id: 'command-console', title: 'Command Consoleと組み込みコマンド', implementation: 'observed', publication: 'review-before-v1', page: '/guides/',
    sources: ['apps/studio/src/system/terminal/console/CommandConsoleLayer.svelte', 'apps/studio/src/system/terminal/command-registry.ts', 'apps/studio/src/system/terminal/provider/project-provider.ts', 'apps/studio/src/system/terminal/provider/app-provider.ts'],
    note: 'help / save / verify / run / release / build / history / mcpなどを提供。入力補完、対話プロンプト、実行条件を一覧化する。',
  },
  {
    id: 'expressions-editor', title: '式・TypeScript編集と型情報', implementation: 'observed', publication: 'review-before-v1', page: '/reference/expressions/',
    sources: ['apps/studio/src/system/ui/monaco/MonacoScriptEditor.svelte', 'apps/studio/src/system/model/code-analysis/mebaco-injection-source.ts', 'apps/studio/src/system/model/code-analysis/expression-type-inference.ts', 'apps/studio/src/system/runtime/formula/formula-evaluator.ts', 'apps/studio/src/system/runtime/script/script-compiler.ts'],
    note: '式の位置ごとの文法と参照名、入力時の型診断、Runtimeでの構文変換と実行を分けて説明する。各欄の非同期・副作用ポリシーと配布ビルドでの確認は継続。',
  },
  {
    id: 'expression-validation', title: '式の検証とエラー表示', implementation: 'observed', publication: 'candidate-v1', page: '/reference/expressions/',
    sources: ['apps/studio/src/system/model/validation/expression/expression-verification-scope.ts', 'apps/studio/src/system/workspace/validation/expression-verification-actions.ts', 'apps/studio/src/system/application/validation/expression-verification-runner.ts'],
    note: '構文・名前・型・実行ポリシーのどれを検証するか、同期・非同期の表示状態を確認する。',
  },
  {
    id: 'value-types', title: 'Value Typeと名前付き型', implementation: 'observed', publication: 'candidate-v1', page: '/reference/types/',
    sources: ['apps/studio/src/system/model/type-system/type-expression.ts', 'apps/studio/src/system/model/type-system/value-type-definition.ts', 'apps/studio/src/system/model/type-system/type-catalog.ts', 'apps/studio/src/system/model/type-system/object/object-inheritance.ts', 'apps/studio/src/system/model/type-system/union/union-definition.ts', 'apps/studio/src/system/model/type-system/signature/signature-definition.ts'],
    note: 'プリミティブ・Literal・Object・配列・NullableとObject/Union/Signature Typeの意味、参照範囲を記述する。Runtimeでの適合検証範囲は利用する要素ごとに異なる。',
  },
  {
    id: 'project-concepts', title: 'App・Entry・Component・Props・Slot', implementation: 'observed', publication: 'review-before-v1', page: '/concepts/project-model/',
    sources: ['apps/studio/src/system/model/app/entry.ts', 'apps/studio/src/system/model/component/component.ts', 'apps/studio/src/system/model/component/slot.ts', 'apps/studio/src/system/runtime/runtime-props.ts', 'apps/studio/src/system/runtime/render/RenderSlotUse.svelte', 'apps/studio/src/system/runtime/render/ElementDispatcher.svelte'],
    note: 'Entryの起動モデルとProps/SlotのBindingを説明する。Slotの深い配置で情報伝播が途切れる経路と、割当て式の$propsが受取側になる点を配布ビルドで再確認する。',
  },
  {
    id: 'retention-scope', title: 'Retention・宣言・スコープ', implementation: 'observed', publication: 'candidate-v1', page: '/concepts/component/',
    sources: ['apps/studio/src/system/runtime/retention/retention-resolver.ts', 'apps/studio/src/system/model/function/function-scope.ts', 'apps/mcp/resources/components-and-retention.md'],
    note: '宣言の可視範囲はElement種別と位置で異なる。概念説明だけで単純化しない。',
  },
  {
    id: 'runtime-view', title: 'Runtime・View・制御構造', implementation: 'observed', publication: 'candidate-v1', page: '/guides/build-ui/',
    sources: ['apps/studio/src/system/runtime/view/RuntimeView.svelte', 'apps/studio/src/system/runtime/render/ElementDispatcher.svelte', 'apps/studio/src/system/runtime/runtime-tree.ts'],
    note: '描画要素とConditional / Loop / Switchの動作、Runtimeエラー表示を記述する。',
  },
  {
    id: 'state-and-behavior', title: 'State・Action・Function・Effect・Transition', implementation: 'observed', publication: 'candidate-v1', page: '/guides/state-and-actions/',
    sources: ['apps/studio/src/system/runtime/runtime-state.ts', 'apps/studio/src/system/runtime/action/action-evaluator.ts', 'apps/studio/src/system/runtime/function/function-runner.ts', 'apps/studio/src/system/runtime/effect/RenderEffects.svelte'],
    note: '各要素の責務、副作用、実行順、非同期処理、画面更新条件を分けて整理する。',
  },
  {
    id: 'style-system', title: 'Style・Parameter・継承・Animation', implementation: 'observed', publication: 'candidate-v1', page: '/guides/style-app/',
    sources: ['apps/studio/src/system/model/view/style/style.ts', 'apps/studio/src/system/runtime/style/style-declaration-resolver.ts', 'apps/mcp/resources/styles.md'],
    note: 'ルール評価、Parameter既定値、Base Style、状態別ルール、Animationを確認する。',
  },
  {
    id: 'resource-access', title: 'Resource・ファイルアクセス', implementation: 'observed', publication: 'review-before-v1', page: '/guides/resources-storage/',
    sources: ['apps/studio/src/system/runtime/resource/resource-runtime.ts', 'apps/studio/src/system/model/resource/directory-resource.ts', 'apps/studio/src/system/model/resource/text-resource.ts', 'apps/studio/src/system/model/resource/sqlite-resource.ts'],
    note: '読取・書込の可否、参照パス、Debug/Clientでの指定方法、権限境界を確認する。',
  },
  {
    id: 'storage', title: 'アプリ内Storage', implementation: 'observed', publication: 'review-before-v1', page: '/guides/resources-storage/',
    sources: ['apps/studio/src/system/runtime/storage/storage-runtime.ts', 'apps/studio/src/system/model/storage/storage.ts', 'apps/studio/src/system/model/storage/storage-item.ts'],
    note: '保存スコープ、永続化場所、データ寿命、複数Appでの分離条件を確認する。',
  },
  {
    id: 'debug-preview', title: 'Preview・Debug・ログ', implementation: 'observed', publication: 'candidate-v1', page: '/guides/debug/',
    sources: ['apps/studio/src/system/runtime/preview/preview-controller.ts', 'apps/studio/src/system/runtime/log/runtime-log.ts', 'apps/studio/src/system/model/debug/debug-configuration.ts'],
    note: '選択要素からの起動、Debug Configuration、Resource Binding、Logの範囲を説明する。',
  },
  {
    id: 'launcher', title: 'Launcherと起動引数', implementation: 'observed', publication: 'review-before-v1', page: '/guides/distribute/',
    sources: ['apps/studio/src/system/model/project/launcher.ts', 'apps/studio/src/system/model/app/launch-argument.ts', 'apps/studio/src/system/runtime/runtime-launch.ts'],
    note: '開発時と配布後での起動値、Launcher選択、引数の型・既定値を確認する。',
  },
  {
    id: 'release-bundle', title: 'Release・Bundle生成', implementation: 'observed', publication: 'review-before-v1', page: '/guides/distribute/',
    sources: ['apps/studio/src/system/project/release/release-bundle.ts', 'apps/studio/src/system/project/release/release-package.ts', 'apps/studio/src/system/project/release/release-content-hash.ts'],
    note: 'Bundleに含まれるApp/Resource、Revision、ハッシュ、再生成時の扱いを説明する。',
  },
  {
    id: 'client-packages', title: 'Clientのパッケージ管理と起動', implementation: 'observed', publication: 'review-before-v1', page: '/guides/distribute/',
    sources: ['apps/studio/src/system/client/client-package-controller.ts', 'apps/studio/src/system/client/client-package-repository.ts', 'apps/studio/src/system/client/client-launcher.ts', 'apps/studio/src/system/client/screen/ClientHomeScreen.svelte'],
    note: 'Install/Update/Delete/Rename、起動設定、Resource path、ショートカットの実動作を確認する。',
  },
  {
    id: 'direct-launch', title: 'ショートカットからの直接起動', implementation: 'observed', publication: 'review-before-v1', page: '/guides/distribute/',
    sources: ['apps/studio/src/system/AppRoot.svelte', 'apps/studio/src/system/client/client-direct-launcher.ts', 'apps/studio/src/system/infra/tauri/client-launch.ts'],
    note: 'OS起動要求からStudio UIを介さずRuntimeを開く条件、失敗時の復帰先を確認する。',
  },
  {
    id: 'settings', title: '設定・言語・エディター環境', implementation: 'observed', publication: 'candidate-v1', page: '/reference/',
    sources: ['apps/studio/src/system/application/settings/SettingHomeScreen.svelte', 'apps/studio/src/system/application/settings/app-settings-store.ts', 'apps/studio/src/system/application/localization/language.ts'],
    note: 'General、Code Editor、Element Defaultsの設定と永続化を記載する。',
  },
  {
    id: 'mcp-read', title: 'MCPのSession・読み取り・検証', implementation: 'observed', publication: 'needs-product-decision', page: '/mcp/',
    sources: ['apps/mcp/src/server.rs', 'apps/mcp/src/resources.rs', 'apps/mcp/src/bridge/session.rs'],
    note: '外部クライアント接続、セッション寿命、公開されるProject情報とソースの扱いを説明する。',
  },
  {
    id: 'mcp-write', title: 'MCPからのProject変更', implementation: 'observed', publication: 'needs-product-decision', page: '/mcp/',
    sources: ['apps/mcp/src/server.rs', 'apps/studio/src/system/mcp'],
    note: 'Dry Run、Revision競合、操作制限、トランザクション、適用確認を公開前に明示する。',
  },
  {
    id: 'localization', title: 'Studioの日本語・英語表示', implementation: 'observed', publication: 'review-before-v1', page: '/reference/',
    sources: ['apps/studio/src/system/application/localization/messages/ja.ts', 'apps/studio/src/system/application/localization/messages/en.ts'],
    note: '画面文言の翻訳網羅率と既定言語を確認する。サイト言語とアプリ言語は別々に管理する。',
  },
  {
    id: 'distribution-policy', title: '配布・無料提供・ダウンロード', implementation: 'not-code-derived', publication: 'confirmed-user-policy', page: '/download/',
    sources: [],
    note: 'ユーザー確認済み: 無料ソフトで、ダウンロード可能な初版完成時にサイト公開。配布URLや署名などはリリース時に確認する。',
  },
  {
    id: 'license-privacy-support', title: 'ライセンス・プライバシー・問い合わせ窓口', implementation: 'not-code-derived', publication: 'review-before-v1', page: '/legal/license/',
    sources: ['apps/studio/package.json', 'apps/studio/src-tauri/Cargo.toml', 'apps/mcp/Cargo.toml'],
    note: '依存ライセンス、データ保存・通信、問い合わせ先はソース確認だけで断定せず、配布物と運用方針を確認する。',
  },
];
