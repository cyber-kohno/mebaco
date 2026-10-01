---
title: デバッグする
description: Debug設定、Resource Binding、ログを使って動作を調べます。
---

DebugはProject内のPreviewやWorkspace起動を助けます。Resourceの開発パス、起動引数を持つAppのショートカット、Runtimeログを順番に設定します。Debug設定は配布先Clientには引き継がれません。

## Resourceの開発パスを設定する

1. ProjectのDebug > Configurationsを開きます。Default ConfigurationはProject作成時に用意され、Configuration自体の名称や削除はできません。
2. Resource Bindingsで対象Resourceの実行時パスを設定します。SQLiteならSQLiteファイル、Directoryならルートディレクトリ、Textなら対象ファイルを指定します。
3. Resourceを使うAppをPreviewし、読み書き権限とパスの両方が合っていることを確認します。

現在のStudio Runtimeの既定Preview経路は、Debug Configurationsの先頭にあるBindingを使います。複数Configurationを追加しても、選択中のものがPreviewに使われるとは限りません。利用前に順序と実機の挙動を確認してください。

## WorkspaceからAppを起動する

AppにLaunch Argumentsがある場合、Debug > Launch ShortcutsでAppと対応するLauncherを割り当てます。WorkspaceのショートカットからPreviewを開始するとき、Launcherの引数Bindingが使われます。ショートカットは配布BundleのLauncher選択やClientの起動設定とは別のものです。

設定候補にLauncherが出ない、または起動時にエラーになる場合は、Launcherの対象Appと引数Bindingを確認します。

## Runtimeログを確認する

Debug > LogでLevelを設定し、Preview中に式からログを出します。

```ts
$log.debug('debug detail')
$log.info('loaded')
$log.warn('unexpected value')
$log.error('operation failed')
```

Levelは最低表示レベルです。WarnならWarnとError、Offならすべてのレベルを抑止します。ログ項目にはレベル・日時・Node IDが含まれるため、該当するElementを探して式や入力値を調べます。

## Clientとは別設定

Debug Resource BindingはStudioでの開発用です。配布後はClientにPackageをインストールし、Launch SetupでLauncherを選び、Resourceのパスを設定します。配布手順は[アプリを配布する](/guides/distribute/)を参照してください。

## 関連リファレンス

- [Debug](/reference/elements/debug/)、[Debug Configurations](/reference/elements/debug-configurations/)、[Debug Configuration](/reference/elements/debug-configuration/)
- [Resource Bindings](/reference/elements/debug-resource-bindings/)、[Launch Shortcuts](/reference/elements/debug-launch-shortcuts/)、[Log Settings](/reference/elements/debug-log/)
