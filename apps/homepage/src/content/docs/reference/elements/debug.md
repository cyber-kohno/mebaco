---
title: Debug
description: 開発時の実行設定、起動補助、ログ設定をまとめる要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`debug` はProjectの開発・Preview補助設定をまとめます。Resource path binding、WorkspaceからのApp起動補助、Runtime log設定が含まれます。

## 配置場所と操作

Projectに自動作成されます。通常Debug Manager自身の追加・削除は行わず、配下の設定要素を編集します。

## 子要素

Debug Configurations、Launch Shortcuts、Logを保持します。ConfigurationsにはDefaultと任意のCustom Configurationが入ります。

## 設定項目

Debug自身に設定欄はありません。Resource pathはConfiguration、Workspace App起動はLaunch Shortcuts、ログ閾値や表示形式はLogで指定します。

## 参照とスコープ

DebugはProject単位です。設定対象のResource、App、Launcherは同じProjectから選択します。

## 実行時の動作

Runtime PreviewはDebug Log設定を読み、Resource実行セッションはDebug ConfigurationのBindingを使います。WorkspaceからのApp起動ショートカットは設定済みLauncherを用いてPreviewを開始します。

## 最小例

1. Debug > ConfigurationsでResourceの絶対パスを設定
2. Launch Shortcutsで起動引数を持つAppへLauncherを割当て
3. Log LevelをInfoにして実行時ログを確認

## 制約と注意点

- 現行Studio Runtimeの既定Resourceセッションは最初のDebug ConfigurationのBindingを使います。Configurationを複数作った場合の選択反映は実画面で確認してください。
- Debug設定は配布先ClientのResource Bindingそのものではありません。Client側に別のPackage設定があります。
- Debug Log Level `off` はDebug、Info、Warn、Error出力をすべて抑止します。
- Launch Shortcutは開発中Workspaceの起動補助で、配布用BundleのLauncher選択とは別設定です。

## 関連項目

- [Debug Configurations](/reference/elements/debug-configurations/)
- [Debug Configuration](/reference/elements/debug-configuration/)
- [Resource Bindings](/reference/elements/debug-resource-bindings/)
- [Launch Shortcuts](/reference/elements/debug-launch-shortcuts/)
- [Log Settings](/reference/elements/debug-log/)
- [デバッグする](/guides/debug/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="debug" />
