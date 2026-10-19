---
title: Storage Imports
description: Appが利用するKey Value項目を選択するImport定義。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`storage-imports` はAppがアクセスできるProject StorageのKey Value項目を選択します。定義の存在だけでは `$storage` に露出しません。

## 配置場所と操作

App / Importの初期要素として作成されます。ModifyからKey Value項目を選びます。

## 子要素

子要素はありません。選択したStorage IDの配列を保持します。

## 設定項目

Storage欄からProject内のKey Value項目を0件以上選択します。重複IDは保存時に除去されます。

## 参照とスコープ

Import済み項目だけがAppの `$storage.keyValue.<id>` Namespaceに公開されます。永続データの保存スコープはImportではなくRuntimeのdevelopment/package scopeで決まります。

## 実行時の動作

App起動Contextに、選択されたIDに対応するget/setラッパーが構成されます。複数Appが同じStorage IDをImportすると、同じStorage scopeを使う限り同じ永続項目を共有します。

## 最小例

Key Value `preferences` をStorage Importsへ追加し、式・Actionで `await $storage.keyValue.preferences.get()` を呼びます。

## 制約と注意点

- ImportはOS権限や保存スコープを設定するものではありません。
- 未ImportのKey ValueはAppから参照できません。
- Storage ImportsはResource Importsと別々のNamespaceです。
- Import先を切り替えた際に残るProject全体の保存データは、自動で削除されません。

## 関連項目

- [Storage](/reference/elements/storage/)
- [Key Value](/reference/elements/key-value/)
- [Resource Imports](/reference/elements/resource-imports/)
- [App](/reference/elements/app/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="storage-imports" />
