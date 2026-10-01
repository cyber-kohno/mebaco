---
title: Conditional（Procedure）
description: Function Procedure内で処理分岐を実行する要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`control-conditional` はProcedure内の処理を条件分岐します。`conditional` とIf/Else If/Elseのモデルを共有しますが、選ばれた分岐の子要素は画面内容ではなく関数処理です。

## 配置場所と操作

FunctionのProcedureで `Add directive > Conditional` を選びます。初期状態でIfが1つ作られ、Else Ifを追加できます。Elseは任意で1つです。Procedure分岐は無効化できません。

## 子要素

各If/Else If/Elseには、変数・関数・Action・Promise・Transition、Return（Promise分岐を除く）、さらにConditional/Switch/Blockを追加できます。

## 設定項目

Conditional自身に設定欄はありません。If/Else IfのConditionに最大4,000文字の式を設定します。

## 参照とスコープ

条件はその関数呼び出しのFormulaContextで評価されます。分岐内の宣言はFunctionScopeのフレーム規則に従います。分岐は別関数や独立したVariableFrameを作るものではありません。

## 実行時の動作

FunctionRunnerは条件を上から評価し、最初に真になった枝だけを順次実行します。Elseは残余枝です。評価式エラー、Boolean以外の値、枝内の処理エラーは関数呼び出しの失敗になります。分岐なしなら後続処理に進みます。

## 最小例

IfのCondition:

```ts
amount >= 0
```

If側で成功結果を設定し、Else側でエラー処理を行うように処理を組みます。

## 制約と注意点

- ConditionはBooleanを返す必要があります。
- 条件は順序評価です。Else Ifは広い条件より後に配置してください。
- 表示内容を置くConditionalとは実行文脈が異なります。同じIf/Else要素でも、親がcontrol-conditionalならProcedureの処理分岐です。
- Procedureの分岐内で宣言した名前の可視範囲はFunctionScopeに従います。意図しない重複宣言に注意してください。

## 関連項目

- [Function](/reference/elements/function/)
- [Procedure](/reference/elements/function-procedure/)
- [If](/reference/elements/if/)
- [Switch（Procedure）](/reference/elements/control-switch/)
- [Promise](/reference/elements/promise/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="control-conditional" />
