---
title: Promise
description: Function ProcedureでPromiseの成功・失敗後の処理を記述する非同期要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`promise` はFunction Procedureの式を評価し、返されたPromiseの解決後にThen、拒否時に任意のCatchを処理します。Promise自体は関数呼び出し元へPromiseを返す構文ではなく、Procedure内の非同期ステップです。

## 配置場所と操作

Function Procedureまたは対応する処理枝の `Add statement > Promise` で追加します。Modifyで結果モード、型、式を設定し、メニューでCatchを追加・削除できます。Promiseは無効化できます。

## 子要素

Thenは必須で初期作成されます。Catchは任意で、Use catchから追加します。各枝には宣言、Action、Promise、Transition、Conditional/Switch/Block等を配置できますが、Returnは追加できません。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Result | VoidまたはValue |
| Result Id | Value時に解決値を束縛する識別子（1〜32文字） |
| Value Type | 解決値の期待型 |
| Promise | Promise<T>を返す必須式（最大4,000文字） |

Voidの場合はResult IdとValue Typeを使いません。

## 参照とスコープ

式はFunctionの呼び出しContextで評価され、Promiseを返す必要があります。ValueモードのResult IdはThen枝だけで利用できます。CatchのError IdはCatch枝内でエラー値を参照するための名前です。

## 実行時の動作

式を同期評価してPromiseであることを確認し、解決後に解決値の型を検査してThenを実行します。拒否時はCatchがあればエラーを束縛して実行し、なければ失敗として報告します。Promise枝は非同期で継続し、枝処理の失敗も関数処理エラーとして報告されます。

## 最小例

```ts
fetchRecord(recordId)
```

ValueモードでResult Idを `record`、Value Typeを取得対象型にし、Then内で `record` をAction等に渡します。失敗を扱うならCatchのError Idを設定します。

## 制約と注意点

- Promise式は実際にPromiseを返す必要があります。同期値は無効です。
- Promise式の評価自体はawaitなしの同期評価です。非同期処理は返したPromiseで表現します。
- Catchなしで拒否されると失敗が報告されます。必要な回復・ユーザー通知をCatchに配置してください。
- Then/Catch内ではReturnを使用できません。非同期枝の完了はFunction全体の戻り値とは別です。
- Async Function内ではPromise枝でawaitを使える範囲があります。同期Functionでは利用できません。
- Promise枝は呼び出しContextから派生したフレームで動きます。呼び出し元の後続処理との時間順を前提にしないでください。

## 関連項目

- [Function](/reference/elements/function/)
- [Procedure](/reference/elements/function-procedure/)
- [Then](/reference/elements/promise-then/)
- [Catch](/reference/elements/promise-catch/)
- [Action](/reference/elements/action/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="promise" />
