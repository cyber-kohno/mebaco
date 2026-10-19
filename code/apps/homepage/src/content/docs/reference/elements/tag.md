---
title: Tag
description: HTML要素の配置、対応タグ、属性・イベント・Style、RefとPartialの仕様。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Tag（kind: `tag`）は、画面にHTML要素を表示する要素です。Tag nameで種類を選び、子の表示内容、Style、属性、イベントを組み合わせます。文字そのものは子の[Text](/reference/elements/text/)で指定します。

## 配置場所と操作

ComponentのElements、子を持てるTag、表示用の条件分岐・繰り返し・Block、Slotの表示領域などに配置します。親にしたい要素を右クリックして `Add view → Tag` を選びます。

変更はTagを右クリックして `Modify`。TagにRetentionを追加した場合は、表示する子をそのTagのElementsに置きます。

## 子要素

子を持てるTagには、Tag、Text、Component使用、表示用の制御要素などを追加できます。`input`、`img`、`br` は子を持てません。既に子があるTagの編集では、子を持てないTag nameは選択対象から除外されます。

`Use retention` でRetentionとElementsの構造に切り替えられます。元の表示内容はElementsへ移されます。Retentionを外せるかどうかは、その内容と子構造によって決まります。

## 設定項目

| タブ・表示名 | 既定値 | 用途・制約 |
| --- | --- | --- |
| Info / Tag name | `div` | 対応タグから選択、必須 |
| Info / Comment | 空 | ツリー上の説明。最大80文字。表示する本文ではない |
| Info / Ref | 未設定 | DOM要素を参照するキー。固定文字列または文字列を返す式 |
| Info / Partial | 未設定 | この表示領域の再評価キー。固定文字列または文字列を返す式 |
| Style / Styles | なし | 適用するStyle、条件、Parameterの割当て |
| Monitor / Resolved Style | 設定から算出 | Style解決結果の確認欄 |
| Attribute / Attributes | なし | HTML属性とイベントAction |

### 対応するTag name

| 分類 | 選択できるタグ |
| --- | --- |
| レイアウト | `div`、`span` |
| テキスト | `p`、`h1`〜`h6` |
| フォーム | `form`、`label`、`input`、`textarea`、`select`、`option`、`button` |
| リスト | `ul`、`ol`、`li` |
| 表 | `table`、`thead`、`tbody`、`tr`、`th`、`td` |
| 画像・その他 | `img`、`a`、`br` |

任意のHTMLタグ名を自由入力する設定ではありません。

### 属性

`Attribute` タブで `Add Attribute` を押し、名前と固定値または式を指定します。既知の属性はstring / number / booleanに合った入力欄になります。カタログにない名前は `Unknown attribute` と表示され、式で値を指定します。未知の属性が意図どおり機能することを保証する表示ではありません。

Mebacoが管理する属性は予約されています。`class` / `className`、`style` / `cssText`、`hidden`、`innerHTML` / `outerHTML`、`textContent` / `innerText`、`children`、`slot`、`part` / `exportparts`、`border` / `cellpadding` / `cellspacing` / `bgcolor` / `align` / `valign` が該当します。

さらに、`on` で始まるイベント属性、`bind:`・`use:`・`transition:`・`in:`・`out:`・`animate:`・`let:`・`class:`・`style:` の構文、`data-mbc-` / `mbc-` で始まる内部名も予約対象です。予約判定は大文字・小文字を区別せず、これらはRuntimeの通常属性として適用されません。見た目はStyle、表示条件は制御要素、文字はText、イベントはAdd Eventで設定します。

### イベント

`Add Event` で名前とTypeScript Actionを指定します。

| 項目 | 既定値 | 内容 |
| --- | --- | --- |
| 名前 | 空 | `click`、`input`、`change`など。`onclick`ではなくイベント名 |
| prevent default | オフ | Actionの実行前に標準のイベント動作を抑止する |
| stop propagation | オフ | Actionの実行前にイベント伝播を止める |
| TypeScript Action | 空 | イベント時に実行する処理。`await`を利用できる |

イベント候補にはマウス、ポインター、タッチ、キーボード、フォームなどの分類があります。未知の名前は `Unknown event` と表示され、型情報はEventとして扱われます。

## 参照とスコープ

属性の式と表示内容は、TagのRetentionを解決したコンテキストを使います。表示時のStateは読み取り用です。イベントActionでは同じ値に加えて `$event` が渡され、Stateを更新できます。

Refは同じComponentインスタンスの `$system.getRef('キー')` からDOM要素を取得するためのものです。Partialは同じインスタンスのActionで `$invalidate('キー')` を呼び、この領域の再評価を要求するためのものです。どちらも設定する場合は空でない文字列が必要で、同じ登録領域のキー重複は診断されます。

## 実行時の動作

対応するHTML要素を作り、属性、Style、イベント、子の表示を適用します。属性名が空の行は適用されません。同じ属性名・イベント名を複数登録すると、後ろの設定で上書きされます。複数のActionを自動で連結する動作ではありません。

属性の式が評価に失敗すると、その属性値はundefinedとして扱われ、開発モードでは警告が出ます。イベントActionの失敗はRuntimeのエラー表示につながります。Actionの失敗が、それ以前に行ったState更新のロールバックを保証するわけではありません。

## 最小例

```text
Main / Elements
└─ Tag: button
   ├─ Attributeタブ: event名 click
   │  └─ TypeScript Action: $state.count += 1;
   └─ Text: 固定値 +1
```

図のイベント設定はツリーの子要素ではなく、Tagのダイアログ内の項目です。MainのStatesにnumber型countを用意すれば、クリックで増やせます。

## 制約と注意点

- HTMLとしての適切な親子関係も確認してください。Mebacoの配置メニューが、HTMLのすべての意味的制約を検証するわけではありません。
- inputの値を属性へ設定することと、入力をStateへ書き戻すことは別です。イベントActionの設定を省略すると、双方向バインディングにはなりません。
- Ref・PartialとHTMLの `id` 属性は別の名前空間です。
- 「無効化」はRuntimeにその要素を出さない操作で、buttonのHTML属性 `disabled` とは異なります。

## 関連項目

- [Text](/reference/elements/text/)
- [State](/reference/elements/state/)
- [Component](/reference/elements/component/)
- [UIを組み立てる](/guides/build-ui/)
- [Styleを適用する](/guides/style-app/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="tag" />
