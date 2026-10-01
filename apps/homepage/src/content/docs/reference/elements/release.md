---
title: Release
description: Project内の配布定義をまとめるマネージャー要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`release` はProjectの配布定義の入口です。配下のBundlesから、Clientへ渡すApplication Packageの構成を管理します。

## 配置場所と操作

Project直下に自動作成されます。Release自身には設定画面や追加操作はなく、配下のBundlesを編集します。

## 子要素

初期状態で`bundles`を1つ持ちます。個別BundleはBundles配下に追加します。

## 設定項目

Release自体の編集可能な設定値はありません。Bundle Idや対象LauncherはBundleで設定します。

## 参照とスコープ

配下のBundleは同一ProjectのLauncher、App、Component、Resource、Storageを参照します。Bundleの範囲はBundleで選択したLauncherから依存関係に沿って計算されます。

## 実行時の動作

Release ManagerはRuntime実行時の動作を持ちません。Terminalの`build <bundle-id>`がBundleを検証してRevisionを記録し、`release <bundle-id>`が検証済み内容を`.mbcapp`として書き出します。

## 最小例

Project直下のRelease > BundlesにBundleを追加し、対象Launcherを選びます。その後Terminalで`build desktop`、Projectを保存し、`release desktop`を実行します。

## 制約と注意点

- Project作成時に用意されるマネージャーです。Releaseの追加・削除ではなくBundleを操作します。
- Build後に対象内容が変わると、以前のRevisionはReleaseできません。再Buildしてから保存・Releaseします。
- Debug Configurationは配布ClientのBindingを設定しません。ClientのLaunch SetupでResource Pathを設定します。

## 関連項目

- [Bundles](/reference/elements/bundles/)、[Bundle](/reference/elements/bundle/)
- [アプリを配布する](/guides/distribute/)、[保存形式とBundle](/reference/project-files/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="release" />
