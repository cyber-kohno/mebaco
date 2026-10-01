---
title: Component Use
description: 画面にComponentを配置し、PropsとSlotの内容を指定する使用要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Component Use（kind: `component-use`）は、Componentの定義を画面に置いて使う要素です。同じ定義を複数箇所から参照し、箇所ごとにPropsとSlotの内容を指定できます。

## 配置場所と操作

Elementsや子を持てるTagなど、表示要素を追加できる場所で `Add view → Component` を選びます。ダイアログ名は `Create Component View`。変更は使用要素を右クリックして `Modify` を選びます。

## 子要素

参照先にSlotがあれば、使用要素の下にSlot Contents（画面表示名は `Slots`）が同期生成され、その下にSlot Contentが作られます。表示内容は各Slot Contentへ追加します。Component定義を子としてコピーするわけではありません。

## 設定項目

| 表示名 | 既定値 | 内容 |
| --- | --- | --- |
| Component | 未選択、必須 | 表示に使う定義を選択 |
| Props | 割当てなし | 定義のValue Propに固定値または式を割り当てる |
| Refresh slots（メニュー） | 操作 | 参照先のSlot定義に子構造を合わせる |

Componentを切り替えるとPropsの割当てがクリアされます。Slotの内容も新しい参照先に同期するため、切替前に保存・バックアップしてください。

## 参照とスコープ

候補には、同じAppとCommonの通常Component、可視なRetentionのローカルComponentが含まれます。他のAppだけに定義したComponentは直接の候補ではありません。直接・間接の呼出し循環になる候補はエディターから除外されます。

Propsの式は使用箇所の `$state`、`$var` などを使います。ただし `$props` は受取側の入力を順に構築する名前空間になるため、[Value Propの注意点](/reference/elements/value-prop/#参照とスコープ)を確認してください。

## 実行時の動作

定義を解決し、Propsを評価してから、Component専用のローカルState層とRef・Partialの登録領域を作ります。同じ定義を2つ置いても、それぞれのローカルStateは別になります。呼出側から引き継いだStateは共有される場合があります。

通常の再描画では同じインスタンスのStateを維持します。使用要素の削除・非表示などでインスタンスが破棄され、再び作られる場合は初期化されます。

参照先未選択、定義が見つからない、Propsの不整合、再帰呼出しは実行時のエラーになります。

## 最小例

```text
Main / Elements
├─ Component Use: Panel（titleの固定値: 1つ目のパネル）
└─ Component Use: Panel（titleの固定値: 2つ目のパネル）
```

PanelのTextを `$props.title` にすると、同じ定義から異なる見出しを表示できます。

## 制約と注意点

- 定義変更はすべての使用箇所に影響します。Propsの割当てとSlot Contentは使用箇所ごとの設定です。
- Refresh slotsは現在のSlot定義だけを残します。削除されたSlotや切替先にないSlotの差し込み内容は保持されません。
- Slot名の通常変更では内部slotIdが維持されます。削除して同じ名前を作り直す操作は別のSlotになります。
- Component Useは無効化できます。定義そのものを削除する操作ではありません。

## 関連項目

- [Component](/reference/elements/component/)
- [Value Prop](/reference/elements/value-prop/)
- [Slot Contents](/reference/elements/slot-contents/)
- [Slot Content](/reference/elements/slot-content/)
- [Componentを再利用する](/guides/reuse-components/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="component-use" />
