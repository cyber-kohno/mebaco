---
title: Directory Resource
description: 指定ディレクトリを境界としてファイル一覧・操作を提供するResource。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`directory-resource` は設定したディレクトリを基準に、一覧・検索と権限で許可されたファイル操作を行うResourceです。Resource Idは式から参照する識別子です。

## 配置場所と操作

Project / ResourcesでAdd directoryから作成します。ModifyでId、任意のName、権限を設定します。IdはJavaScript識別子で1〜32文字、Resource間で一意です。

## 子要素

子要素はありません。テキスト・SQLite派生Resourceを許可すると、ディレクトリ内の相対パスを別APIとして扱えます。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Access | ReadまたはRead / Write |
| Delete file | Read-Write時にファイル削除を許可 |
| Allow text file | 派生Text APIを許可し、権限とglobパターンを指定 |
| Allow sqlite | 派生SQLite APIを許可し、権限・globパターン・Create if missingを指定 |

派生機能は初期状態で無効です。既定パターンはTextが `**/*`、SQLiteが `**/*.db` です。

## 参照とスコープ

AppでImportすると `$resource.<id>` から利用できます。代表APIは `exists(path)`、`list(path?)`、`glob(pattern)`。Read-Write時は `renameFile`、`copyFile`、`createDir`、`createFile` が追加されます。削除APIはDelete fileも許可した場合にだけ提供されます。

## 実行時の動作

全ファイルパスはResourceルートからの相対パスです。操作は非同期でネイティブ側へ送られ、セッション内で権限を検査します。テキスト・SQLiteを許可した場合、`text(path)`または`sqlite(path)`で派生Resourceを取得します。

## 最小例

```ts
const entries = await $resource.workspace.list()
const exists = await $resource.workspace.exists('settings.json')
```

## 制約と注意点

- 絶対パス、`.`、`..`、空のパス要素、Resourceルート外への移動は拒否されます。シンボリックリンク対象もサポートされません。
- globの`*`はパス区切りを越えず、`**`は階層をまたぎます。パターン自体に絶対パスや親移動は指定できません。
- Directory ResourceのWrite権限はファイル書込みを意味しません。Text/SQLiteの派生権限も個別に許可してください。
- 削除はRead-WriteとDelete fileの両方が必要です。
- ネイティブ権限に加え、OSのアクセス権やファイル状態でも失敗する場合があります。

## 関連項目

- [Resources](/reference/elements/resources/)
- [Text Resource](/reference/elements/text-resource/)
- [SQLite Resource](/reference/elements/sqlite-resource/)
- [Resource Imports](/reference/elements/resource-imports/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="directory-resource" />
