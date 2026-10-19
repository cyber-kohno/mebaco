---
title: 型システム
description: 値の型、配列、Object、Union、Signatureの定義と利用範囲を説明します。
---

MebacoのValue Typeは、State、Props、Variable、Functionの引数や戻り値などで値の形を表します。型の指定は入力補完や式検証に使われ、一部のRuntime処理でも適合性を確認します。Project内のすべての値が常にRuntimeで完全検査される仕組みではありません。

## 型を選ぶ

| 型 | 用途 | 例 |
| --- | --- | --- |
| `string` | 文字列 | `title: string` |
| `number` | 有限数値 | `count: number` |
| `boolean` | 真偽値 | `enabled: boolean` |
| Literal Union | stringまたはnumberを候補値に限定 | `'draft' \| 'published'` |
| Object Type / インラインObject | 名前のある、またはその場で定義するプロパティ構造 | `{ name: string; age?: number }` |
| Object参照 | 既存Object Typeを再利用 | `User` |
| Object Union | いずれかのObject Type | `User \| Team` |
| Signature Type | Functionの引数と戻り値 | `(id: string) => number` |
| 配列 | 上記の型を要素とする配列 | `User[]`、`number[][]` |

nullableは配列深度0の値全体に `null` を許す設定です。たとえば `User[]` をnullableにすると `User[] | null` です。配列の各要素をnullableにする設定ではありません。Objectプロパティごとには、optional（省略可能）とnullable（値がnullでもよい）を別々に指定できます。

## 型定義の配置

Object Type、Union Type、Signature Typeは、通常 `Common / Declares / Types` または `App / Declares / Types` に置きます。RetentionやFunctionなど、ローカルに宣言できる位置もあります。見える型はCommon、所属App、囲むローカルな宣言枠から決まります。

```text
Project
├─ Common / Declares / Types       複数Appで使う型
└─ Apps / App
   └─ Declares / Types             App内の型
      └─ Retention                 必要な位置で使うローカル型
```

App内の式では、Commonと所属Appの型が候補になります。他のAppだけにある型は自動で見えません。ローカル型はRetention、Function手続き、Promiseの分岐など、定義位置を含むスコープ内で利用します。型Idは大文字始まりの識別子で、同じ可視範囲の型と重複しない名前にしてください。

### 選択の目安

- 同じプロパティ構造を複数のStateやPropsで使うならObject Type。
- stringやnumberの決まった候補集合ならLiteral Union。
- 複数のObject形状を受け取るならObject Union。
- CallbackやFunctionの値を型付けするならSignature Type。
- 一度だけ使う小さな構造ならインラインObject。

## 配列、既定値、Nullable

配列の深さは最大32です。型の既定値は、配列なら空配列、通常のstringなら空文字列、numberなら0、booleanならfalseです。nullableなら型の既定値はnullです。Literal Unionでは先頭の候補値が既定値になります。Object型は必須プロパティから既定のObject値を組み立て、optionalなプロパティは省略します。

既定値と初期化式は別です。State Initialは型既定値・固定値・式から選び、Propsは明示的な割当てがなければ定義のDefault Valueを使います。Value PropのDefault Valueは固定値またはType defaultであり、式ではありません。

## 定義ページ

- [Object Type](/reference/elements/object-type/)：名前付きプロパティ構造と継承。
- [Union Type](/reference/elements/union-type/)：Literal候補、またはObject型の選択肢。
- [Signature Type](/reference/elements/signature-type/)：Function値の引数、戻り値、非同期指定。
- [Value Prop](/reference/elements/value-prop/)：ComponentとSlotの入力値。
- [State](/reference/elements/state/)：実行中に保持する値。

## 互換性の読み方

型宣言とRuntimeの検証は利用箇所に応じて異なります。PropsのRuntime検証は、numberが有限値か、配列か、Objectか、nullableかなどを確認します。配列要素やObjectの各フィールドまで常に再帰して検証するわけではありません。Retention Variableに明示した型では評価結果の適合性が検査されます。一方、State代入すべてに同じRuntime検査がかかるとは限りません。

式エディターの診断は、補完用の型宣言とその欄の期待型を基にした入力支援です。詳しくは[式・コード](/reference/expressions/)を参照してください。
