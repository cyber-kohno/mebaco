---
title: Block
description: 処理や表示ツリーをまとめるためのグループ要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`block` は子要素を階層的にまとめるグループです。Function ProcedureやRetention内の処理、表示Content内で利用できます。

## 配置場所と操作

Function ProcedureやProcedure枝のAdd block、RetentionなどのContent追加メニューで作成します。Block自体に編集ダイアログはなく、子を追加・移動して構成します。

## 子要素

配置場所に応じた子要素を持ちます。Procedureでは宣言、文、Conditional/Switch、さらにBlockを入れられます。RetentionではVariable、Action、制御構造などを扱います。

## 設定項目

固有設定はありません。

## 参照とスコープ

Blockは新しいVariableFrameを作りません。FunctionScopeはBlock内のFunction/Variable/型宣言をフレーム宣言として収集するため、単なる見た目のグループと異なり、宣言名は同じフレーム内で重複しないようにします。

## 実行時の動作

FunctionRunnerはBlockの子をその位置で順番に実行し、Returnやエラーがあれば親の実行へ伝播します。RetentionResolverもBlockの子処理を順に解決します。Blockは実行コンテキストを独立させません。

## 最小例

関連する入力検査VariableとActionをBlockにまとめ、その後に処理本体を配置します。順序とスコープはBlockの内外で連続します。

## 制約と注意点

- Blockによるローカルスコープ隔離はありません。
- Function Procedure内で使う場合、宣言IDの重複は同じFunctionScopeの重複として検出されます。
- 同じBlockでも親が表示ContentかFunction Procedureかで追加できる要素・実行文脈は異なります。

## 関連項目

- [Procedure](/reference/elements/function-procedure/)
- [Retention](/reference/elements/retention/)
- [Variable](/reference/elements/variable/)
- [Conditional（Procedure）](/reference/elements/control-conditional/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="block" />
