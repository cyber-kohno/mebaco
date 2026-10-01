---
title: Union Type
description: 固定候補または複数Object形状をまとめる名前付き型。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Union Type（kind: `union-type`）は複数の候補を1つの型名で表します。候補をstring / numberの値から選ぶLiteral Unionと、Object Typeから選ぶObject Unionがあります。

## 配置場所と操作

通常は `Common / Declares / Types` または `App / Declares / Types` に置き、Typesを右クリックして `Add union` を選びます。Retentionなどローカルな宣言位置からも追加できます。右クリックの `Modify` で更新します。

## 子要素

子要素はありません。IdとUnion定義は編集欄で設定します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 大文字始まりの型名。1〜32文字で、同じ見える範囲に重複できません |
| Definition | Literal UnionまたはObject Unionを選ぶ |
| Literal Union | stringまたはnumberの値候補を1つ以上設定 |
| Object Union | 既存のObject Typeを1つ以上選択 |

各候補は重複できません。空の候補一覧や、現在のスコープにないObject Typeは無効です。

## 参照とスコープ

型名の候補はCommon、所属App、囲むローカル宣言から決まります。別AppだけにあるUnion Typeは候補に入りません。Value TypeのNamed Typeとして指定し、式ではそのUnion Typeの値を扱います。

## 実行時の動作

Union Typeは型の定義であり、候補値やObjectを自動生成するUIではありません。Literal Unionを使う値の生成はState、Props、Variableなど各入力欄で行います。Object Unionは、選んだObject Typeのどれかに適合する構造を表します。

## 最小例

DefinitionをLiteral Unionにし、string候補 `draft` と `published` を登録します。Value TypeでこのUnionを選びます。

```ts
const status = 'draft'
```

## 制約と注意点

- Literal Unionはstringまたはnumberです。boolean候補を登録する形式ではありません。
- Object Unionの候補はObject Typeです。インラインObjectを直接候補として登録するものではありません。
- Union Typeを変更しても、利用箇所の保存値が常に自動で新しい候補へ変換される保証はありません。
- 型宣言による検査と各要素のRuntime検査は分けて確認してください。
- 参照されているUnion Typeは通常の削除メニューが出ない場合があります。

## 関連項目

- [型システム](/reference/types/)
- [Object Type](/reference/elements/object-type/)
- [Signature Type](/reference/elements/signature-type/)
- [Value Prop](/reference/elements/value-prop/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="union-type" />
