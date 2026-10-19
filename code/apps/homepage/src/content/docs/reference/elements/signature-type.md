---
title: Signature Type
description: Function値やCallbackの引数、戻り値、非同期型を定義する。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Signature Type（kind: `signature-type`）は、Function値の引数と戻り値を型として定義します。Callbackなどの値を型付けするときに使います。

## 配置場所と操作

通常は `Common / Declares / Types` または `App / Declares / Types` に置き、Typesを右クリックして `Add signature` を選びます。Retentionなどローカルな宣言位置からも作成できます。右クリックの `Modify` で定義を変更します。

## 子要素

子要素はありません。引数・戻り値・Asyncは編集欄で設定します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 大文字始まりの型名。1〜32文字で、同じ見える範囲に重複できません |
| Parameters | 引数名、Value Type、Nullableを順に定義 |
| Return Type | 戻り値のValue TypeとNullable。未指定ならvoid |
| Async | 非同期Functionかを指定。戻り値型をPromiseで包む |

引数名はFunction内のコードから参照する識別子です。引数一覧や戻り値に選ぶ型は現在の型スコープで利用可能である必要があります。

## 参照とスコープ

型名の候補はCommon、所属App、囲むローカル宣言から決まります。Signature Typeは引数や戻り値の型として使えます。定義自体が `$fn` の関数を作るわけではありません。

## 実行時の動作

Signature Typeは型宣言です。Function値の実体はCallbackを設定する欄などから渡します。Mebaco Functionを呼び出すには `$fn.<Id>` を使いますが、それはSignature Typeの定義とは異なる仕組みです。

## 最小例

`NumberFormatter` を同期Signatureとして定義します。

```ts
(value: number) => string
```

Asyncを有効にすると戻り値は `Promise<string>` のようになります。

## 制約と注意点

- Signature TypeのParameterは名前と型を持ち、optional引数の設定はありません。nullableはnull許可で、省略可能とは異なります。
- Asyncは戻り値にPromiseを反映します。実際にどこでawaitできるかは、その値を使う入力欄やFunctionの実行文脈にも依存します。
- 引数や戻り値の型を変えた場合、Callbackなどの割当て先のコードも確認してください。
- 参照されているSignature Typeは通常の削除メニューが出ない場合があります。

## 関連項目

- [型システム](/reference/types/)
- [Object Type](/reference/elements/object-type/)
- [Union Type](/reference/elements/union-type/)
- [式・コード](/reference/expressions/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="signature-type" />
