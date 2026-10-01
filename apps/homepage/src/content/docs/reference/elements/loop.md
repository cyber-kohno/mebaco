---
title: Loop（表示）
description: Countまたは配列に応じて表示内容を繰り返す要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`loop` はCount回または配列の各要素について内容を繰り返し表示します。Function Procedureの処理フローで使う制御ループではありません。

## 配置場所と操作

Contentを追加できる場所に作成します。ModifyでModeをCountまたはFor Eachに変更し、任意のRetentionに繰り返す表示要素を追加します。Loopは無効化できます。

## 子要素

Loopは要素ツリー上に直接の子を持たず、任意のRetentionが表示内容を保持します。各反復でRetentionが評価・表示されます。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Mode: Count | 数値を返すCount式（最大4,000文字） |
| Mode: For Each | 配列を返すCollection式（最大4,000文字） |
| Item Variable | For Eachの各要素名。JavaScript識別子、1〜32文字 |
| Index Variable | 反復番号の名前。JavaScript識別子、1〜32文字 |

CountではIndex Variableのみ使います。For EachではItemとIndexの識別子は異なる名前にします。

## 参照とスコープ

各反復は親 `$var` の値を基にした反復用VariableFrameを持ちます。For EachのItemとIndexはその反復内でconstとして参照できます。CountのIndexは0始まりです。

## 実行時の動作

Count式は0以上の有限整数である必要があります。For Each式はArrayを返す必要があります。各反復に対する表示Contextを作ってRetentionを描画します。最大反復数は10,000です。

## 最小例

Count式:

```ts
$state.pageCount
```

またはFor Each式:

```ts
$state.todos
```

For EachではItem Variableを `todo` とし、Retention内から `todo.title` などを参照します。

## 制約と注意点

- 負数、小数、無限大、10,000超のCountはエラーです。
- For EachはArray限定で、10,000項目を超える配列はエラーです。
- Loopは処理を実行するFunction Procedureの制御要素ではありません。ProcedureのAdd directiveにはConditional/Switchのみがあり、FunctionRunnerにLoop処理分岐はありません。
- 大きな配列を表示すると描画負荷が高くなります。表示件数を制限してください。

## 関連項目

- [Retention](/reference/elements/retention/)
- [Variable](/reference/elements/variable/)
- [Conditional（表示）](/reference/elements/conditional/)
- [Function](/reference/elements/function/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="loop" />
