---
title: Then
description: Promiseが解決したときに実行する処理枝。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`promise-then` は親Promiseが正常に解決したときの処理を表します。解決値は親PromiseがValueモードなら指定Result Idで参照できます。

## 配置場所と操作

Promise作成時に1つ自動作成されます。独立した追加・削除や無効化はできず、Promiseの子処理枝として編集します。

## 子要素

宣言、Action、Promise、Transition、Conditional/Switch、Block等を持てます。Returnは追加できません。

## 設定項目

Then自体の設定項目はありません。解決値の有無・型・名前は親PromiseのResult設定で決まります。

## 参照とスコープ

親PromiseがValueを返す場合、そのResult IdがThen枝内の変数として見えます。Voidモードでは解決値の変数はありません。枝内宣言はFunctionScopeの規則に従います。

## 実行時の動作

Promiseが解決し、Valueモードの場合は宣言型チェックに成功した後でThenの処理が順番に実行されます。Reject時にはThenは実行されません。

## 最小例

親PromiseのResult Idを `record` として、Then内のActionで `record` を使います。

## 制約と注意点

- Thenは必須です。
- 解決値の型がValue Typeに適合しない場合、Thenへ進まずエラーになります。
- ThenからFunction Returnは追加できません。非同期完了値を関数の戻り値に変換する用途ではありません。

## 関連項目

- [Promise](/reference/elements/promise/)
- [Catch](/reference/elements/promise-catch/)
- [Variable](/reference/elements/variable/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="promise-then" />
