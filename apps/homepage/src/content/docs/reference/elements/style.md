---
title: Style
description: CSS宣言・状態・アニメーション・継承をまとめてTagに適用する定義。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`style` はCSSプロパティ値をまとめ、Tagへ適用する再利用可能な宣言です。Categoryは一覧の整理用で、実際のCSSクラス名ではありません。

## 配置場所と操作

Common / Declares / Stylesに作成します。Modify画面にはInfo、Properties、Animations、Inheritance、Monitorのタブがあります。メニューからParametersとLocalsを任意に追加・削除します。

## 子要素

Properties、Animations、BasesはStyle内データです。ツリーの子としては任意のStyle ParametersとStyle Localsを持ちます。LocalsにはVariableとKeyframesを配置できます。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | Style参照名（1〜32文字） |
| Category | 任意の一覧カテゴリ（最大32文字） |
| Properties | 通常のCSS宣言とhover/focus/focus-visible/checked/active/disabledルール |
| Animations | Style Keyframesと再生条件・Animation設定 |
| Inherited Styles | Base Style、引数、任意の適用Condition |
| Resolved Style | 解決結果と診断を確認するMonitor |

プロパティ値は固定文字列または式です。

## 参照とスコープ

適用Conditionや引数はTag側のFormulaContextを使います。Style値ではそのStyleのParameterとLocalsが解決されます。継承したStyleへ引数を渡すか、公開Parameterとして呼出側に委譲できます。

## 実行時の動作

Tagが選んだStyle適用を順に解決し、継承Style、通常宣言、状態別宣言、Animationを解決済みスタイルへまとめます。式・型・CSS値・循環継承などの診断をStyle Monitorへ表示します。

## 最小例

Propertiesに `padding: 12px` と `background-color: #2563eb` を追加し、TagのStyles欄でそのStyleを選択します。

## 制約と注意点

- CSSプロパティ値は文字列として評価されます。ブラウザーのCSS.supportsで判定不能な値があり、全CSS構文を静的に検証する保証ではありません。
- 同じStyleを複数回適用したり、異なるStyleで同じプロパティを宣言すると、順序・状態により上書き関係が生じます。
- 循環継承、欠落参照、競合する公開Parameterは解決エラーになります。
- Style ParameterやLocalsのID変更は、式や継承引数の参照に影響します。
- Categoryは整理用メタデータであり、要素セレクターとしてCSSへ出力されません。

## 関連項目

- [Styles](/reference/elements/styles/)
- [Style Parameters](/reference/elements/style-params/)
- [Style Locals](/reference/elements/style-locals/)
- [Style Keyframes](/reference/elements/style-keyframes/)
- [Tag](/reference/elements/tag/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="style" />
