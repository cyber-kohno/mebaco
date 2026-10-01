---
title: Launcher
description: 起動するAppとLaunch Argumentsへの値Bindingを定義する入口。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`launcher`は、どのAppを起動し、AppのLaunch Argumentsへどの値を渡すかを定義します。Workspace Preview、Clientの起動設定、Bundleの対象選択で利用されます。

## 配置場所と操作

Project > Launchersから作成・編集・削除します。Modify画面でId、任意のName、App、Argumentsを設定します。

## 子要素

子Elementはありません。Appと引数は識別子およびBindingデータで参照します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 同じLaunchers内で一意な1〜32文字のIdentifier |
| Name | 任意の表示名。最大64文字 |
| App | Project内の起動対象App |
| Arguments | 対象Appが定義するLaunch ArgumentへのBinding |

## 参照とスコープ

App候補の引数契約は、そのAppのLaunch Argumentsから作られます。Launcher Bindingの値はComponent Referenceと同じBinding検証経路を利用します。

## 実行時の動作

起動時にBindingが評価され、AppのEntryへ初期引数として渡されます。Workspace Debug ShortcutとClient Launch SetupはLauncherを参照します。Bundleは選択LauncherからApp依存を解析します。

## 最小例

`main` Launcherで`Counter` Appを選択します。Appに`initialCount: Number`引数がある場合、その引数に数値式または許可される値を割り当てます。

## 制約と注意点

- Appは必須です。未設定のLauncherをBundleに含めるとBuildでエラーになります。
- Appを変更するとArguments Binding候補が変わり、既存Bindingがリセットまたは再検証されます。
- 参照されているLauncherの削除は構造参照ポリシーによりブロックされる場合があります。
- Appの引数定義を変更したらLauncherだけでなくTransition等の他の呼出元も確認してください。

## 関連項目

- [Launchers](/reference/elements/launchers/)、[App](/reference/elements/app/)
- [Launch Argument](/reference/elements/launch-argument/)、[Debug Launch Shortcuts](/reference/elements/debug-launch-shortcuts/)
- [Bundle](/reference/elements/bundle/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="launcher" />
