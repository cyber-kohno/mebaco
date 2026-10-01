---
title: Key Value
description: 型とInitialを持つ永続データ項目。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`key-value` はStorageに登録する永続項目です。Stateと似た型定義を使いますが、通常のStateのようにアプリ起動ごとに初期化されるのではなく、明示的なget/setで保存・読込します。

## 配置場所と操作

Project / StorageでAdd key valueから作成します。ModifyでID、Value Type、Initial等を編集し、削除時は構造参照があれば削除を阻止し、式参照があれば確認します。

## 子要素

子要素はありません。項目定義はKey Value自身が保持します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | `$storage.keyValue.<id>` に使う識別子（1〜32文字） |
| Value Type | 保存値の型。Signatureは選択不可 |
| Initial | リテラル、または型の既定値 |
| Nullable | Value Typeで設定するnull許容 |

Initialは式ではなく固定値または既定値です。選択可能な型は永続化可能な構造に制限されます。

## 参照とスコープ

AppのStorage Importsへ登録すると、`$storage.keyValue.<id>.get()` と `.set(value)` を使えます。Storage項目の内部Storage IDが保存キーであり、ユーザー向けIdの変更と既存値の移行は別の問題として扱います。

## 実行時の動作

get時に保存値が存在すればその値を返します。存在しない場合はInitialを型に合わせて作り、保存して返します。setは渡された値をJSON化・保存し、JSON非互換値や非有限数値はエラーにします。

## 最小例

```ts
const count = await $storage.keyValue.launchCount.get()
await $storage.keyValue.launchCount.set(count + 1)
```

## 制約と注意点

- get/setはいずれも非同期です。
- `undefined`、BigInt、Function、Symbol、循環参照、NaN/Infinity等を永続値にしないでください。
- Signature型は保存できません。Object、Array、Unionは構成要素も永続化可能である必要があります。
- set後の値はStateとして購読されず、必要なら再度getするか、アプリ内Stateと明示的に同期します。
- Initialは保存値が初めて作られるときだけ適用されます。後からInitialを変えても既存値は上書きされません。
- 内部Storage IDを維持したまま型やInitialを変えると既存データとの不整合を起こす可能性があります。移行は別途行ってください。

## 関連項目

- [Storage](/reference/elements/storage/)
- [Storage Imports](/reference/elements/storage-imports/)
- [State](/reference/elements/state/)
- [Object Type](/reference/elements/object-type/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="key-value" />
