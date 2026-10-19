---
title: Parameters
description: Styleが利用する型付き引数の管理コンテナ。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`style-params` はStyle Parameterをまとめる任意のコンテナです。Parametersを作ると、適用側Tagや継承Styleから値を渡せます。

## 配置場所と操作

StyleのメニューからUse parametersを選びます。コンテナからAdd parameterでParameterを追加し、コンテナを削除するときは参照中の項目を確認します。

## 子要素

Style Parameterを0個以上持ちます。StyleごとにParametersコンテナは1つです。

## 設定項目

コンテナ自身に設定項目はありません。各ParameterのID、Value Type、Default Valueを子要素で設定します。

## 参照とスコープ

ParameterはStyle式で `$param.<id>` として参照します。継承StyleのParameterはBaseの引数で解決するか、未解決なら派生Style／最終適用先へ公開されます。

## 実行時の動作

Style解決時に直接Parameterと継承由来のParameterを統合します。同名Parameterの競合や引数不足・余分な引数は構造エラーになります。

## 最小例

String Parameter `tone` を作り、Colorプロパティ式を `tone` の値で構成します。Tagへの適用時にLiteralまたは式で値を渡します。

## 制約と注意点

- Value Typeはstring、number、boolean、colorです。
- DefaultがないParameterは適用時に値が必要です。Defaultがある場合は既定値を使う選択肢があります。
- 複数のBase Styleから同名Parameterが露出すると競合します。
- Parameter ID変更や削除時は、Tag適用とStyle継承の引数Bindingを確認してください。

## 関連項目

- [Style](/reference/elements/style/)
- [Style Parameter](/reference/elements/style-param/)
- [Tag](/reference/elements/tag/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="style-params" />
