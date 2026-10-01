---
title: Function
description: 引数と戻り値を持つ再利用可能な処理の定義と実行。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Function（kind: `function`）は、入力引数を受け取って処理や値の計算を行う定義です。可視範囲から `$fn.<Id>(...)` で呼び出します。表示されるElementsを持つComponentとは別の仕組みです。

## 配置場所と操作

通常は `Common / Declares / Functions` または `App / Declares / Functions` に置きます。Retentionなどローカル宣言できる位置にも追加できます。作成・変更ダイアログにはInfo、Signature、Implementationの設定があります。

## 子要素

Code Implementationでは本文を直接記述します。Procedure ImplementationではFunction Procedureが作られ、Variable、Action、条件、Promise、Returnなどを順に組み立てます。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 1〜32文字のJavaScript識別子。同じ関数スコープの重複名は不可 |
| Signature | Inlineで直接定義するか、Signature Typeを参照 |
| Parameters | 名前とValue Type、Nullable |
| Return Type | 値の型とNullable。未指定ならvoid |
| Async | 非同期Functionにするか |
| Implementation | CodeまたはProcedure |

Functionの署名や実装モードの選択により、編集可能な欄が変わります。参照Signatureを変更すると呼出し側と実装の期待型も変わります。

## 参照とスコープ

Common、所属App、囲むRetention / Function Procedure / Promise分岐などから可視なFunctionを `$fn.<Id>` で呼び出します。ProcedureとReturn式では引数を `$args.<Id>` で参照します。Code Implementationでは引数名を直接使います。

Functionが参照するDefinitionのスコープと、呼出し時に渡されるStateなどの値を区別してください。別Appだけにある関数は直接の候補ではありません。

## 実行時の動作

呼び出しごとに引数の型を確認し、Functionの処理を実行して、戻り値があればその型も確認します。ProcedureはVariable Frameを使い、Procedure内で定義した宣言はその呼び出しに属します。失敗は呼出元へRuntimeエラーとして返ります。

Async FunctionはPromiseを返し、対応する呼出し文脈が結果を待ちます。同期Functionとして呼び出した箇所で非同期Functionを実行できない場合もあります。

## 最小例

number引数 `value`、number戻り値のFunction `double` を作り、Return式に設定します。

```ts
$args.value * 2
```

見える式から `$fn.double($state.count)` のように呼び出せます。

## 制約と注意点

- FunctionはUIを描画しません。UIをまとめて再利用する場合はComponentを使います。
- Signature Typeを選ぶだけでは、Function実装や値の実体は生成されません。
- 戻り値型の定義と、Code内のTypeScript変換は別です。Runtimeは引数・戻り値の適合性も確認します。
- Function Procedure内のActionで `return` 文を使ってFunctionから値を返すのではなく、Function Return要素を使います。
- Promiseを返すAsync Functionやawaitは、呼び出し側の文脈にも制約されます。

## 関連項目

- [Signature Type](/reference/elements/signature-type/)
- [Variable](/reference/elements/variable/)
- [Action](/reference/elements/action/)
- [式・コード](/reference/expressions/)
- [Retention](/reference/elements/retention/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="function" />
