---
title: Log Settings
description: Runtime logの閾値とメッセージ表示形式を設定する要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`debug-log` はRuntime `$log` の最低出力レベルと、レベル・日時・Node IDの表示を設定します。

## 配置場所と操作

Debugに初期作成されます。右クリックModifyでLog Settingsを編集します。

## 子要素

子要素はありません。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Log level | Debug / Info / Warn / Error / Off |
| Show log level | `[INFO]`等の表示 |
| Show date / time | ローカル日時の表示 |
| Show node ID | `node-<id>`の表示 |

## 参照とスコープ

式・Actionから `$log.debug(...)`、`info`、`warn`、`error` を呼びます。Node ID付きメッセージは発生元要素をRuntime上で特定する補助になります。

## 実行時の動作

設定レベル以上のメッセージだけがConsole sinkへ出力されます。たとえばWarnではWarnとErrorが出力されます。Offではすべて抑止されます。

## 最小例

```ts
$log.info('Loaded user', userId)
$log.error('Could not load user', error)
```

## 制約と注意点

- Log Levelは出力閾値で、個別メッセージを選択的に許可するルールではありません。
- OffではErrorも出力されません。診断中は必要な閾値へ戻してください。
- ログへ認証情報・個人情報・秘密値を出さないでください。
- Debug Logは状態を保存するロガーではなく、Runtime出力設定です。

## 関連項目

- [Debug](/reference/elements/debug/)
- [Action](/reference/elements/action/)
- [式・コード](/reference/expressions/)
- [トラブルシューティング](/troubleshooting/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="debug-log" />
