---
title: Launch Shortcuts
description: WorkspaceからAppをPreview起動するためのLauncher割当て。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`debug-launch-shortcuts` は、開発WorkspaceからAppを起動するときに使うLauncherをAppごとに割り当てます。

## 配置場所と操作

Debugに初期作成されます。ModifyでAppとLauncherの組合せを選択します。Debug Shortcutで起動するAppはWorkspaceから実行できます。

## 子要素

子要素はありません。App IDとLauncher IDのBinding一覧を保持します。

## 設定項目

Launch Argumentsを持つAppごとに、そのAppに属するLauncherを選びます。Launch ArgumentsのないAppはShortcut Bindingを必要としません。

## 参照とスコープ

BindingはApp IDとLauncher IDでProject内の定義を参照します。AppやLauncherの削除・変更に合わせて同期・正規化されます。

## 実行時の動作

WorkspaceからApp Shortcutを呼ぶと、設定されたLauncherでPreviewを開始します。起動引数を持つAppに有効な割当てがない場合、警告して起動を中止します。

## 最小例

AppにLaunch Argumentがある場合、そのApp用に作成したLauncherをLaunch Shortcutsで選びます。WorkspaceのApp起動操作からPreviewを開けます。

## 制約と注意点

- Launcherは対応するAppに属している必要があります。
- Shortcutは開発時のWorkspace起動用です。配布Packageに含めるLauncherはBundle側で別に選びます。
- Shortcutの割当てがLaunch ArgumentのBinding値を作成するものではありません。値はLauncher側の設定を使います。

## 関連項目

- [Debug](/reference/elements/debug/)
- [Bundle](/reference/elements/bundle/)
- [Launcher](/reference/elements/app/)
- [デバッグする](/guides/debug/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="debug-launch-shortcuts" />
