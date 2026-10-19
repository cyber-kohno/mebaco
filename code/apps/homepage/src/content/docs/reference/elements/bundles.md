---
title: Bundles
description: Projectで配布Bundleを複数管理するコンテナ。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`bundles`は配布用Bundle定義のコンテナです。用途や対象Launcherの異なるBundleを同じProjectで管理できます。

## 配置場所と操作

Release配下に自動作成されます。コンテキストメニューのAdd bundleから新しいBundleを作成します。

## 子要素

0個以上の`bundle`を持ちます。Bundleは兄弟間で並べ替えできます。

## 設定項目

Bundles自体に設定値はありません。各Bundleが一意のId、対象Launcher、Build Revisionを持ちます。

## 参照とスコープ

Bundleの候補LauncherはProject内から選びます。各Bundleの対象AppやResourceは選んだLauncherの依存関係から導出され、手作業で個別App一覧を指定するものではありません。

## 実行時の動作

BundlesはRuntimeには含まれません。Build／Release Terminal Commandがこのコンテナ内のBundle Idを検索して処理します。

## 最小例

Add bundleから`desktop`を作り、デスクトップ版Launcherを割り当てます。別構成が必要なら、もう1つBundleを作って別のLauncher集合を指定します。

## 制約と注意点

- Bundle Idは同じBundles内で重複できません。
- Bundleには1つ以上のLauncherが必要です。
- 選択Launcherの依存先に欠落参照や不正な設定があるとBuildに失敗します。

## 関連項目

- [Release](/reference/elements/release/)、[Bundle](/reference/elements/bundle/)
- [アプリを配布する](/guides/distribute/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="bundles" />
