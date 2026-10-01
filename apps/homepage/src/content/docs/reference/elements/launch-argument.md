---
title: Launch Argument
description: App起動時に受け取り、型と既定値を持つ入力値。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`launch-argument`はAppが起動時に受け取る名前付き値です。引数はAppの呼出契約であり、Component PropsやApp Stateそのものではありません。

## 配置場所と操作

App > Launch Options > Argumentsから追加・編集・削除します。Value Typeを指定して、必要な場合は既定値を有効にします。

## 子要素

子要素はありません。型式、Null許容、既定値をElement自身に保持します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 1〜32文字のJavaScript Identifier。同じ一覧で一意 |
| Value Type | Primitive、Object、Unionなどの型式。配列・Null許容を含む |
| Default Value | 任意。固定Literalまたは型既定値。式ではない |

## 参照とスコープ

LauncherおよびApp間TransitionのBinding候補に変換されます。Launcher側で引数値を供給し、Entry Component側に同名・互換型のPropsがある場合は、そのEntry Bindingで受け渡しを定義します。

## 実行時の動作

Runtime launchは各引数をValue Prop契約に変換します。引数に明示的な既定値がなければ、Nullableの場合はNullの既定値、非Nullableの場合は必須値として扱われます。

## 最小例

`userId`をString・非Nullableで定義し、LauncherのArgumentsから`"guest"`を割り当てます。App EntryのPropsへ値を渡す場合はEntryのBindingも設定します。

## 制約と注意点

- Default Valueは式ではなく、Literalまたは型の既定値です。
- Idの変更は各LauncherやTransitionでの参照名に影響します。
- 型を変更すると呼出元Bindingが無効になることがあります。診断を解消してからPreview／Buildしてください。
- Launch Argumentを追加しただけではEntry ComponentのPropsへ自動的に転送されるわけではありません。

## 関連項目

- [Launch Options](/reference/elements/launch-options/)、[Launch Arguments](/reference/elements/launch-arguments/)
- [Launcher](/reference/elements/launcher/)、[Entry](/reference/elements/entry/)、[型システム](/reference/types/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="launch-argument" />
