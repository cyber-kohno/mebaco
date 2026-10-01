---
title: Effects
description: Stateや式の依存変化に応答するEffectをまとめる一覧。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`effects`はStoreに属するEffect定義のフォルダーです。Effectは依存式の変化に応じてActionを実行する副作用の仕組みです。

## 配置場所と操作

AppまたはComponentのStore配下にあります。Add effectからEffectを追加します。

## 子要素

0個以上の`effect`を持ちます。

## 設定項目

Effects自体に設定はありません。Comment、Dependencies、Action Scriptは各Effect内で指定します。

## 参照とスコープ

Effectは所属するApp／Component RuntimeのStateや許可された式コンテキストを参照します。依存式は変更監視の対象を定めます。

## 実行時の動作

Runtime Effect RunnerはEffectを監視し、初回mount時にActionを実行し、Dependencyが変わったときにも再実行します。Action Scriptはawaitを許可する入力欄です。

## 最小例

Effectを追加し、Dependenciesへ`$state.query`を指定します。Actionで検索結果を更新する非同期処理を実行します。

## 制約と注意点

- Effectは副作用を実行するため、State更新が依存式の変更を引き起こし連続実行にならないか確認してください。
- Dependency未設定時はmount時のみの動作です。
- 非同期Actionで同一Effectが再実行された場合の競合を考慮し、古い結果を採用しない設計にしてください。

## 関連項目

- [Store](/reference/elements/store/)、[Effect](/reference/elements/effect/)
- [State](/reference/elements/state/)、[Action](/reference/elements/action/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="effects" />
