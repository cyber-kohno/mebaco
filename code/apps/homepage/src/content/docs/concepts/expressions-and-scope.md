---
title: 式とスコープ
description: 固定値・式・コードの違いと、配置場所ごとの値の見え方を説明します。
---

Mebacoの入力欄は、固定値・式・コードのいずれかを受け取ります。式は値を計算し、Actionは処理を実行します。入力モードと配置場所の両方で、使える参照名やStateの更新可否が決まります。

## 値を入力する3つの方法

| 方法 | 例 | 向いている場面 |
| --- | --- | --- |
| 固定値 | string欄に `こんにちは` | 変化しない文言や初期値 |
| 式 | `$props.title + 'さん'` | StateやPropsから表示値・入力値を計算 |
| コード | `$state.count += 1;` | イベントに応じた更新、複数の処理 |

固定値欄では、型に合わせて入力した文字列を値へ変換します。式欄ではTypeScriptの式として書くので、文字列リテラルには引用符を付けます。Stateを更新する処理を表示式へ書くのではなく、イベントActionに置きます。

## スコープとは

スコープは、ある式から利用できる名前と値の範囲です。同じ `$var` でも、Retention、Function、Loop、Promiseのどこに置かれたかで見える変数が異なります。

| 参照 | 値が決まる範囲 |
| --- | --- |
| `$state` | 所属AppとComponent、呼出し元から引き継いだState |
| `$props` | 現在表示中のComponentまたはSlotが受け取ったProps |
| `$var` | Retentionで宣言済みのVariableや、Loop / Promise分岐で導入される値 |
| `$launch` | 所属Appの起動引数 |
| `$const` | 可視なConstant宣言 |
| `$fn` | 可視範囲のMebaco Function |
| `$args` | 現在のFunctionのArguments |
| `$param`, `$local` | Style内のParameterとローカルVariable |

ResourceやStorage、Event、App遷移などの参照もありますが、利用はAction / CodeやImportなどの条件に左右されます。詳細と例は[式・コードリファレンス](/reference/expressions/)を参照してください。

## 順序と子スコープ

RetentionのVariableは宣言順に見えるようになります。先に宣言した値は後続の式で使えます。Blockだけでは別スコープにならず、その中のVariableも同じ逐次評価の範囲へ加わります。

LoopのItem・Index、PromiseのThenの結果、Catchのエラー値は、その分岐の内側で使います。別の分岐や後続の外側へ同じ名前があるとは限りません。要素を移動したら補完と診断を確認してください。

```text
Retention
├─ Variable: captionText = $props.title + 'の内容'
└─ Elements
   └─ Text: $var.captionText
```

## 型検査とRuntime

StudioはProjectの型定義・参照スコープ・入力欄の期待型から、式エディターの補完や診断を作ります。Runtimeは式を実行する前にTypeScriptの構文変換を行いますが、その変換が型検査の代わりになるわけではありません。実行時にも検査する値や、失敗時の動作は各要素によって異なります。

Retentionでは描画の再評価時にVariableなどを解決します。描画・RetentionのStateは読み取り用です。クリックへの応答のようにStateを書き換える処理は、対応するActionへ置きます。

## 次に読む

- [式・コード](/reference/expressions/): 参照名、入力欄ごとの注意、診断とRuntime。
- [型システム](/reference/types/): Value Type、配列、Object・Union・Signature Type。
- [Retention](/reference/elements/retention/): 宣言順と描画評価。
- [State](/reference/elements/state/): Stateの初期化・更新・寿命。
- [Componentを再利用する](/guides/reuse-components/): PropsとSlotのスコープを試す。
