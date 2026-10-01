# ホームページ入門チュートリアルの検証台帳

対象は `apps/homepage/src/content/docs/start/first-project.md` と、そこから続く `guides/build-ui.md` / `guides/state-and-actions.md`。本文を更新したときは、以下の根拠とデスクトップ操作を再確認する。

## 現在の確認範囲

- 2026-10-02: ソースのメニュー名、設定欄、既定構造、実行・保存経路を照合して本文を作成した。
- ソース照合は、配布ビルドで本文どおり操作できることや画面の見やすさを保証しない。
- 初版公開前にデスクトップ版Studioで手順を通し、実際の画面キャプチャを追加する。現在、実機の通し操作とキャプチャは未完了。
- 通常のStateとProject保存の関係だけを説明し、Storageの永続化・互換性方針はこのチュートリアルで確定しない。

## 根拠ソース

すべてリポジトリルートからの相対パス。

| 本文の内容 | 根拠 |
| --- | --- |
| 新規Projectと開発ホーム | `apps/studio/src/system/workspace/screen/DevelopHomeScreen.svelte` / `apps/studio/src/system/project/project-tree-factory.ts` |
| App追加、Main自動生成、Entry参照 | `apps/studio/src/system/workspace/element-definition/project/apps-element-definition.ts` / `apps/studio/src/system/workspace/element-definition/app/app-element-definition.ts` |
| Mainの子構造 | `apps/studio/src/system/workspace/element-definition/component/component-element-definition.ts` |
| Stateの型と初期値 | `apps/studio/src/system/workspace/element-definition/variable/store/state-element-definition.ts` / `apps/studio/src/system/ui/input/ValueSourceField.svelte` / `apps/studio/src/system/workspace/element-editor/type-system/ValueTypeEditor.svelte` |
| Tag / Text追加メニュー | `apps/studio/src/system/workspace/tree/context-menu/content-actions.ts` |
| Tag nameとAttributeタブ | `apps/studio/src/system/workspace/element-definition/view/tag-element-definition.ts` |
| Textの固定値・式、文字列型 | `apps/studio/src/system/workspace/element-definition/view/text-element-definition.ts` / `apps/studio/src/system/workspace/element-editor/view/TextSourceEditor.svelte` |
| 式切替とポップオーバー | `apps/studio/src/system/ui/formula/FormulaModeToggle.svelte` / `apps/studio/src/system/ui/formula/CompactFormulaField.svelte` |
| clickとAction入力 | `apps/studio/src/system/model/view/tag-event-catalog.ts` / `apps/studio/src/system/workspace/element-editor/view/TagAttributesEditor.svelte` / `apps/studio/src/system/ui/script/ActionField.svelte` |
| 作成・更新・日本語表記 | `apps/studio/src/system/workspace/element-editor/layer/ElementDialogLayer.svelte` / `apps/studio/src/system/application/localization/messages/ja.ts` |
| T、Ctrl+Sと操作条件 | `apps/studio/src/system/application/keyboard/app-keyboard-controller.ts` |
| 選択Appのrun | `apps/studio/src/system/terminal/provider/app-provider.ts` / `apps/studio/src/system/terminal/catalog/run-catalog.ts` |
| Previewの終了とState再初期化 | `apps/studio/src/system/runtime/preview/PreviewDialog.svelte` / `apps/studio/src/system/runtime/view/RuntimeView.svelte` / `apps/studio/src/system/runtime/runtime-state.ts` |
| Projectの保存・再読込 | `apps/studio/src/system/project/project-file.ts` / `apps/studio/src/system/workspace/DevelopOperations.svelte` |

## デスクトップ版の通し確認（公開前ゲート）

既存Projectを上書きせず、新しい検証用ファイルに保存する。実施時に使用したStudioのバージョン、OS、表示言語、日付、結果を記録する。

- [ ] 空のProjectから開始し、本文以外の事前設定を必要としない。
- [ ] Add appでcounterを作成でき、Main自動生成後にEntryがMainを参照する。
- [ ] MainのStatesにnumber型countを作り、InitialのSet Valueで0を入力できる。
- [ ] pとbuttonをElements直下に作成し、それぞれにTextを追加できる。
- [ ] Textの式切替、式欄のクリック、ポップオーバー終了、要素の作成確定を本文どおり行える。
- [ ] `String($state.count)` に型・構文エラーが出ない。
- [ ] clickイベントのActionが入力・確定できる。prevent default / stop propagationは不要。
- [ ] counter選択時のTからrunを実行でき、Previewの表示が0→1→2→3になる。
- [ ] Previewを閉じて再実行すると0に戻る。
- [ ] 保存ダイアログで新規counter.mbcを保存し、閉じて開き直せる。
- [ ] 再読込後もツリーとコードが復元され、0からクリック動作を再現できる。
- [ ] 関連ガイドのリセットボタンでcountが0に戻る。
- [ ] 日本語・英語表示で共通ボタン名と操作位置が一致する。
- [ ] 手順・ツリー・イベント設定・Previewの実画面キャプチャを追加し、ページ上で読みやすさを確認する。
- [ ] 初学者が本文だけを読んで通し操作できる。

## 自動確認

サイトビルドと仕様台帳チェッカーを実行する。必要に応じてStudioの既存RuntimeState、ActionEvaluator、StateView、Keyboardのテストも確認する。これらはネイティブ保存ダイアログや画面操作の代わりにはならない。

```powershell
npm run build --workspace @mebaco/homepage
npm run check:docs
```

### 2026-10-02の自動確認結果

- Astroビルド成功: 30ページを出力し、Pagefindの検索インデックスも生成。
- 仕様台帳照合成功: 82 Element kind、28機能、77ソース参照。
- ビルド済みHTMLのルート相対リンク1,048件を確認。参照先ファイルと、それらに指定されたアンカーの欠落なし。
- Studioの既存 `runtime-state.test.ts` / `action-evaluator.test.ts` / `state-view.test.ts` / `app-keyboard-controller.test.ts` が成功（4ファイル、41テスト）。CounterをGUIで通し操作した結果ではない。
- ビルドにはMarkdown設定の非推奨警告と、公開URL（`site`）未設定によるsitemap省略の警告が残る。公開先を決めてからsitemapを確認する。
