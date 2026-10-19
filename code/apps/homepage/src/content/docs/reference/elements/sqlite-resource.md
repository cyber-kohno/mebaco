---
title: SQLite Resource
description: SQLiteデータベースを型付きパラメーターで照会・更新するResource。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`sqlite-resource` は設定したSQLiteファイルを開き、Query、Read-Write時のExecuteとトランザクションを提供します。独立ResourceとDirectory Resourceからの派生Resourceがあります。

## 配置場所と操作

Project / ResourcesでAdd sqliteから作成します。Id、Name、Accessを指定します。Create if missingはRead-Write時のみ利用できます。

## 子要素

子要素はありません。DB構造やSQL文はResource要素ではなく、呼出側の式・Actionで定義します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 式で参照するJavaScript識別子（1〜32文字） |
| Name | 任意の表示名（最大64文字） |
| Access | ReadまたはRead / Write |
| Create if missing | Read-Write時に対象DBがない場合の作成を許可 |

## 参照とスコープ

AppでImportすると `$resource.<id>.open()`、`.query(sql, parameters?)` が使えます。Read-Writeでは `.execute(sql, parameters?)` と `.transaction(callback)` も使えます。パラメーター値はnull、string、finite number、Uint8Arrayを扱えます。

## 実行時の動作

各APIは非同期です。Queryは行配列を返し、ExecuteはchangesとlastInsertRowIdを返します。Transaction callbackにはquery、execute、rollbackが渡され、正常終了時はCommit、例外またはrollback指定時はRollbackされます。Transactionは30秒でタイムアウトします。

## 最小例

```ts
const rows = await $resource.database.query(
  'SELECT id, title FROM tasks WHERE done = ?',
  [false],
)
```

## 制約と注意点

- Readではデータ変更APIが公開されず、ネイティブ側でも更新を拒否します。
- `ATTACH` / `DETACH` とSQLによる手動Transaction制御は制限されます。Transaction APIを使ってください。
- JavaScript安全整数範囲を超える整数・非有限数値・UTF-8でないText値などは境界でエラーになります。BLOBはUint8Arrayとして扱います。
- Directory派生の場合、Allow sqliteと派生権限・glob Patternのすべてが必要です。
- `?`プレースホルダー等のパラメーターを使い、SQL文字列への値連結を避けてください。
- Create if missingはディレクトリや親ディレクトリを作る設定ではありません。

## 関連項目

- [Directory Resource](/reference/elements/directory-resource/)
- [Resource Imports](/reference/elements/resource-imports/)
- [ResourceとStorageガイド](/guides/resources-storage/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="sqlite-resource" />
