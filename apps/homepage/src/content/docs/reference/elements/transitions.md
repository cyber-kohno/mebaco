---
title: Transitions
description: Appから遷移できる別Appを宣言するImport一覧。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`transitions`は所属Appから遷移可能な別AppをImportする設定です。Transition Elementを作る前に遷移先を宣言します。

## 配置場所と操作

App > Importの下に初期配置されます。Modifyから候補Appを選択します。候補には現在のApp自身を除くProject内のAppが表示されます。

## 子要素

子Elementはありません。選択されたApp IDの配列を保持します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Apps | 所属Appから遷移可能にする別Appの一覧 |

## 参照とスコープ

Transitionsは所有Appの依存関係です。配下に置くTransition ElementはImport済みAppだけを選択でき、遷移先のLaunch ArgumentsがBinding契約になります。

## 実行時の動作

Runtime Transition Executorは対象AppがImport済みか検証し、引数Bindingを解決してRuntimeへ遷移要求を出します。未Import、欠落App、Binding不整合はRuntime Errorになります。

## 最小例

`Home` AppのTransitionsで`Settings`を選びます。Homeの画面内にTransition Elementを追加し、Settingsを選択して必要なLaunch ArgumentsをBindingします。

## 制約と注意点

- Transitionsへの登録だけでは画面遷移は起きません。表示要素やActionなどからTransition Elementを実行します。
- Transition Elementが参照するAppはImport済みである必要があります。
- Bundleには遷移先Appも依存として含まれるため、到達可能なApp群が想定どおりかBuild時に確認してください。

## 関連項目

- [Import](/reference/elements/imports/)、[Transition](/reference/elements/transition/)
- [Launch Argument](/reference/elements/launch-argument/)、[Bundle](/reference/elements/bundle/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="transitions" />
