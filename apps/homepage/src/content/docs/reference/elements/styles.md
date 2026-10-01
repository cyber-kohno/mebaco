---
title: Styles
description: Project共通のStyle定義をまとめる管理要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`styles` はProjectで利用する再利用可能なStyle定義をまとめます。Styleを作っただけでは画面に適用されず、Tag側で選択します。

## 配置場所と操作

ProjectのCommon / Declares / Stylesにあります。Add styleでStyleを作成します。

## 子要素

Style定義を保持します。各Style内には必要に応じてParametersとLocalsを追加できます。

## 設定項目

Styles自身には設定項目がありません。Styleのプロパティ、状態別ルール、アニメーション、継承などは個々のStyleに設定します。

## 参照とスコープ

StyleはProject共通の候補としてTagから利用されます。個々のStyle式はStyle ParameterとLocals、Tag適用時のRuntime Contextを参照します。

## 実行時の動作

Stylesは宣言用コンテナです。RuntimeはTagに結び付いたStyleだけを解決し、CSS宣言として適用します。

## 最小例

Stylesから `primaryButton` を作り、TagのStyles欄で `button` に適用します。

## 制約と注意点

- Styleを定義するだけでは表示へ反映されません。
- TagのStyle Monitorで解決後の宣言や診断を確認します。
- Project共通Styleの削除・変更は、それを参照するTagや他Styleへ影響します。

## 関連項目

- [Style](/reference/elements/style/)
- [Styleを適用する](/guides/style-app/)
- [Tag](/reference/elements/tag/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="styles" />
