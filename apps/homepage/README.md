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

`src/data/element-catalog.mjs` に、Studioの `ElementRegistry` で編集対象になるElement kindを分類します。`scripts/check-doc-coverage.mjs` は Registry とカタログの差分・重複を検出します。新要素を追加したときは、仕様ページの内容と導入バージョンも一緒に更新します。

初版公開の条件は、カタログ照合に加え、ユーザー向け仕様と実装を担当者が照合することです。自動照合はページ本文の正しさまでは保証しません。

## 公開前に完成させる内容

- インストール・初回Projectの画面キャプチャ付き手順
- 全Elementの親子制約、設定項目、スコープ、Runtime仕様
- 式・型・イベント・Effectの参照ページ
- Resource、Storage、保存、Bundle、Clientの仕様と互換性
- リリース情報、ライセンス、プライバシー、サポート方法
- すべての内部リンクとダウンロード導線の確認
