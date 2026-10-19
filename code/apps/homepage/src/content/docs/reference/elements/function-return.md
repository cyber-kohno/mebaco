---
title: Return
description: Function Procedureの実行を終え、値を呼び出し元へ返す要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`function-return` はProcedureモードFunctionの実行を終了し、任意の式の結果をFunctionの戻り値として返します。

## 配置場所と操作

Function ProcedureのStatementメニューから追加します。Void Functionでは空のReturn要素がそのまま作成されます。値を返すFunctionでは作成・編集時にReturn式を設定します。

## 子要素

子要素はありません。Return式は要素自身に設定します。

## 設定項目

Return式は最大4,000文字です。Functionに戻り値型がある場合、式の期待型はその戻り値型です。空式は `undefined` を返します。

## 参照とスコープ

式はその位置で有効な引数、State、Variable、Function等を参照します。Async FunctionのReturn式ではawaitが許可されます。

## 実行時の動作

Procedureを順に実行中にReturnに到達すると評価し、後続のProcedure要素を実行せずFunction呼び出しを完了します。返却値はFunctionの宣言型と照合され、不一致は呼び出しエラーです。

## 最小例

```ts
subtotal * 1.1
```

Functionの戻り値型に適合する式を指定します。

## 制約と注意点

- 値を返すFunctionでは、処理がReturnに到達しない経路も `undefined` を返すため、宣言型と合わず失敗する場合があります。
- Void Functionは値を返しても呼び出し結果はundefinedです。
- ReturnはPromise Then/Catch枝内で実行できません。
- Returnは同期Function内でawaitできません。非同期に待つならFunctionをAsyncにします。

## 関連項目

- [Function](/reference/elements/function/)
- [Procedure](/reference/elements/function-procedure/)
- [Promise](/reference/elements/promise/)
- [Signature Type](/reference/elements/signature-type/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="function-return" />
