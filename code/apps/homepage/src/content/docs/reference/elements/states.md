---
title: States
description: 所属StoreのState変数をまとめる一覧。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`states`はStore内のState定義を管理するフォルダーです。StateはRuntime中に更新可能な型付き値です。

## 配置場所と操作

AppまたはComponentのStore配下にあります。Add stateからStateを作成します。

## 子要素

0個以上の`state`を持ちます。

## 設定項目

States自体には設定値はありません。各StateでId、Value Type、Initialを定義します。

## 参照とスコープ

参照可能なStateは所属App／ComponentとStateScopeから解決されます。同一Component instanceの値か、親子間でどのように引き継ぐかはComponentとRetentionの仕組みを確認してください。

## 実行時の動作

Runtimeは各StateのInitialを初期化し、更新可能な状態値として保持します。State更新は依存する表示の再評価に関係します。

## 最小例

StatesにNumber型の`count`をInitial `0`で作り、画面Textから参照します。更新処理はActionやEventに結び付けます。

## 制約と注意点

- 同じStoreおよび可視範囲のState Idは重複できません。
- Initialは指定型と一致させます。State Initial式で利用できる参照範囲は一般式と異なる場合があります。
- StateはApplication Dataへ自動保存されません。再起動後も残す値にはStorageを使います。

## 関連項目

- [Store](/reference/elements/store/)、[State](/reference/elements/state/)
- [Variable](/reference/elements/variable/)、[Action](/reference/elements/action/)、[Storage](/reference/elements/storage/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="states" />
