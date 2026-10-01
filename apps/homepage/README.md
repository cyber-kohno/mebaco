# Mebaco Homepage

Astro + Starlightで構築するMebacoの製品紹介・使い方・仕様リファレンスサイトです。

## 開発

リポジトリのルートから実行します。

```bash
npm install
npm run dev --workspace @mebaco/homepage
```

ビルドと仕様台帳の照合:

```bash
npm run build --workspace @mebaco/homepage
npm run check:coverage --workspace @mebaco/homepage
```

## 情報設計

- 製品紹介: Mebacoで作れるものと開発の流れ
- はじめる: インストールから最初のProject
- 概念: Project、Component、Retention、式とスコープ
- ガイド: 目的を達成する手順
- リファレンス: 全要素、式、型、保存・配布仕様
- 運用情報: MCP、トラブルシューティング、リリース、法務

導入・ガイド・リファレンスを別の目的で書き、相互リンクします。リファレンスの各要素ページは「概要 / 配置場所 / 子要素 / 設定 / スコープ / Runtime / 例 / 制約 / 関連項目 / バージョン / 根拠ソース」の書式を基本にします。

## 仕様の網羅性

`src/data/element-catalog.mjs` に、Studioの `ElementRegistry` で編集対象になるElement kindを分類します。`docs/homepage-feature-catalog.mjs` に製品機能、根拠ソース、公開ページ、初版公開状態を記録します。`scripts/check-doc-coverage.mjs` は両方の台帳と実装ソースの参照切れを検出します。機能変更時には該当ページと導入バージョンも更新します。判断基準と公開前の未決事項は [`docs/HOMEPAGE_FEATURE_INVENTORY.md`](../../docs/HOMEPAGE_FEATURE_INVENTORY.md) に記録します。

初版公開の条件は、カタログ照合に加え、ユーザー向け仕様と実装を担当者が照合することです。自動照合はページ本文の正しさまでは保証しません。

## 入門チュートリアル

`start/first-project.md` は、新規ProjectからCounterを作り、Preview・保存・再読込まで進む手順です。`guides/build-ui.md` と `guides/state-and-actions.md` に基本操作とリセットボタンへの発展例を掲載します。ソース根拠と初版公開前のデスクトップ確認項目は [`docs/HOMEPAGE_TUTORIAL_REVIEW.md`](../../docs/HOMEPAGE_TUTORIAL_REVIEW.md) に記録します。本文のソース照合と実機の通し確認は別の検証段階です。

## 個別要素・型リファレンス

StudioのElement Registryに登録された82 kindすべての個別ページを `reference/elements/` に用意しています。`src/data/element-reference-catalog.mjs` にページと根拠を登録すると、要素一覧は個別仕様へリンクします。各ページには配置場所、親子要素、設定、スコープ、Runtime動作、制約とソース根拠を記載します。

`guides/reuse-components.md` は、Panelを2つ表示し、Props・Slot・RetentionとローカルStateの分離を学ぶ手順です。現行実装のSlot配置制約とProps割当て式のスコープを明記しています。配布ビルドでの通し確認は別途必要です。

式リファレンスは入力時の型診断とRuntimeの構文変換を区別し、参照名が見える範囲を説明します。型リファレンスとObject / Union / Signatureの個別仕様から、型の組み立てと制約へ進めます。

`check:coverage` は個別ページの共通見出しと根拠参照も検査します。ページ追加の基準、実装から得た注意点、初版実機確認項目は [`docs/HOMEPAGE_ELEMENT_REFERENCE_REVIEW.md`](../../docs/HOMEPAGE_ELEMENT_REFERENCE_REVIEW.md) を参照してください。

## 公開前に完成させる内容

- インストール・初回Projectの画面キャプチャ付き手順
- 全個別仕様の継続的なソース照合と、変更時のバージョン・互換性更新
- 式・型・イベント・Effectの参照ページ
- Resource、Storage、保存、Bundle、Clientの仕様と互換性
- リリース情報、ライセンス、プライバシー、サポート方法
- すべての内部リンクとダウンロード導線の確認
