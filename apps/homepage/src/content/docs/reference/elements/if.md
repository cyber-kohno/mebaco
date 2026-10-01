---
title: If
description: Conditionalの最初の条件付き分岐。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`if` はConditionalまたはProcedure Conditionalの先頭に置く条件付き分岐です。親要素により、Retention内の表示かProcedure内の処理かが決まります。

## 配置場所と操作

Conditional作成時に自動作成されます。分岐を選択してModifyで条件を編集できます。If自身は無効化できます。

## 子要素

表示Conditionalでは任意のRetentionを持ちます。Procedure ConditionalではFunctionActionsから宣言、文、制御要素、Blockを追加します。

## 設定項目

Conditionは必須の式（最大4,000文字）で、作成時の初期値は `true` です。式はBooleanを返す必要があります。

## 参照とスコープ

条件式は親の評価Contextを参照します。Procedure内なら関数引数や同じFunctionScopeで有効な宣言を利用できます。

## 実行時の動作

親Conditionalが評価される際にConditionを評価します。真ならこの分岐が選ばれ、偽なら後続Else If/Elseを検討します。表示用ではこの枝のRetentionが表示され、Procedure用では枝の子処理が順番に実行されます。

## 最小例

```ts
$state.isReady
```

## 制約と注意点

- Boolean以外を返す式は実行時エラーです。
- どのConditionalにも属さないIfは有効な分岐として機能しません。
- 分岐の無効化状態と実行時の選択の関係は、初版公開前に配布ビルドで確認してください。

## 関連項目

- [Conditional（表示）](/reference/elements/conditional/)
- [Conditional（Procedure）](/reference/elements/control-conditional/)
- [Else If](/reference/elements/else-if/)
- [Else](/reference/elements/else/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="if" />
