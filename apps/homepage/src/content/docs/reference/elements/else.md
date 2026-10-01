---
title: Else
description: 先行する条件分岐がどれも成立しないときの分岐。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`else` はIf/Else Ifが成立しなかったときの最後の分岐です。表示用とProcedure用のConditionalで共通の要素です。

## 配置場所と操作

親ConditionalのメニューからUse elseで追加します。既にElseがある場合は追加できません。Else自身は無効化できます。

## 子要素

表示用では任意のRetentionに表示要素を入れます。Procedure用では宣言、Action、Promise、Transition、制御要素、Block等を配置します。

## 設定項目

条件設定はありません。

## 参照とスコープ

親Conditionalの実行Contextを使います。Procedure内の宣言可視性はFunctionScopeに従います。

## 実行時の動作

ConditionalResolverは順序に到達したElseを無条件の残余分岐として返します。Elseがなく条件がすべて偽なら、表示は空となり、Procedureでは後続処理へ進みます。

## 最小例

If側に成功時UIまたは処理を置き、Elseに未成立時の案内・代替処理を置きます。

## 制約と注意点

- Elseは親Conditionalごとに1つです。
- Elseは最後に配置する前提です。手動で順序を崩さないでください。
- Elseを置かない場合、条件未成立時のフォールバックはありません。

## 関連項目

- [If](/reference/elements/if/)
- [Else If](/reference/elements/else-if/)
- [Conditional（表示）](/reference/elements/conditional/)
- [Conditional（Procedure）](/reference/elements/control-conditional/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="else" />
