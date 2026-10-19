---
title: Constants
description: 固定値または型既定値を持つ名前付き定数の一覧。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`constants`は名前付きConstant定義をまとめます。Constants自体は値を持たず、個々のConstantがId・型・値を持ちます。

## 配置場所と操作

Declares配下に配置されます。Add constantから作成し、Id、型、Valueを設定します。

## 子要素

0個以上の`constant`を持ちます。

## 設定項目

Constants自体の設定はありません。子Constantで型や固定値を指定します。

## 参照とスコープ

Constant参照候補は定義の置かれたCommon／App／ローカル宣言スコープから収集されます。式欄ごとの参照モードやアクセス名は[式リファレンス](/reference/expressions/)を参照してください。

## 実行時の動作

Constantsは実行時の可変Storeではなく、式の参照先となる定数定義です。

## 最小例

ConstantsからConstantを作り、`maxItems`をNumber型、値`20`として定義します。対応する式欄で参照して使用します。

## 制約と注意点

- 同じ可視スコープでIdを重複させないでください。
- ConstantはStateのような更新可能な値ではありません。
- 型・値の編集は参照先式の型診断に影響します。

## 関連項目

- [Declares](/reference/elements/declares/)、[Constant](/reference/elements/constant/)
- [式・コード](/reference/expressions/)、[型システム](/reference/types/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="constants" />
