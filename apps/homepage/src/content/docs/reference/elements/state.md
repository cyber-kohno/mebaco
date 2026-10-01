---
title: State
description: Stateの配置、名前と型、初期化順、更新と再描画、データ寿命の仕様。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

State（kind: `state`）は、実行中に保持して更新する値の定義です。Id、型、初期値を指定し、式から読み、イベントActionなどの処理で更新します。ファイルやStorageへの永続保存とは別の仕組みです。

## 配置場所と操作

`App / Store / States` または `Component / Store / States` に置きます。Statesを右クリックして `Add state`、変更するときはStateを右クリックして `Modify` を選びます。

Appに置くとApp側の共有値、Componentに置くと表示インスタンス側のローカル値になります。

## 子要素

Stateに子要素はありません。更新処理はStateの子ではなく、Tagのイベントや他の処理側に記述します。

## 設定項目

| 表示名 | 既定値・必須 | 制約・用途 |
| --- | --- | --- |
| Id | 必須、初期入力は空 | 1〜32文字。英小文字で始め、英字・数字のみ。TypeScript予約語は不可 |
| Value Type | `string` | 基本型や参照・名前付き型を選択する |
| Literal Union | オフ | string / numberの値を候補に限定する型設定 |
| Array Depth | `0` | 配列の深さ。エディターで0〜32に制限 |
| Nullable | オフ | 単一のObject参照型を選んだ場合に表示されるnull許可設定 |
| Initial | `Type default` | 型の既定値、固定値、式のいずれかで初期値を指定 |

Idの例は `count`、`selectedItem`、`value2`。`Count`、`item_count`、`$count`、`class` は使えません。同じStates内の名前と、追加先から見える祖先App・ComponentのState名は重複チェックの対象になります。

Value Typeを変更するとInitialがリセットされます。型を先に選んでから初期値を設定してください。型によって固定値の入力可否が変わり、配列や構造化された値は式で指定します。Initialの式は最大4,000文字です。

### Type default

| 型・条件 | 既定値 |
| --- | --- |
| 通常のstring | 空文字列 |
| 通常のnumber | `0` |
| boolean | `false` |
| 配列 | 空配列 `[]` |
| Nullable | `null`（配列などより先に適用） |
| string / numberのLiteral Union | 定義された最初の候補。候補がない場合は通常の既定値 |
| Object参照・名前付き型 | 参照先の型定義から生成する値 |

## 参照とスコープ

表示や処理からは `$state.<Id>` として読みます。ComponentのローカルStateに加え、呼出側から引き継ぐStateも参照できる場合があります。引き継いだStateへ代入すると、親側の値が更新されます。

Initialの式に渡される主な値は `$state`、`$launch`、`$const` です。ComponentのPropsはState初期化のコンテキストに渡されません。Propsを初期値式からそのまま使えると想定しないでください。

描画・Retention評価中のStateは読み取り用です。値の代入、配列変更、深いオブジェクト変更などは更新禁止の診断対象になります。イベントActionでは更新可能なコンテキストになります。

## 実行時の動作

同じStates内の値は、まずすべて型の既定値で用意され、その後、ツリーの並び順にInitialを評価します。先に初期化されたStateは設定済みの値、後のStateはまだ型の既定値として見えます。初期値が他のStateに依存するときは順序を確認してください。

Initialの式で評価エラーが起きた場合、現行RuntimeはそのStateを型の既定値へ戻します。開発モードでは警告も出ます。式が成功した値をそのまま採用するため、設定した型に合う値を返すようにしてください。

### 更新と再描画

Stateのトップレベルの読み取りと代入が依存関係として追跡されます。値が変わる代入で、そのStateを読む表示が更新対象になります。

オブジェクトのプロパティや配列だけを深く変更しても、トップレベルの代入通知は発生しません。イベント完了時の再描画に依存せず、変更した値を新しいオブジェクト・配列としてStateへ代入する書き方を基本にしてください。

```ts
// itemsが配列のStateとして定義されている場合
$state.items = [...$state.items, '追加した項目'];
```

通常の再描画ではComponentのローカルStateが維持されますが、インスタンスを破棄して作り直す場合は再初期化されます。Previewを閉じて新しく起動した場合も、Initialから始まります。

## 最小例

MainのStatesに、Id `count`、Value Type `number`、Initial `Set Value` の固定値 `0` を作ります。

Textの式:

```ts
String($state.count)
```

buttonのclickイベントAction:

```ts
$state.count += 1;
```

## 制約と注意点

- Stateの定義の型と、実行中の任意の代入に対する型検査を同一視しないでください。現在の値の代入がすべてRuntimeで型検証される仕組みではありません。
- Initialは常時再計算される式ではありません。別のStateを更新しても、初期値式が追随するわけではありません。
- Id変更後は式内の参照も確認してください。文字列のコード参照が自動で書き換わることを前提にしないでください。
- 削除時には式からの参照に対する確認が入る場合があります。削除を進める前に利用箇所を確認してください。
- Project保存はStateの定義とInitialを保存します。Previewの実行値を初期値へ書き戻す操作ではありません。

## 関連項目

- [App](/reference/elements/app/)
- [Component](/reference/elements/component/)
- [Text](/reference/elements/text/)
- [StateとAction](/guides/state-and-actions/)
- [型システム](/reference/types/)
- [ResourceとStorage](/guides/resources-storage/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="state" />
