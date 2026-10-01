---
title: Switch（表示）
description: 式の値に一致するCaseの表示内容を選ぶ要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`switch` は式の値とCase値を比較し、一致したCaseの内容を表示します。Function Procedure向けの `control-switch` とは異なり、表示要素です。

## 配置場所と操作

表示要素を追加できる場所に作成します。Modifyで値型と式を編集し、Add caseでCase、Use defaultで任意のDefaultを追加します。Switch自身は無効化できます。

## 子要素

Caseを複数持てます。Defaultは任意で最大1つ、末尾に置きます。Case/Defaultは任意のRetentionを持ち、選択時の表示内容を定義します。

## 設定項目

Value TypeはString、Number、またはLiteral Unionです。Expressionは必須の式（最大4,000文字）で、選択した型の値を返します。

## 参照とスコープ

Expressionは表示側のFormulaContextで評価されます。Case値は選択したValue Typeに合わせて入力し、Literal Unionの場合は許可されたリテラルから選択します。

## 実行時の動作

式を評価し、値が完全一致するCaseを選択します。一致がなければDefaultを選び、Defaultもなければ何も表示しません。数値型は有限値のみ有効です。

## 最小例

Value TypeがStringの場合:

```ts
$state.status
```

Case `ready` と `error` を作り、それぞれのRetentionに表示内容を配置します。

## 制約と注意点

- Case値の型はSwitchの型と一致させます。重複Case値はエラーです。
- Literal Unionでは定義外のCase値・評価結果は許可されません。
- Defaultは1つだけで末尾に必要です。
- 比較は値の完全一致です。範囲条件やパターン照合ではありません。

## 関連項目

- [Case](/reference/elements/case/)
- [Default](/reference/elements/default/)
- [Switch（Procedure）](/reference/elements/control-switch/)
- [Union Type](/reference/elements/union-type/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="switch" />
