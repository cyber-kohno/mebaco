---
title: Types
description: Project内のObject・Union・Signature型定義をまとめるコンテナ。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`types`は名前付き型定義を管理するフォルダーです。型定義はValue Typeや引数型などから再利用できます。

## 配置場所と操作

Declares配下に配置されます。メニューからAdd object、Add union、Add signatureを選びます。

## 子要素

Object Type、Union Type、Signature Typeを0個以上持ちます。

## 設定項目

Types自体に設定値はありません。型名・プロパティ・継承・Union候補・Signatureパラメーターは各定義で設定します。

## 参照とスコープ

作成候補はCommon、所属App、親スコープなど現在見える型に制限されます。全Appのローカル型がどこからでも参照できるわけではありません。

## 実行時の動作

TypesコンテナはRuntime値を生成しません。Studioの型解決、式診断や既定値編集、各Runtime機能の型契約を支えます。

## 最小例

Add objectで`UserProfile`を作り、Stringの`name`プロパティを追加します。StateやLaunch ArgumentのValue Typeで`UserProfile`を選びます。

## 制約と注意点

- 同じ可視範囲で型名を重複させないでください。
- 循環継承やUnion構成の詳細制約は個々の型ページを参照します。
- Studio入力時の型診断とRuntime時の検証は同じ保証範囲とは限りません。

## 関連項目

- [Object Type](/reference/elements/object-type/)、[Union Type](/reference/elements/union-type/)、[Signature Type](/reference/elements/signature-type/)
- [型システム](/reference/types/)、[式・コード](/reference/expressions/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="types" />
