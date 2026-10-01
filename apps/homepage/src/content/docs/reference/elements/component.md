---
title: Component
description: 画面部品の定義、Props・Store・Retention・Elements、Root Partialとインスタンスの仕様。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Component（kind: `component`）は、画面部品の定義です。入力として受け取るProps、実行中のState、描画時の処理、表示するElementsをまとめます。定義を作るだけでは表示されず、EntryやComponentの使用要素から参照します。

## 配置場所と操作

`App / Declares / Components` または `Common / Declares / Components` に定義します。Componentsを右クリックして `Add component`、定義を変更するときはComponentを右クリックして `Modify` を選びます。

通常のComponentの定義と、画面に置く `component-use`（`Add view → Component`）は異なる要素です。このページは定義側を扱います。

## 子要素

| 子要素 | 初期状態 | 役割 |
| --- | --- | --- |
| Props | 自動作成、空 | 呼出側から受け取るValue Prop |
| Store / States・Effects | 自動作成、空 | ComponentのStateとEffect |
| Retention | 自動作成、空 | 描画に使う処理・値を準備する |
| Elements | 自動作成、空 | Tag、Text、Component使用、制御要素などの表示内容 |
| Slots | 初期状態ではなし | 差し込み領域の定義。`Use slots` で追加する |

Slotsを追加した後は `Remove slots` で取り除く操作もあります。差し込みを利用している箇所は、変更前に確認してください。

## 設定項目

| 表示名 | 既定値・必須 | 制約・用途 |
| --- | --- | --- |
| Id | 必須、初期入力は空 | 1〜32文字。先頭は英大文字、以後は英字・数字。同じComponents内で重複不可 |
| Root Partial | 未設定 | Component全体の再評価対象に付けるキー。固定の文字列または文字列を返す式 |

Idの例は `Main`、`TaskCard`、`Panel2`。`main`、`Task-Card`、`Task_Card` は使えません。通常のId変更では内部の `componentId` が維持されます。

## 参照とスコープ

ComponentのPropsは `$props`、Stateは `$state` から参照します。呼出側のStateに対してComponent自身のStateの層が作られ、ローカル値を読み書きできます。親から見えるStateを参照・更新する場合もあります。

描画中のRetentionと表示用の式ではStateの更新は許可されません。クリックなどのイベントActionで変更します。親と子に同じState名を意図的に重ねる設計は避け、Stateの命名制約も確認してください。

## 実行時の動作

EntryまたはComponent使用要素から参照されると、PropsとローカルStateを用意し、Retentionを解決してElementsを表示します。Component使用要素ごとにローカルStateの層とRef・Partialの登録領域が作られます。

通常の再描画だけでローカルStateを毎回初期化するわけではありません。ただし表示インスタンスが破棄され、作り直される場合は新しいStateになります。

Root Partialを設定した場合は、同じComponentインスタンス内のActionから `$invalidate('キー')` で再評価を要求できます。キーは空でない文字列が必要です。同じ登録領域で重複するキーや、存在しないキーへの要求はエラーになります。通常の数値State更新にRoot Partialは必須ではありません。

## 最小例

```text
Components
└─ Component: Main
   ├─ Props
   ├─ Store / States / State: count
   ├─ Retention
   └─ Elements
      └─ Tag: p
         └─ Text: 式 String($state.count)
```

AppのEntryからMainを選べば、このComponentを最初の画面として使えます。

## 制約と注意点

- 定義を画面へ直接移動するのではなく、Component使用要素から参照して再利用します。
- Componentが自分自身を再帰的に呼び出す構成は実行時にエラーになります。間接的な再帰も検出対象です。
- 参照されているComponentの削除は、構造参照の確認によって阻止される場合があります。
- モデルにローカルComponent（`local: true`）の区別がありますが、Entryの候補にはなりません。通常のComponents追加はローカル定義ではありません。
- StateはProject保存による実行値の永続化ではありません。

## 関連項目

- [Entry](/reference/elements/entry/)
- [Props](/reference/elements/props/) / [Value Prop](/reference/elements/value-prop/)
- [Component Use](/reference/elements/component-use/)
- [Slot](/reference/elements/slot/) / [Retention](/reference/elements/retention/)
- [State](/reference/elements/state/)
- [Tag](/reference/elements/tag/)
- [ComponentとRetention](/concepts/component/)
- [Componentを再利用する](/guides/reuse-components/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="component" />
