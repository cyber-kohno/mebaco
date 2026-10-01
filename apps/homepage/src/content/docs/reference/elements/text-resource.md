---
title: Text Resource
description: UTF-8テキストファイルを読み書きするResource。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`text-resource` は設定パスに対応するテキストファイルの読み書きを提供します。既存ファイル専用Resourceにも、Directory Resourceから派生させるテキストResourceにもできます。

## 配置場所と操作

Project / ResourcesでAdd text fileから作成します。Idと任意のName、Accessを設定します。

## 子要素

子要素はありません。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 式で参照するJavaScript識別子（1〜32文字） |
| Name | 任意の表示名（最大64文字） |
| Access | ReadまたはRead / Write |

## 参照とスコープ

AppでImportすると `$resource.<id>.read()` を利用できます。Read-Write時のみ `.write(text)` が公開されます。エンコーディング引数は省略可能ですが、現在対応するのは `utf8` のみです。

## 実行時の動作

APIはPromiseを返します。Directory Resourceから得た派生Text APIの場合、指定相対パスはResource側のText path patternに適合する必要があります。

## 最小例

```ts
const source = await $resource.settingsFile.read()
await $resource.settingsFile.write(source.trim())
```

書込み例はAccessがRead-Writeの場合に限ります。

## 制約と注意点

- WriteはRead-Write設定の場合だけ利用可能です。
- ディレクトリやバイナリファイルではなくUTF-8テキスト用です。
- 派生ResourceはDirectory側のAllow text file、Access、Patternに従います。
- 読み書きの失敗はPromise rejectionとして扱い、呼出側でエラーを処理してください。
- OSの文字コード変換を行うAPIではありません。

## 関連項目

- [Directory Resource](/reference/elements/directory-resource/)
- [Resource Imports](/reference/elements/resource-imports/)
- [Resources](/reference/elements/resources/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="text-resource" />
