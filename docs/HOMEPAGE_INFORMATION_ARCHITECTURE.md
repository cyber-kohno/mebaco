# Mebaco ホームページ情報設計

## 決定済みの前提

- 主対象: プログラマーを主軸に、フロントエンド未経験者にも手順が分かる説明を用意する。
- 製品の第一印象: 「ローカルアプリ開発環境」と表現する。「フロントエンド版Unity」は内部の比喩や補足説明に限定する。
- 公開時期: ダウンロード可能な初版が完成した時点で公開する。
- 用途: 無料ソフトの紹介、使い方、網羅的な仕様リファレンス。

## 推奨基盤

既存のTrace Kernelホームページと同じAstro + Starlightを採用し、Markdownを主な執筆形式にする。トップページと対話的なカタログだけMDX/Astroを使う。日本語を既定言語とし、将来の英語化を想定したlocale構成を初期設定に置く。

## サイト構造

1. 製品紹介: 価値、できること、対象用途、開発の流れ
2. はじめる: インストール、最初のProject
3. 基本概念: Project、App、Entry、Component、Retention、式とスコープ
4. ガイド: UI、State/Action、Component再利用、Style、Resource/Storage、Command Console、Debug、配布
5. リファレンス: Element、式、型、Project保存、Bundle/Client
6. 継続利用情報: レシピ、MCP、トラブルシューティング、互換性、リリース、法務

## リファレンスの品質基準

各Elementの仕様ページには、概要、配置可能な場所、許可される子、設定項目、スコープと参照可能な値、Runtimeでの動作、最小例、制約、関連項目、導入バージョン、根拠ソースを掲載する。

実装上の識別子をユーザー向け名称と区別し、未公開・実験中・内部要素があれば公開対象外であることを示す。実装から推測した仕様は確定事項として書かず、ソースで確認できない点は明示して解決する。

## 網羅性の維持

- Studioの `ElementRegistry` を現行要素の照合元とする。
- `apps/homepage/src/data/element-catalog.mjs` が文書化対象のkindと分類を保持する。
- `docs/homepage-feature-catalog.mjs` がユーザー向け機能と実装根拠、公開判断、参照ページを保持する。
- `apps/homepage/src/data/element-reference-catalog.mjs` が個別要素ページ、照合日、根拠ファイル、導入バージョンを保持する。現在は基本6要素、Props・Slot・Retention関連9要素、Object / Union / Signature Typeの3要素、Variable / Constant / Function / Action / Effectの5要素、制御・非同期処理16要素、Resource／Storage関連8要素、計47要素を個別仕様化している。
- `npm run check:coverage --workspace @mebaco/homepage` で要素の漏れ、廃止済み項目、重複、機能の根拠ファイルとリンク切れ、個別ページの共通見出しと根拠参照を検出する。
- 個別リファレンスの拡張と公開前確認は `docs/HOMEPAGE_ELEMENT_REFERENCE_REVIEW.md` に記録する。Registryの網羅性と、個別仕様本文の整備率は別に表示する。
- 追加・変更PRでは、該当ページ、画面キャプチャ、用語・互換性記述の更新を同時に確認する。
- Registry照合を通過しても本文の意味的な正しさは保証しないため、リリース前に実装との人手照合を行う。

公開判断の基準と未決事項は [`HOMEPAGE_FEATURE_INVENTORY.md`](./HOMEPAGE_FEATURE_INVENTORY.md) に記録する。実装確認と初版のサポート対象決定を混同しない。

## 公開ゲート

- ダウンロード物のリンク、署名状況、ハッシュ、対応環境を確定する。
- はじめ方を初版UIで通し、別の人が再現できることを確認する。
- 実装済み機能のElement、式、型、Storage、Bundle、Clientに仕様ページを揃える。
- 既知の制限、エラー調査方法、互換性、ライセンス、プライバシーを確認する。
- リンク切れと未完成表示を解消する。

サイトの実体と執筆開始用ページは `apps/homepage/` に配置する。
