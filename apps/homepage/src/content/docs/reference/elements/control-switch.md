---
title: Switch（Procedure）
description: Function Procedure内で値に応じた処理分岐を実行する要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`control-switch` はFunction Procedure内で式の値に一致する枝を選んで処理します。画面表示用の `switch` と編集スキーマ・Case/Defaultを共有しますが、枝内はFunctionActionsの処理要素です。

## 配置場所と操作

Procedureの `Add directive > Switch` で追加します。Modifyで型とExpressionを編集し、Add case、Use defaultで枝を構成します。Procedure制御要素のため無効化できません。

## 子要素

Caseを複数、Defaultを任意で1つ持てます。各枝には宣言、Action、Promise、Transition、Return（Promise枝を除く）、Conditional/Switch/Block等を配置できます。

## 設定項目

Value TypeはString、Number、Literal Union。Expressionは必須（最大4,000文字）で、同じ値型の値を返します。

## 参照とスコープ

式は関数実行Contextを参照します。枝の宣言はFunctionScopeに従い、Switchが独立したスコープを作るわけではありません。

## 実行時の動作

一致するCaseがあればその枝だけを順次実行します。一致がなければDefaultを実行し、DefaultもなければSwitch後の処理へ進みます。Case型不一致、重複、Literal Union違反、式エラーは失敗になります。

## 最小例

```ts
command
```

String Case `save` と `cancel` にそれぞれActionを置き、未対応値への処理が必要ならDefaultを追加します。

## 制約と注意点

- Switchは完全一致で一枝を選択し、C言語風のfall-throughは行いません。
- Case値は型に一致し、重複できません。数値は有限値である必要があります。
- Defaultは1つまで、末尾に置きます。
- このProcedure構造にLoopは含まれません。反復表示は別要素のLoopです。

## 関連項目

- [Function](/reference/elements/function/)
- [Procedure](/reference/elements/function-procedure/)
- [Case](/reference/elements/case/)
- [Default](/reference/elements/default/)
- [Switch（表示）](/reference/elements/switch/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="control-switch" />
