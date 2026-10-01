---
title: Launch Arguments
description: Appが起動時に受け取る引数定義の一覧。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`launch-arguments`はAppの起動引数をまとめるフォルダーです。LauncherやApp間Transitionが渡す値の契約になります。

## 配置場所と操作

App > Launch Optionsの下にあります。コンテキストメニューのAdd argumentからLaunch Argumentを作成します。

## 子要素

0個以上の`launch-argument`を持ち、兄弟要素の並べ替えができます。

## 設定項目

Launch Arguments自身に設定欄はありません。各引数のId、Value Type、Default Valueは子要素で定義します。

## 参照とスコープ

Launcherは対象AppのArgumentsを取得してBinding候補にします。Transitionで別Appへ移動するときも、遷移先Appの契約がBinding対象です。

## 実行時の動作

Runtime launchはこの一覧を読み、個別引数をValue Prop形式に変換します。起動時に各呼出元のBinding値をEntry側へ渡します。

## 最小例

`userId: String`と`initialCount: Number`を追加し、Launcherからそれぞれに値を割り当てます。

## 制約と注意点

- 同じLaunch Arguments内でIdを重複させないでください。
- 引数定義の変更はLauncher、Transitionその他App起動元のBinding再確認が必要です。
- 既定値の有無・Null許容によって、Bindingが必須となる条件が変わります。

## 関連項目

- [Launch Options](/reference/elements/launch-options/)、[Launch Argument](/reference/elements/launch-argument/)
- [Launcher](/reference/elements/launcher/)、[Transitionを含む要素一覧](/reference/elements/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="launch-arguments" />
