---
title: Configurations
description: Resource BindingをまとめるDebug Configuration一覧。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`debug-configurations` はDefaultと追加のDebug Configurationをまとめます。ConfigurationごとにResourceの実パスBindingを保持します。

## 配置場所と操作

Project / Debugに初期作成されます。Add configurationから名前付きCustom Configurationを追加します。

## 子要素

Default Configurationを1つ初期保持し、任意のCustom Configurationを追加できます。各ConfigurationにはResource Bindingsがあります。

## 設定項目

Configurations自身に設定欄はありません。Custom ConfigurationのNameは個別要素で編集します。

## 参照とスコープ

ConfigurationはProjectのResource定義をResource IDで参照します。Bindingの対象はDirectory、Text、SQLite Resourceです。

## 実行時の動作

ResourceRuntimeは初期Configuration構造とBindingを読み、Resource Sessionへパスを渡します。現行の既定経路では最初に並んだConfigurationのBindingが使われます。

## 最小例

用途ごとに `Default` と `Sample data` を作り、それぞれのResource Bindingに異なる絶対パスを設定します。実行時に想定した方が選ばれるかは画面で検証します。

## 制約と注意点

- Configurationの切替UIがあっても、現行ResourceRuntimeへ選択中構成が渡るかはソース上で確認できません。最初の要素が利用される前提で確認してください。
- Projectを別PCへ移すと絶対パスは一致しないことがあります。
- Debug Bindingは配布Client側のPackage Bindingと別の保存領域・操作です。

## 関連項目

- [Debug](/reference/elements/debug/)
- [Debug Configuration](/reference/elements/debug-configuration/)
- [Resource Bindings](/reference/elements/debug-resource-bindings/)
- [Resources](/reference/elements/resources/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="debug-configurations" />
