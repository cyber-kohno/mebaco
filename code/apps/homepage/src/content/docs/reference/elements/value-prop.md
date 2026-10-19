---
title: Value Prop
description: 名前と型を持つ入力項目、既定値、呼出側の割当てと実行時検証。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Value Prop（kind: `value-prop`）は、ComponentまたはSlotに渡す1つの入力項目です。入力名、型、省略時の既定値を定義します。

## 配置場所と操作

ComponentまたはSlotのPropsに置きます。Propsを右クリックして `Add value prop`、変更はValue Propを右クリックして `Modify` を選びます。

## 子要素

子要素はありません。呼出側の値はEntry、Component Use、Slot Useの設定欄で割り当てます。

## 設定項目

| 表示名 | 既定値 | 内容・制約 |
| --- | --- | --- |
| Id | 空、必須 | 1〜32文字。英小文字で始め、英字・数字のみ。予約語・同じProps内の重複は不可 |
| Value Type | `string` | 受け取る値の型 |
| Literal Union / Array Depth / Nullable | 型に応じた設定 | 詳細は型システムとStateの型設定を参照 |
| Use Default Value | オフ | 呼出側で省略できる既定値を使うか |
| Default Value | 有効時は `Type default` | 型の既定値、または入力可能な型の固定値 |

Value Typeを変更すると既定値の有効設定と内容がリセットされます。型を先に選んでください。定義側のDefault Valueは式モードではありません。動的な値は呼出側のProps欄で式を指定します。

Nullableであっても、Use Default Valueがオフなら入力は必須です。「nullを渡せる」と「省略できる」は別の条件です。

## 参照とスコープ

受取側では `$props.<Id>` から読みます。割当ての式は、呼出側のStateやRetentionの変数などを使って評価します。

:::caution[割当て式内の$props]
現行Runtimeは、割当てを解決する際に `$props` を「受取側でここまで解決した入力」に置き換えます。呼出側のPropsをそのまま参照する名前空間ではありません。呼出側のPropを渡したい場合は、Retentionで `$var` に取り出し、その変数を割当て式から参照してください。
:::

## 実行時の動作

割当てがあればそれを使い、なければ定義側のDefault Valueを使います。どちらもない場合は `Prop '名前' is required.` になります。入力はPropsのツリー順に解決されるため、割当て式の `$props` で参照できるのは、先に正常解決された受取側の項目です。

型検証では、string / boolean、有限のnumber、null許可、配列かどうか、Objectかどうかなどを確認します。配列の各要素やObjectの全プロパティを、すべての場合に深く検証するという保証ではありません。名前付き型は型定義側の検証を使います。

## 最小例

titleをstring型、Use Default Valueオフで定義します。Component UseのProps欄でtitleに固定値 `1つ目のパネル` を渡し、ComponentのTextを式にします。

```ts
$props.title
```

## 制約と注意点

- 固定値モードと式モードを区別してください。配列やObject参照の割当てには式を使います。
- 内部の `propId` と表示・コード用のIdは別です。通常のId変更で内部識別子が維持されても、コードに書いた名前は確認が必要です。
- Propsを書き換えても、呼出側Stateへ自動で代入する契約ではありません。オブジェクトの深い変更が常に禁止される仕組みとも説明しないでください。
- ComponentのProp削除時には式参照の確認が入る場合があります。Slot側のPropを変更する場合も、Slot Useと差し込み内容の式を確認してください。

## 関連項目

- [Props](/reference/elements/props/)
- [Component Use](/reference/elements/component-use/)
- [Slot Use](/reference/elements/slot-use/)
- [Retention](/reference/elements/retention/)
- [型システム](/reference/types/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="value-prop" />
