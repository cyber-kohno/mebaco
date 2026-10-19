---
title: Storage
description: Project内のKey Value宣言をまとめる永続Storage管理要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`storage` はアプリ起動をまたいで値を保持するKey Value定義の管理要素です。外部ファイルを扱うResourceとは目的が異なります。

## 配置場所と操作

ProjectのStorageにあります。Add key valueから永続項目を作成します。

## 子要素

Key Value要素を保持します。Storage自身にデータ項目の値や型を設定しません。

## 設定項目

Storage固有の設定はありません。型、初期値、Null許容、IDは各Key Valueで指定します。

## 参照とスコープ

Storage定義はProject単位ですが、AppがStorage Importsに登録したKey Valueのみ `$storage.keyValue.<id>` からアクセスできます。App間で定義を共有しつつ、永続スコープは開発Projectまたは配布Packageで分離されます。

## 実行時の動作

初回の `get()` は保存値がなければInitialを永続保存して返します。`set(value)` はJSON互換値を永続ファイルに保存します。Studioの開発実行ではProject IDを使うdevelopment scope、配布ClientではPackage scopeが使われます。

## 最小例

StorageにKey Value `preferences` を作りAppへImportします。

```ts
const preferences = await $storage.keyValue.preferences.get()
```

## 制約と注意点

- Storage APIは自動Stateではなく、明示的な非同期get/setです。値を変えてもStateのような依存追跡・再描画は自動ではありません。
- 保存値はJSON互換である必要があり、Function、Symbol、BigInt、undefined、非有限数値などは保存できません。
- Storage値はシステムのApp Local Dataに保存され、Projectファイルの一部ではありません。
- 開発用Project scopeと配布Package scopeは分離されています。開発データが配布へ自動移行する契約ではありません。
- ユーザーデータを削除・移行する場合は、OSのApplication DataやPackage IDの扱いを別途設計してください。

## 関連項目

- [Key Value](/reference/elements/key-value/)
- [Storage Imports](/reference/elements/storage-imports/)
- [Resource Imports](/reference/elements/resource-imports/)
- [ResourceとStorageガイド](/guides/resources-storage/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="storage" />
