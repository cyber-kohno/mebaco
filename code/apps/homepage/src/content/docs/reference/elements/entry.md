---
title: Entry
description: Appの起動時に表示するComponentと、そのPropsの設定・参照制約。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Entry（kind: `entry`）は、Appの最初の画面として使うComponentを指定する要素です。Componentの定義を子に持つのではなく、別の場所にある定義を内部識別子で参照します。

## 配置場所と操作

Appの直下に、App作成時に自動で作られます。Entryを右クリックして `Modify` を選び、`Component` と `Props` を編集します。Entryの右クリックメニューには単独の追加・削除操作はありません。

## 子要素

Entry自体に子要素はありません。Propsへの値の割当てもEntryの設定欄で行います。参照先Componentは `App / Declares / Components` など、同じApp内の定義です。

## 設定項目

| 表示名 | 既定値 | 内容 |
| --- | --- | --- |
| Component | 未選択 | 同じApp内の通常のComponentから選択する |
| Props | 割当てなし | 選択したComponentのValue Propに値を渡す |

Componentを変更するとPropsの割当てはクリアされます。参照先を変更した後は、必要なPropsを再確認してください。

Propsに既定値がある場合は `Default`（Component default）か `Set Value` を選べます。既定値がないPropは値の指定が必要です。基本型の固定値、または型に合った式を指定します。

## 参照とスコープ

Component候補は所属Appの配下から集められ、ローカルComponentは除外されます。CommonのComponentはEntryの直接の候補ではありません。

Propsの式はApp側のコンテキストで評価されます。Appの `$state`、`$launch`、`$const` などを利用できますが、参照先ComponentのローカルStateをEntryの式から読むことはできません。渡された値はComponent内の `$props.<Id>` から読みます。

## 実行時の動作

Entryの参照先を内部の `componentId` で解決し、Propsを評価してから画面に渡します。Component名を通常の編集で変更しても、内部識別子が維持されればEntryの参照は維持されます。

Propsは定義順に評価されます。式の評価失敗や型に合わない値はエラーになり、正常な入口として描画できません。

| 入口の問題 | 表示される診断の例 |
| --- | --- |
| Entry自体がない | `Entry is not configured.` |
| Component未選択 | `Entry component is not configured.` |
| 参照先がない | `The configured Entry component was not found.` |

## 最小例

```text
App: counter
├─ Declares / Components / Main
└─ Entry
   ├─ Component: Main
   └─ Props: なし（MainにValue Propを定義していない場合）
```

App作成後にMain自動生成を選ぶと、この参照は自動で設定されます。

## 制約と注意点

- Componentを未選択にできる編集状態と、実行可能な状態は異なります。実行には有効な参照先が必要です。
- Component切替後のPropsは、元のComponentの設定を引き継ぎません。
- Componentの内部識別子と、利用者が入力するIdを混同しないでください。
- 既定値に任せる場合も、Component側のPropが求める型を確認してください。

## 関連項目

- [App](/reference/elements/app/)
- [Component](/reference/elements/component/)
- [Value Prop](/reference/elements/value-prop/) — 必須値、既定値、割当て式のスコープ
- [State](/reference/elements/state/)
- [Componentを再利用する](/guides/reuse-components/)
- [最初のProject](/start/first-project/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="entry" />
