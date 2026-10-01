---
title: Conditional（表示）
description: 条件に合う一つの表示分岐を選ぶ要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`conditional` は画面内で表示する内容を条件に応じて切り替えます。Function Procedureの処理分岐 `control-conditional` とは別の要素です。

## 配置場所と操作

ComponentやTagなど表示内容を持つ場所に追加します。作成時にIfが1つ作られ、右クリックメニューからElse Ifを追加し、Elseを任意で追加できます。Conditional全体は無効化できます。

## 子要素

子要素は順序付きのIf、Else If、任意のElseです。各分岐はRetentionを任意に持ち、そのRetentionに表示内容を入れます。

## 設定項目

Conditional自身に設定欄はありません。If/Else IfのConditionには最大4,000文字の式を設定します。Elseには条件がありません。

## 参照とスコープ

分岐条件は通常のFormulaContextで評価され、見えるState、Props、Variable、Function等を参照します。分岐Retentionの内容は選択された分岐の表示文脈で評価されます。

## 実行時の動作

子分岐を上から評価し、最初に真となったIf/Else Ifを選択します。Elseがあれば残余分岐となります。式エラーまたはBoolean以外の値は実行時エラーです。条件がどれも真でElseもなければ何も表示しません。

## 最小例

```ts
$state.isSignedIn
```

Ifに上の条件を置き、IfのRetentionにはログイン後の画面、Elseにはログイン案内を配置します。

## 制約と注意点

- 条件はBooleanを返す必要があります。Truthy/Falsy値は条件として受け入れられません。
- 分岐は順序で優先順位が決まるため、広い条件を先に置くと後続分岐に到達しない場合があります。
- Elseは任意で1つです。選択分岐がない場合、表示は空になります。
- これは表示分岐であり、Function Procedure内のAction等を実行する制御要素ではありません。

## 関連項目

- [If](/reference/elements/if/)
- [Else If](/reference/elements/else-if/)
- [Else](/reference/elements/else/)
- [Retention](/reference/elements/retention/)
- [Procedure Conditional](/reference/elements/control-conditional/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="conditional" />
