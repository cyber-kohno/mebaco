---
title: Apps
description: Project内の実行可能なApp定義を管理するコンテナ。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`apps`はProject内のApp定義をまとめるフォルダーです。ここに作成したAppが、LauncherやApp間Transitionの参照対象になります。

## 配置場所と操作

Project直下に初期配置されます。コンテキストメニューのAdd appからAppを作成します。新規App作成後、StudioはMain Component作成を確認し、同意した場合は作成してEntryに設定します。

## 子要素

0個以上の`app`を持ちます。Appごとに画面Entry、宣言、Import、Stateなどの構造を持ちます。

## 設定項目

Apps自身に設定項目はありません。AppのIdやEntryは個々のAppで編集します。

## 参照とスコープ

AppはLauncherの起動先、他AppからのTransition先になり得ます。Common宣言は複数Appから共有できますが、App固有宣言は他Appへ自動的に公開されません。

## 実行時の動作

AppsフォルダーはRuntimeでは実行されません。PreviewまたはClientが個別Appを選択し、そのApp構造からRuntimeを構築します。

## 最小例

Add appから`Counter`を作り、Main Componentを作成してEntryに指定します。LauncherからこのAppを起動できるようにします。

## 制約と注意点

- 同じApps内でApp Idは重複できません。
- Appを参照するLauncherやTransitionがある場合、削除は参照を壊す可能性があります。
- Release Bundleには全Appが無条件に含まれるのではなく、選択Launcherから必要なAppが導出されます。

## 関連項目

- [App](/reference/elements/app/)、[Entry](/reference/elements/entry/)、[Launchers](/reference/elements/launchers/)
- [Transitionを含む要素一覧](/reference/elements/)、[Bundle](/reference/elements/bundle/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="apps" />
