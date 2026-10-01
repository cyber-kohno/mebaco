---
title: Props
description: ComponentやSlotの入力をまとめるPropsと、Value Propの評価順。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Props（kind: `props`）は、外部から受け取る値の定義をまとめるコンテナーです。Componentへの入力と、Slotから差し込み内容へ渡す入力で使います。実際の入力項目は子のValue Propです。

## 配置場所と操作

Component作成時とSlot作成時に、それぞれの直下に自動で作られます。Propsを右クリックして `Add value prop` を選ぶと入力項目を追加できます。

## 子要素

[Value Prop](/reference/elements/value-prop/)を持ちます。Slotの定義はPropsの子ではなく、ComponentのSlotsに置きます。

## 設定項目

Props自体にIdや値の入力欄はありません。名前、型、既定値は子のValue Propで設定します。呼出側から実際に渡す値は、Entry、Component Use、Slot UseのProps欄で指定します。

## 参照とスコープ

受取側の表示・処理では `$props.<Id>` から読みます。ComponentのPropsとSlotのPropsは同じ入力項目ではありません。Slotの差し込み内容では、SlotのPropsが `$props` になります。

## 実行時の動作

Value Propをツリー順に解決します。各値は明示された割当て、または定義側の既定値から得られます。必須値の未指定、式の評価失敗、型の不一致は診断対象です。

## 最小例

```text
Component: Panel
└─ Props
   └─ Value Prop: title（string、既定値なし）
```

呼出側でtitleに固定値を渡し、PanelのTextに式 `$props.title` を設定します。

## 制約と注意点

- PropsはStateの初期値を定義する場所ではありません。
- Propsへの値の割当ては、親の値を書き戻す双方向バインディングではありません。
- 入力項目を追加・削除したら、既存の使用箇所のProps設定も確認してください。

## 関連項目

- [Value Prop](/reference/elements/value-prop/)
- [Component Use](/reference/elements/component-use/)
- [Slot](/reference/elements/slot/)
- [Componentを再利用する](/guides/reuse-components/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="props" />
