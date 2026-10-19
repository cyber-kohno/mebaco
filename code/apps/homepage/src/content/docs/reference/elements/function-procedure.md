---
title: Procedure
description: Functionの構造化された処理本体。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`function-procedure` はProcedureモードのFunctionが実行する、順序付きの処理本体です。Functionを作るとProcedure子要素が作成され、処理要素を追加して関数を構成します。

## 配置場所と操作

FunctionのImplementationをProcedureにすると表示されます。コンテキストメニューからDeclare、Statement、Directive、Blockを追加します。Procedure自体は削除・無効化する通常要素ではありません。

## 子要素

DeclareにはVariable/Function/型宣言、StatementにはAction/Promise/Transition/Return、DirectiveにはConditional/Switch、またBlockを追加できます。実行は上から順です。

## 設定項目

Procedure固有の設定項目はありません。引数・戻り値型・同期/非同期は親FunctionのSignatureと設定で決まります。

## 参照とスコープ

各Function呼び出しで引数とローカルVariableを持つVariableFrameを作ります。Procedure内宣言はそのフレームで評価され、ブロック階層は宣言の集約・可視範囲に影響しますが、Block独自の実行時VariableFrameは作りません。

## 実行時の動作

FunctionRunnerはProcedureの子を順番に実行します。Returnに到達すると後続処理を打ち切ります。Conditional/Switchは選択枝を実行し、Blockは子処理をその場で実行します。Promiseは非同期枝を開始します。完了値はFunctionの宣言戻り値型と照合されます。

## 最小例

1. Declare Variableで `total` を定義
2. Conditionalで入力値を検査
3. Actionで状態・処理を更新
4. Returnで結果を返す

## 制約と注意点

- Function Runnerが処理する制御要素はConditional、Switch、Block、Promiseなどで、LoopはProcedureの制御メニュー・実行分岐にありません。
- Procedure自体に戻り値欄はありません。値を返すならFunctionの戻り値型に合うReturnが必要です。
- Promise Then/CatchはFunction本体の同期的な戻り経路とは別に実行され、そこからReturnできません。
- 宣言IDは同じFunctionScope内で重複できません。

## 関連項目

- [Function](/reference/elements/function/)
- [Return](/reference/elements/function-return/)
- [Block](/reference/elements/block/)
- [Conditional（Procedure）](/reference/elements/control-conditional/)
- [Switch（Procedure）](/reference/elements/control-switch/)
- [Promise](/reference/elements/promise/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="function-procedure" />
