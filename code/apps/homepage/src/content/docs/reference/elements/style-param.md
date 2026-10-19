---
title: Style Parameter
description: Styleへ渡すstring・number・boolean・color型の引数。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`style-param` はStyleで参照する型付き引数です。TagにStyleを適用するときや、Styleを継承するときにBindingを設定します。

## 配置場所と操作

Style内のParametersコンテナでAdd parameterします。ModifyからID、型、任意のDefault Valueを編集できます。

## 子要素

子要素はありません。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | Style式で参照するJavaScript識別子（1〜32文字） |
| Value Type | string、number、boolean、color |
| Use Default Value | 呼出側がDefault Bindingを利用可能にする |
| Default Value | Value Typeに適合する固定値 |

## 参照とスコープ

StyleのProperties、Condition、Animationなどの式から `$param.<id>` で値を参照します。Color Parameterの式期待型はstringです。

## 実行時の動作

Style適用時、引数Bindingを解決してParameterを構築します。DefaultなしのParameterにはTag側の値が必要です。Base Style側ではDelegate Bindingにより、解決されないParameterを派生Styleへ引き渡せます。

## 最小例

`gap`をnumber型で定義し、StyleのGap式に `gap + 'px'` を設定します。Tagで `gap` に固定値またはFormulaを渡します。

## 制約と注意点

- Style Parameterは通常のFunction引数ではなく、Style解決専用の値です。
- Default Valueは固定Literalだけです。
- 同じStyle内でParameter Idは重複できません。
- Styleを使うすべてのTag／継承StyleにBindingが必要です。変更前に参照箇所を確認してください。

## 関連項目

- [Parameters](/reference/elements/style-params/)
- [Style](/reference/elements/style/)
- [Styleを適用する](/guides/style-app/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="style-param" />
