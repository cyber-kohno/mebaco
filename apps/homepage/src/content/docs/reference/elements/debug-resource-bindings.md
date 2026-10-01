---
title: Resource Bindings
description: Debug ConfigurationのResource IDとPC上の絶対パスの対応。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`debug-resource-bindings` はProject Resourceごとに開発環境のPathを割り当てます。Resource定義とOS上の対象を結ぶ設定です。

## 配置場所と操作

各Debug Configurationに初期作成されます。ModifyからResourceごとのBinding Pathを設定します。Resource追加・削除時はBinding一覧が同期されます。

## 子要素

子要素はありません。Bindings配列を要素自身が保持します。

## 設定項目

Resource一覧とPathの対応を編集します。Directoryは既存Directory、TextはFile、SQLiteはFileとして使う対象です。SQLiteでは許可設定に応じて未作成Fileの作成も可能です。

## 参照とスコープ

各行はResourceの内部resourceIdで対応し、表示用Id変更後も同一Resource定義を追跡できます。Pathは開発機のローカル絶対パスです。

## 実行時の動作

ResourceRuntimeはBindingをSession登録に渡します。空Path、無効な型のパス、アクセス不能な場所ではResource操作が失敗します。

## 最小例

Directory Resource `workspace` に `C:\\Users\\me\\Documents\\demo` のような既存フォルダをBindingします。実際の区切りと場所はOS環境に合わせます。

## 制約と注意点

- 相対パスは受け付けられません。
- BindingはResource権限の拡張ではなく、定義済みAccess/Pattern制限は維持されます。
- Pathにはユーザー名や機密フォルダが含まれ得ます。Project共有前に含有・保存方法を確認してください。
- Client Packageは別途利用者環境のResource pathを設定します。

## 関連項目

- [Configuration](/reference/elements/debug-configuration/)
- [Resources](/reference/elements/resources/)
- [Resource Imports](/reference/elements/resource-imports/)
- [アプリを配布する](/guides/distribute/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="debug-resource-bindings" />
