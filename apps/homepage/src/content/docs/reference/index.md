---
title: リファレンス
description: Mebacoの全要素、式、型、保存と配布の仕様を調べます。
---

リファレンスは正確な仕様を探すための索引です。使い方を順に学ぶ場合は[ガイド](/guides/)、概念のつながりを知る場合は[基本概念](/concepts/)を参照してください。

## 分野

- [要素一覧と仕様台帳](/reference/elements/) — StudioのElement Registryとの網羅性を追跡
- [式・コード](/reference/expressions/) — 式の構文、参照名、検証、Action/Function
- [型システム](/reference/types/) — 基本型、Object、Union、Signature
- [保存形式とBundle](/reference/project-files/) — Projectファイル、Bundle、Client
- [Project構造](/reference/elements/project/) — Apps、Launchers、Commonと起動引数
- [StyleとDebug](/reference/elements/style/)、[ReleaseとBundles](/reference/elements/release/) — 見た目の再利用、開発設定、配布

## 仕様をつなげて読む

- 型を定義する: [Object Type](/reference/elements/object-type/)、[Union Type](/reference/elements/union-type/)、[Signature Type](/reference/elements/signature-type/)。全体像は[型システム](/reference/types/)。
- 式を書く: [式とスコープの概念](/concepts/expressions-and-scope/)、[式・コード](/reference/expressions/)。
- 値の保存・受渡し: [State](/reference/elements/state/)、[Props](/reference/elements/props/)、[Retention](/reference/elements/retention/)。
- 値と処理の定義: [Store](/reference/elements/store/)、[States](/reference/elements/states/)、[State](/reference/elements/state/)、[Variable](/reference/elements/variable/)、[Constants](/reference/elements/constants/)、[Constant](/reference/elements/constant/)、[Functions](/reference/elements/functions/)、[Function](/reference/elements/function/)、[Effects](/reference/elements/effects/)、[Effect](/reference/elements/effect/)、[Transition](/reference/elements/transition/)。
- 制御・非同期処理: [Conditional（表示）](/reference/elements/conditional/)、[Conditional（Procedure）](/reference/elements/control-conditional/)、[Loop（表示）](/reference/elements/loop/)、[Switch（Procedure）](/reference/elements/control-switch/)、[Promise](/reference/elements/promise/)、[Return](/reference/elements/function-return/)。
- 外部ファイルと永続値: [Resources](/reference/elements/resources/)、[Directory Resource](/reference/elements/directory-resource/)、[Text Resource](/reference/elements/text-resource/)、[SQLite Resource](/reference/elements/sqlite-resource/)、[Resource Imports](/reference/elements/resource-imports/)、[Storage](/reference/elements/storage/)、[Key Value](/reference/elements/key-value/)、[Storage Imports](/reference/elements/storage-imports/)。
- 見た目と開発・配布: [Styles](/reference/elements/styles/)、[Style](/reference/elements/style/)、[Style Parameter](/reference/elements/style-param/)、[Debug](/reference/elements/debug/)、[Debug Configuration](/reference/elements/debug-configuration/)、[Release](/reference/elements/release/)、[Bundles](/reference/elements/bundles/)、[Bundle](/reference/elements/bundle/)。
- Projectと起動入口: [Project](/reference/elements/project/)、[Common](/reference/elements/common/)、[Apps](/reference/elements/apps/)、[Launcher](/reference/elements/launcher/)、[Launch Options](/reference/elements/launch-options/)、[Launch Argument](/reference/elements/launch-argument/)。
- Component定義と表示ツリー: [Components](/reference/elements/components/)、[Component](/reference/elements/component/)、[Elements](/reference/elements/elements/)。
- App依存関係: [Import](/reference/elements/imports/)、[Transitions](/reference/elements/transitions/)、[Transition](/reference/elements/transition/)、[Resource Imports](/reference/elements/resource-imports/)、[Storage Imports](/reference/elements/storage-imports/)。

## 個別要素のページ書式

各要素の仕様ページでは、概要、配置場所、許可される子要素、設定項目、参照とスコープ、Runtimeでの動作、最小例、制約、関連要素、導入バージョン、根拠ソースをそろえます。

## Counterで使う基本要素

| 要素 | 調べられる内容 |
| --- | --- |
| [App](/reference/elements/app/) | 実行単位、Id、起動時の構造 |
| [Entry](/reference/elements/entry/) | 最初の画面の参照、Props、候補の制約 |
| [Component](/reference/elements/component/) | 画面部品の定義、子構造、表示インスタンス |
| [State](/reference/elements/state/) | 型、初期化順、更新と再描画、値の寿命 |
| [Tag](/reference/elements/tag/) | 対応タグ、属性、イベント、Ref・Partial |
| [Text](/reference/elements/text/) | 固定値と式、文字列型、診断表示 |

## Componentを再利用するとき

| 調べたいこと | 個別仕様 |
| --- | --- |
| 入力を定義・指定する | [Props](/reference/elements/props/) / [Value Prop](/reference/elements/value-prop/) |
| 定義を画面で使う | [Component Use](/reference/elements/component-use/) |
| 差し込みの契約と位置 | [Slots](/reference/elements/slots/) / [Slot](/reference/elements/slot/) / [Slot Use](/reference/elements/slot-use/) |
| 使用箇所に内容を作る | [Slot Contents](/reference/elements/slot-contents/) / [Slot Content](/reference/elements/slot-content/) |
| 表示に使う値を準備する | [Retention](/reference/elements/retention/) |

手順を試す場合は[Componentを再利用する](/guides/reuse-components/)へ進んでください。
