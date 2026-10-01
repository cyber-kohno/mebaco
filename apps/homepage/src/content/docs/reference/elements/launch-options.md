---
title: Launch Options
description: App起動時の引数定義を保持する管理要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`launch-options`はAppが起動時に受け取る引数のグループです。初期状態でLaunch Argumentsを1つ持ちます。

## 配置場所と操作

App直下に自動配置されます。Launch Options自体には設定欄・追加メニューはありません。子のArgumentsから引数を追加します。

## 子要素

子は`launch-arguments`です。ここに0個以上のLaunch Argumentを登録します。

## 設定項目

Launch Options自体には編集項目はありません。引数ごとにId、型、Null許容、任意の既定値を設定します。

## 参照とスコープ

このAppを起動するLauncherが引数定義を契約として参照します。App間Transitionなど、Appを起動する他の機能も同じ引数契約を使います。

## 実行時の動作

Launch Optionsは単体実行されません。Runtime launch処理が子の引数をEntry ComponentのValue Props契約へ変換し、起動元Bindingを評価します。

## 最小例

Appに`initialCount: Number`が必要なら、Argumentsに同名のLaunch Argumentを追加します。LauncherとTransitionの各呼出元で`initialCount`をBindingします。

## 制約と注意点

- 引数を追加・削除・改名・型変更すると、すべての起動元Bindingに影響します。
- ComponentのEntry PropsとLaunch Argumentsの両方を定義する場合は、AppのEntryへどの値を渡すかを明示的にBindingします。
- Launch Optionsの存在は、そのAppが必ずLauncherから起動できることを保証しません。呼出元の設定も必要です。

## 関連項目

- [Launch Arguments](/reference/elements/launch-arguments/)、[Launch Argument](/reference/elements/launch-argument/)
- [Launcher](/reference/elements/launcher/)、[Entry](/reference/elements/entry/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="launch-options" />
