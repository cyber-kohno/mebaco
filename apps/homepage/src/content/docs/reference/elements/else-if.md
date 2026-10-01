---
title: Else If
description: 先行条件が不成立のときに評価する追加条件分岐。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`else-if` はIfより後に評価される追加の条件分岐です。表示用ConditionalとProcedure Conditionalの両方で使われます。

## 配置場所と操作

親ConditionalのメニューからAdd else ifで追加します。Elseがある場合はElseの直前に挿入されます。条件式をModifyで編集でき、分岐は無効化できます。

## 子要素

表示文脈では任意のRetention、Procedure文脈では処理要素を持ちます。子要素の種類は親Conditionalで変わります。

## 設定項目

Conditionは必須の式（最大4,000文字）です。初期値は `false` です。

## 参照とスコープ

条件は親Conditionalの評価Contextで評価されます。Procedure枝の宣言はFunctionScopeに従います。

## 実行時の動作

先行するIf/Else Ifが真でなかった場合に評価されます。真ならこの枝が選択され、以降の枝は評価されません。Falseなら次の枝へ進みます。

## 最小例

```ts
$state.score >= 80
```

## 制約と注意点

- 条件はBooleanを返す必要があります。
- 親Conditionalの子順が評価順です。Add else ifは既存Elseの前に配置します。
- 複数の条件が真になり得る場合、先に一致した枝だけが実行・表示されます。

## 関連項目

- [If](/reference/elements/if/)
- [Else](/reference/elements/else/)
- [Conditional（表示）](/reference/elements/conditional/)
- [Conditional（Procedure）](/reference/elements/control-conditional/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="else-if" />
