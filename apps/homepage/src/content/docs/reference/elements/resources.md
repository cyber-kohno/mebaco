---
title: Resources
description: アプリが外部ファイルやディレクトリを権限付きで利用するProject宣言。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`resources` はProjectで利用可能な外部Resourceの定義をまとめる管理要素です。Resourceはアプリ外のファイルやディレクトリを扱い、アプリ内の永続Key Value Storageとは別の仕組みです。

## 配置場所と操作

ProjectのResourcesに配置されます。右クリックメニューからDirectory、Text File、SQLite Resourceを作成します。ResourceのIdは兄弟Resource間で重複できません。

## 子要素

Directory Resource、Text Resource、SQLite Resourceを保持します。各Resourceは実際のパスそのものではなくResource定義と固有IDを持ち、実行時Configuration等でパスに結び付けます。

## 設定項目

Resources自身に設定項目はありません。アクセス権限、名前、種類固有の設定は各Resourceに設定します。

## 参照とスコープ

定義はProjectに属します。各AppはImportから利用するResourceを明示的に選びます。実行式ではImport済みResourceが `$resource.<id>` として利用可能です。

## 実行時の動作

RuntimeはResource定義と選択Configurationのパスをセッションに登録し、ファイル操作をネイティブ側へ委譲します。AppのResource Importに含まれないResourceは、そのAppの `$resource` Namespaceに公開されません。

## 最小例

ProjectにDirectory Resource `workspace` を定義し、AppのResource Importsへ追加します。Actionでは `$resource.workspace.list()` でルート内を列挙できます。

## 制約と注意点

- Resource定義を作っただけでは対象パスは決まりません。ConfigurationのBindingが必要です。
- 現行Studio RuntimeはResource Bindingを最初のDebug Configurationから取得します。複数構成で期待する環境が使われるかは、初版前に実画面で確認してください。
- Read/Read-Writeや削除等の権限は必要最小限に設定してください。
- パスはOS固有で、別のPCや配布先では同じとは限りません。利用者環境ごとにBindingを行います。
- Resource操作は非同期APIです。失敗時の処理をAction等に用意してください。
- Storageのように自動的に初期値を保存・復元する仕組みではありません。

## 関連項目

- [Directory Resource](/reference/elements/directory-resource/)
- [Text Resource](/reference/elements/text-resource/)
- [SQLite Resource](/reference/elements/sqlite-resource/)
- [Resource Imports](/reference/elements/resource-imports/)
- [ResourceとStorageガイド](/guides/resources-storage/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="resources" />
