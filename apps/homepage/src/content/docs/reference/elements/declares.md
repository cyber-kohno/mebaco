---
title: Declares
description: Projectの共通領域やAppで宣言要素をまとめるコンテナ。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`declares`は定数、型、Function、Component、Styleなどの宣言をまとめるコンテナです。ProjectのCommonと各App、Componentのローカル宣言領域に配置されます。

## 配置場所と操作

CommonとAppでは標準ツリーとして初期配置されます。Componentには別のローカル宣言領域がある場合があります。Declares自体には追加・削除メニューはありません。

## 子要素

標準の子はConstants、Styles、Types、Functions、Componentsです。利用できる範囲は配置先とElement Registryの親子制約に従います。

## 設定項目

Declares自体に設定値はありません。各宣言コンテナから定義を作成します。

## 参照とスコープ

Commonの宣言は共有候補、Appの宣言はそのAppに関連した候補です。Componentなどのローカル宣言はさらに狭いスコープを持つ場合があります。名前解決は配置先に依存します。

## 実行時の動作

Declaresは実行単位ではなく、Runtimeが式・型・画面構成を解決するための定義領域です。

## 最小例

Common > Declares > Typesに複数Appで使うObject Typeを作成し、App側のValue Typeから参照します。

## 制約と注意点

- Project全体で全宣言が同一スコープになるわけではありません。
- Declaresの階層は固定の管理構造であり、必要な宣言コンテナを任意に移動・追加する場所ではありません。
- 同名衝突や循環依存などの制約は各宣言Elementの仕様を参照してください。

## 関連項目

- [Common](/reference/elements/common/)、[App](/reference/elements/app/)
- [Constants](/reference/elements/constants/)、[Types](/reference/elements/types/)、[Functions](/reference/elements/functions/)、[Components](/reference/elements/components/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="declares" />
