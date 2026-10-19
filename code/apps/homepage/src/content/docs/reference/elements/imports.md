---
title: Import
description: Appが利用する他App・Resource・StorageのImport設定をまとめる要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`imports`はAppの外部依存定義をまとめます。起動・画面遷移先App、Resource、StorageのImportを配下に保持します。

## 配置場所と操作

各App直下に初期配置されます。Import自身には追加・削除メニューはなく、各Import種別の子要素を編集します。

## 子要素

Transitions、Resource Imports、Storage Importsを初期配置します。

## 設定項目

Import自体には設定値がありません。対象AppはTransitions、ResourceとStorageの対象はそれぞれのImport要素で選びます。

## 参照とスコープ

ImportはAppごとの依存関係です。Resource／Storage定義がCommonにあっても、AppがImportしなければそのAppのコードから利用できません。

## 実行時の動作

Import Manager自体はRuntime APIではありません。Runtimeは各Importから構成されたAppの遷移先、Resource API、Storage APIを使います。Bundle解析も依存Importを参照します。

## 最小例

AppのResource Importsから既存Resourceを選び、Storage ImportsからKey Valueを選択します。別Appへ遷移する場合はTransitionsも設定します。

## 制約と注意点

- 定義とImportは別作業です。
- 削除・改名された定義へのImportは無効参照になります。
- Transition Import、Resource Import、Storage Importは異なる種類の依存で、互換ではありません。

## 関連項目

- [Transitions](/reference/elements/transitions/)、[Resource Imports](/reference/elements/resource-imports/)、[Storage Imports](/reference/elements/storage-imports/)
- [App](/reference/elements/app/)、[ResourceとStorage](/guides/resources-storage/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="imports" />
