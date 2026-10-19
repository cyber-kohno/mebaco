---
title: Common
description: App間で共有する宣言・Resource・StorageをまとめるProject領域。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`common`はProject内で共有する定義の領域です。Commonに置いた宣言やCapabilityは、個々のAppのローカル定義とは異なる共有スコープを持ちます。

## 配置場所と操作

Project直下に初期配置されます。Common自身に追加・削除の操作はなく、その子要素を編集します。

## 子要素

標準構造はDeclares、Resources、Storageです。DeclaresにはConstants、Styles、Types、Functions、Componentsなどの定義コンテナを持ちます。

## 設定項目

Common自体の編集可能な値はありません。各子要素の定義でId、型、権限などを設定します。

## 参照とスコープ

Commonの宣言はProject内の複数Appから参照できます。App側でResourceやStorageを使うにはImportが別途必要です。Commonに定義しただけで全AppのAPIへ自動注入されるとは限りません。

## 実行時の動作

Commonは単体実行されません。App RuntimeやBundleが必要な定義を解決します。Bundle ModuleにはCommonの宣言が含まれますが、Resourcesコンテナ全体ではなく、Appから参照されるResourceがPackage対象として解析されます。

## 最小例

複数Appから使うColor型や共通ComponentをCommonのDeclaresに定義し、ResourceやStorageを必要なAppでImportします。

## 制約と注意点

- App固有の型・変数・定義とCommonスコープを混同しないでください。
- ResourceとStorageは定義と利用Importが別手順です。
- Commonの変更は、その定義を参照する複数AppやBundleに影響し得ます。

## 関連項目

- [Project](/reference/elements/project/)、[Resources](/reference/elements/resources/)、[Storage](/reference/elements/storage/)
- [型システム](/reference/types/)、[Bundle](/reference/elements/bundle/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="common" />
