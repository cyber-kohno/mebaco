---
title: Configuration
description: Resource path bindingを保持する開発用の設定単位。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`debug-configuration` は一組の開発用Resource Bindingを持つ設定です。Defaultは初期から存在し、Customにはユーザー指定のNameがあります。

## 配置場所と操作

Debug Configurationsの子要素です。Add configurationでCustomを作成し、CustomはModify/Deleteできます。Default自身は通常編集・削除できませんが、配下のResource Bindingsは編集できます。

## 子要素

ConfigurationはResource Bindings要素を持ちます。

## 設定項目

Custom Nameは必須で1〜64文字、同じConfigurations内で重複できません。Defaultは名前欄を持ちません。

## 参照とスコープ

Resource BindingsはResource IDを使ってProject内のResource定義と対応します。各Binding値は開発環境の絶対パスです。

## 実行時の動作

選ばれたBinding値はResource Session登録時に使われます。現行Previewの既定経路は最初のConfigurationからBindingを取得します。

## 最小例

Custom Configuration `Local sample` を作り、Directory Resource `workspace` に開発データ用フォルダの絶対パスを設定します。

## 制約と注意点

- Resource未設定・相対パス・不正な対象種別は、実際のResourceアクセス時にエラーになります。
- Configuration名はOSパスではなく説明用ラベルです。
- 現行コードの既定Previewでは複数Configurationの選択挙動を前提にしないでください。

## 関連項目

- [Configurations](/reference/elements/debug-configurations/)
- [Resource Bindings](/reference/elements/debug-resource-bindings/)
- [Directory Resource](/reference/elements/directory-resource/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="debug-configuration" />
