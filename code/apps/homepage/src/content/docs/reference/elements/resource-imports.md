---
title: Resource Imports
description: Appが利用するProject Resourceを選択するImport定義。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`resource-imports` はAppが使うResourceを明示するImport要素です。Project内にResource定義があっても、AppへImportしなければRuntimeの `$resource` Namespaceから利用できません。

## 配置場所と操作

App / Import内に作成されます。ModifyからResource一覧を選びます。Import要素自体は削除・無効化する要素ではなく、選択内容を編集します。

## 子要素

子要素はありません。Resource IDの配列を要素自身が保持します。

## 設定項目

Resources欄でProject内のDirectory、Text、SQLite Resourceを0件以上選択します。保存時に空IDと重複IDは除かれます。

## 参照とスコープ

Import済みResourceはAppのRuntime Context内で `$resource.<resourceId>` として公開されます。ImportはApp単位です。Componentや他Appへ自動で共通化されるものではありません。

## 実行時の動作

App開始時にそのAppのImport IDだけからResource Namespaceが構成されます。存在しないIDは利用候補に現れず、Resource Importの再編集時は現在のProject定義から候補が取得されます。

## 最小例

ProjectのResource Idが `workspace` なら、AppのResource Importsへ `workspace` を追加し、Actionで `$resource.workspace.list()` を呼びます。

## 制約と注意点

- ImportはOSファイル権限を付与する設定ではありません。Resource側のAccessとConfigurationのパスBindingも必要です。
- Import先を切り替えたAppから、未ImportのResourceを参照しないでください。
- 同じProject Resourceを複数AppへImportできますが、利用可能範囲は各AppのImportに従います。
- Resource定義の削除やID変更は参照式へ影響する可能性があります。

## 関連項目

- [Resources](/reference/elements/resources/)
- [Storage Imports](/reference/elements/storage-imports/)
- [App](/reference/elements/app/)
- [ResourceとStorageガイド](/guides/resources-storage/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="resource-imports" />
