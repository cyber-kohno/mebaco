---
title: Case
description: Switchの式と比較するケース値と、その枝の内容。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`case` は親Switch式の値と比較する値、および一致時の枝を表します。親が `switch` なら表示、`control-switch` ならProcedure処理になります。

## 配置場所と操作

親SwitchのAdd caseから作成します。Case値をModifyでき、Caseは無効化できます。

## 子要素

表示Switchでは任意のRetentionを持ちます。Procedure Switchでは処理要素を持ちます。

## 設定項目

Case値は親SwitchのString/Number型に従います。Literal Union型なら許可された候補を選びます。同じSwitch内で同じCase値は登録できません。

## 参照とスコープ

Case値自体は式ではなくリテラルです。枝内で参照できる値・宣言は親の表示またはFunctionScopeに従います。

## 実行時の動作

親Switch式とCase値の型付き値が一致した場合に枝が選ばれます。選ばれた枝のRetentionを表示するか、Procedure子処理を実行します。

## 最小例

String SwitchのExpressionが `status` の場合、値 `ready` のCaseを作り、その枝に準備完了の内容または処理を置きます。

## 制約と注意点

- 値型は親Switchと一致する必要があります。
- 重複値、非有限数値、Literal Unionに含まれない値は無効です。
- Caseの並びは値選択の優先度にはなりませんが、Defaultは必ず最後に置きます。
- Caseは共通モデルのため、操作メニューと子要素は親が表示SwitchかProcedure Switchかで変わります。

## 関連項目

- [Switch（表示）](/reference/elements/switch/)
- [Switch（Procedure）](/reference/elements/control-switch/)
- [Default](/reference/elements/default/)
- [Union Type](/reference/elements/union-type/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="case" />
