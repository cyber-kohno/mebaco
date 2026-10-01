---
title: Functions
description: Project内のFunction定義をまとめる宣言コンテナ。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`functions`はFunction定義の一覧です。Functions自身は関数本体や値を持ちません。

## 配置場所と操作

Declares配下に配置されます。Add functionからFunctionを作成します。新しいFunctionの引数・戻り値・コードなどはFunction定義で編集します。

## 子要素

0個以上の`function`を持ちます。

## 設定項目

Functions自体には設定項目がありません。

## 参照とスコープ

Function候補は定義位置のスコープに従います。Common Functionは広い共有候補になりますが、Appやローカル宣言のFunctionは同じ可視性とは限りません。

## 実行時の動作

Functionは式や処理から呼び出されます。引数と戻り値の型、同期／非同期、Runtime Contextは個別Functionの定義や呼び出しモードによります。

## 最小例

Add functionで数値引数を受け取る`double`関数を定義し、式または許可されたコード欄から呼び出します。

## 制約と注意点

- Functionsフォルダー自体を式から呼び出すことはできません。子Functionを参照します。
- Functionの削除や改名は参照している式に影響します。
- 副作用の可否や非同期処理の扱いは呼出欄ごとに確認してください。

## 関連項目

- [Declares](/reference/elements/declares/)、[Function](/reference/elements/function/)
- [Function Procedure](/reference/elements/function-procedure/)、[式・コード](/reference/expressions/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="functions" />
