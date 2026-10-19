---
title: Object Type
description: 名前付きの値構造、Objectの継承、プロパティの制約。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Object Type（kind: `object-type`）は、名前の付いたObjectの形を宣言し、State・Props・Variableなど複数の値で再利用します。

## 配置場所と操作

通常は `Common / Declares / Types` または `App / Declares / Types` へ置きます。Typesを右クリックして `Add object` を選びます。ローカルな定義はRetentionなどの `Add declare` から追加します。既存要素を右クリックして `Modify` で変更します。

## 子要素

子要素はありません。プロパティとBase ObjectはObject Typeの編集欄で定義します。

## 設定項目

| 表示名 | 内容 |
| --- | --- |
| Id | 大文字始まりの型名。1〜32文字で、同じ見える範囲に重複できません |
| Properties | Objectのプロパティ名、型、optional、nullableを設定 |
| Base Object | 継承元となる既存Object Typeを選択 |

プロパティ名は式で参照できる識別子を使います。同じObject内の重複名、継承元と重なる名前、複数のBase Objectから継承される重複プロパティは検証エラーになります。循環継承もできません。

## 参照とスコープ

型として見える候補はCommon、所属App、囲むローカル宣言から決まります。別Appだけに定義したObject Typeは、現在のAppで直接選べません。Object TypeをValue Typeで指定すると、その構造を参照できます。

## 実行時の動作

Object Typeは型宣言です。画面に要素を表示したり、インスタンスごとに値を保存したりしません。Object値を作るときは式欄でObjectを生成し、各値を設定します。型の既定値生成では必須プロパティを再帰的に組み立て、optionalなプロパティを省略します。

## 最小例

`User` に `name: string` と `age: number` を定義します。StateなどのValue TypeでUserを選びます。

```ts
{ name: 'Aoi', age: 20 }
```

## 制約と注意点

- `optional` はプロパティをObjectから省略できる設定、`nullable` はプロパティ値にnullを許す設定です。
- 継承元のプロパティと同じ名前を子Object Typeで再定義するオーバーライドはできません。
- 継承元を複数選ぶ場合、同じ名前のプロパティが重複しないか確認してください。
- 構造変更の影響や値の互換性は利用先ごとに確認します。定義を変えただけで、すべてのRuntime値が自動変換されるとは限りません。
- Object Typeが型付けすることと、任意の実行時Objectの全フィールドが深く検査されることは同じではありません。

## 関連項目

- [型システム](/reference/types/)
- [Union Type](/reference/elements/union-type/)
- [Signature Type](/reference/elements/signature-type/)
- [Value Prop](/reference/elements/value-prop/)
- [State](/reference/elements/state/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="object-type" />
