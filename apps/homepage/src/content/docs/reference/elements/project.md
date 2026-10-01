---
title: Project
description: Mebacoのアプリ、共通定義、開発設定、配布設定をまとめるルート。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`project`はMebacoで編集・保存する構成のルートです。複数のAppと、共有定義、Launcher、Debug、Releaseの各領域を持ちます。

## 配置場所と操作

Workspaceのツリー最上位です。新規ProjectではStudioが標準の子要素を初期生成します。Project自体にElement編集メニューはありません。

## 子要素

標準構造は`Apps`、`Launchers`、`Release`、`Common`、`Debug`です。これらは通常の画面Elementのように任意追加・削除する領域ではありません。

## 設定項目

Projectモデルには内部の`projectId`があります。通常のユーザー設定欄ではありません。ファイル名や保存場所はProjectの保存操作で扱います。

## 参照とスコープ

Commonの宣言は共有スコープ、App内の宣言はそのAppに属するスコープです。LauncherやBundleはProject内のAppを参照します。Appから別Appへの画面遷移はTransition Importに基づきます。

## 実行時の動作

Projectルート自体は画面として実行されません。PreviewやClient RuntimeはProjectから対象AppのRuntime構成を組み立てます。保存形式、復元、互換性は[Projectファイル仕様](/reference/project-files/)を参照してください。

## 最小例

1. Projectを新規作成する。
2. AppsからAppを追加し、Entry Componentを用意する。
3. Launchersから起動対象AppのLauncherを作る。
4. Previewで動作を確かめ、Projectを保存する。

## 制約と注意点

- 一部のProject領域は初期生成・管理されるため、任意Elementのように移動・削除するものではありません。
- Project保存とBundle Releaseは別操作です。Projectファイルを渡してもClient用`.mbcapp`にはなりません。
- Project内のResource定義だけでは実行時の外部パスは決まりません。DebugまたはClient側のBindingが必要です。

## 関連項目

- [基本概念](/concepts/project-model/)、[Apps](/reference/elements/apps/)、[Common](/reference/elements/common/)
- [Projectファイル仕様](/reference/project-files/)、[最初のProject](/start/first-project/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="project" />
