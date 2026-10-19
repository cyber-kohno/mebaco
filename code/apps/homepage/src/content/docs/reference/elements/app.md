---
title: App
description: 実行単位となるAppの作成、Id、初期構造、EntryとStateの関係。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

App（kind: `app`）は、Project内で実行するアプリの単位です。起動設定、使用する機能のImport、State、宣言、最初に表示するComponentの参照をまとめます。画面の内容はAppへ直接置かず、Componentに作ります。

## 配置場所と操作

`Project / Apps` に置きます。Appsを右クリックして `Add app`、既存Appを変更するときはAppを右クリックして `Modify` を選びます。

新規作成後にMain Componentの自動生成を選ぶと、`Declares / Components` にMainが作られ、Entryの参照先も設定されます。「いいえ」を選んだ場合は、Componentの作成とEntryの設定を自分で行います。

## 子要素

| 初期作成される子 | 用途 |
| --- | --- |
| Launch Options | 起動引数などの設定 |
| Imports | Transition、Resource、Storageの利用設定 |
| Store / States・Effects | AppのStateとEffect |
| Declares / Constants・Styles・Types・Functions・Components | 定数、見た目、型、関数、画面部品の定義 |
| Entry | 最初に表示するComponentの参照とProps |

## 設定項目

| 表示名 | 既定値・必須 | 制約 |
| --- | --- | --- |
| Id | 必須、初期入力は空 | 1〜32文字。同じApps内で重複不可。小文字で始まる英数字の区切りをハイフンで連結する |

有効な例は `counter`、`task-list`、`app2`。`Counter`、`task_list`、`task-2`、`task--list` は使えません。ハイフン後の区切りも英小文字で始めます。

表示・入力用のIdとは別に内部の `appId` が生成されます。通常のId変更では内部識別子は維持されます。

## 参照とスコープ

AppのStateは `Store / States` に置きます。EntryのPropsを解決するときはApp側の値を使い、Entryが参照するComponentの中では、そのComponentのStateも重ねて扱います。

Entryの候補は同じApp内の通常のComponentです。Commonに置いたComponentやローカルComponentを、Entryから直接選ぶことはできません。

## 実行時の動作

Appを選び、`T` でCommand Consoleを開いて `run` を実行します。App配下の要素を選んでいる場合も、その所属Appが対象になります。ProjectやAppsだけを選んだ状態ではApp用のrunは出ません。

実行時はEntryの参照先、起動設定、Propsなどを解決して画面を表示します。Entryが未設定、または参照先が見つからない場合は、実行の入口が成立しません。起動引数を定義したAppでは、run時に引数の入力が必要になることがあります。

## 最小例

```text
Apps
└─ App: counter
   ├─ Declares / Components / Main
   │  └─ Elements / Tag: p / Text: Hello
   └─ Entry → Main
```

Main自動生成を選び、MainのElementsにpと固定値Textを追加すれば、画面を表示する最小構成になります。全手順は[最初のProject](/start/first-project/)にあります。

## 制約と注意点

- AppのIdを変えることと、別のAppを作ることは異なります。
- Appの作成だけでは表示内容はできません。ComponentのElementsを編集してください。
- Previewで変更したStateの値は、Projectの初期値に自動保存されません。
- Projectの保存と、Bundleとして配布する操作は別です。

## 関連項目

- [Entry](/reference/elements/entry/)
- [Component](/reference/elements/component/)
- [State](/reference/elements/state/)
- [Projectの構造](/concepts/project-model/)
- [保存形式とBundle](/reference/project-files/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="app" />
