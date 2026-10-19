---
title: Launchers
description: Project内のApp起動入口をまとめるコンテナ。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`launchers`はAppを起動する入口定義をまとめます。Launcherは起動対象Appと、そのAppが要求するLaunch Argumentsへの値割当を持ちます。

## 配置場所と操作

Project直下に初期配置されます。コンテキストメニューのAdd launcherから作成します。

## 子要素

0個以上の`launcher`を持ちます。Launcher定義は識別子によるApp参照で、子Elementは持ちません。

## 設定項目

Launchers自身に設定値はありません。LauncherでId、表示Name、対象App、Argumentsを設定します。

## 参照とスコープ

対象候補にはProject内のAppが表示されます。各AppのLaunch ArgumentsがLauncherのBinding候補になります。Bundleは配布対象Launcherを選択します。

## 実行時の動作

LauncherからApp Runtimeが開始され、Bindingされた値がAppの起動引数として渡されます。Preview ShortcutとClient Setupは、Launcherを選ぶ点で共通しますが、異なる設定経路です。

## 最小例

`main`というLauncherを追加し、Counter Appを選択します。Appに引数がなければ空Bindingのまま利用できます。

## 制約と注意点

- Launcherは対象Appを指定する必要があります。
- Bundleに使うLauncherを削除・改名する場合、Bundle側の選択を確認してください。
- Launch Arguments追加後は、LauncherとTransitionなど全呼出元でBindingを確認します。

## 関連項目

- [Launcher](/reference/elements/launcher/)、[App](/reference/elements/app/)
- [Launch Options](/reference/elements/launch-options/)、[Bundle](/reference/elements/bundle/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="launchers" />
