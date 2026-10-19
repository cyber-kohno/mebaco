---
title: StateとAction
description: Stateを宣言し、イベントに応じて画面の値を更新します。
---

Stateはアプリが実行中に保持する値、Actionはイベントに応じて実行する処理です。画面を表示する式と、値を変更する処理を分けて記述します。ここでは[Counterチュートリアル](/start/first-project/)の `count` を例にします。

## Stateを定義する

Component自身が使う値は、そのComponentの `Store / States` に追加します。Statesを右クリックして `Add state` を選び、Id、Value Type、Initialを指定します。

| 項目 | Counterの設定 | 意味 |
| --- | --- | --- |
| Id | `count` | コードから参照する名前 |
| Value Type | `number` | 保持する値の型 |
| Array Depth | `0` | 配列ではなく単一の値 |
| Initial | `Set Value`、固定値 `0` | 実行開始時の値 |

Value Typeを変えるとInitialがリセットされるため、型を先に選んでください。AppにもStoreがありますが、CounterではMain ComponentのStoreを使います。

## 式で値を読む

Textの式モードでは、Stateを `$state` から参照できます。

```ts
String($state.count)
```

これは「countを文字列にして表示する」という式です。表示のための式でcountを増やすのではなく、値の変更はイベント側に置きます。

## Actionで値を変える

buttonのTagを右クリックして `Modify` を選び、`Attribute` タブの `Add Event` でイベント名 `click` を設定します。`TypeScript Action` に次のコードを入力し、「更新（Update）」で確定します。

```ts
$state.count += 1;
```

Textとは異なり、Actionには処理を書きます。ボタンを押すたびにcountが更新され、その値を読むTextの表示も変わります。

```text
buttonのclick → Action → count更新 → Textに新しい値を表示
```

### リセットボタンを追加する

同じMainのElementsにもう1つbuttonを作り、子のTextを固定値 `リセット` にします。そのbuttonのclickイベントには次を書きます。

```ts
$state.count = 0;
```

Previewで `+1` を何度か押してからリセットを押し、表示が `0` に戻れば、2つのボタンが同じStateを操作できています。

## 初期値と実行中の値を区別する

Projectに保存するのはStateの定義とInitialです。この例では、実行中にcountを増やしても、定義の初期値 `0` は変わりません。Previewを閉じて再実行すると、再び `0` で始まります。

実行をまたいで値を残したい場合は、通常のStateとは別に保存の仕組みが必要です。[ResourceとStorage](/guides/resources-storage/)を参照してください。

## 関連項目

- [Stateの仕様](/reference/elements/state/) — 初期化順、スコープ、更新と値の寿命
- [Tagの仕様](/reference/elements/tag/) — イベントActionの設定と実行
- [最初のProject](/start/first-project/) — 新規作成からPreview・保存までの操作
- [UIを組み立てる](/guides/build-ui/) — TextとTagの設定場所
- [式とスコープ](/concepts/expressions-and-scope/) — 参照できる値の範囲
- [式・コード](/reference/expressions/) — 式と処理のリファレンス
