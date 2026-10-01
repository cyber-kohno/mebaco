---
title: 式・コード
description: 固定値と式の違い、式の評価、スコープ、Actionとの使い分けを説明します。
---

## まず区別するもの

入力欄では、同じ文字列でも意味が異なります。入力時のモードや要素の設定で解釈が決まります。

| 入力 | 例 | 意味 |
| --- | --- | --- |
| 固定値 | `hello`、`12` | 型に応じて、入力した文字を値へ変換して保存 |
| 式 | `$state.count + 1` | TypeScriptの式として実行し、計算結果を使う |
| コード | `$state.count += 1;` | Actionなどの文として実行。値を返す式とは入力方法が異なる |
| 定義参照 | ObjectやFunctionの選択 | 既存定義の内部識別子を指定 |

文字列欄の引用符もモードに依存します。PropsやStateの固定値欄へ `hello` と入力する場合、通常は引用符を付けません。式欄で文字列リテラルを書くときは `$props.title + '!'` のように引用符が必要です。

## 式の書き方

式は値を返すTypeScript式です。演算、条件演算子、配列・Objectの生成、テンプレート文字列、参照値の呼び出しなどを使用できます。

```ts
String($state.count)
```

```ts
$state.items.filter((item) => item.active).length
```

```ts
`${$props.title}: ${$state.count}`
```

式欄に複数文を書くActionとは異なります。処理を順に実行したい場合やStateを書き換えたい場合はイベントActionなどを使います。

## 主な参照名

利用できる参照は式を置く場所で変わります。以下は主な役割です。すべての式で全てが使えるわけではなく、エディターの補完と実行時の利用可否も個別に確認してください。

| 名前 | 主な用途 | スコープ・注意 |
| --- | --- | --- |
| `$state` | App / ComponentのState | 所属先やComponent呼出しから見えるState。描画・Retentionでは読み取り用、イベントActionでは更新可能 |
| `$props` | Component / Slotへの入力 | 受取側のValue Prop。Props割当て式の中では、順番に解決中の受取側Propsを指す |
| `$var` | Retentionや手続きのVariable | Retentionの表示準備、Function、Promise、Loopなど、宣言とその子の範囲で利用 |
| `$launch` | App起動時の引数 | Appに定義したLaunch Argument。起動側から渡される値 |
| `$const` | 定数 | 可視なConstant宣言。設定された式の結果を参照 |
| `$fn` | Mebaco Function | 可視範囲にあるFunctionを呼び出す名前空間 |
| `$args` | Functionの引数 | Function Procedure内で、そのFunctionに定義した引数を読む |
| `$param` | Style Parameter | Styleの適用先で解決されたStyle Parameter |
| `$local` | Style内のVariable | Styleのルール・条件などから参照するローカルVariable |
| `$resource` / `$storage` | 外部データ機能 | Action / Codeの文脈やAppのImport設定などに依存 |
| `$event` | UIイベント | イベントActionでイベント値を参照 |
| `$transition` | App遷移 | 対応するActionで、Import済みAppへの遷移を要求 |
| `$system` | Runtimeの操作 | Ref取得など。利用できるメソッドは場所により異なる |
| `$log` / `$effect` | ログ / Effectの中断通知 | 利用可能な処理や型は置き場所・実行文脈に依存 |

Loop内ではItemとIndexのVariable、PromiseのThenでは解決値が `$var` に追加されます。RetentionのVariableは宣言後の要素へ順に見えるようになります。見える名前はStudioの式エディターで確認してください。

## よく使う場所と副作用

| 置き場所 | 目的 | State更新 / 非同期 |
| --- | --- | --- |
| Text・属性・Props割当て | 表示値や入力値を計算 | Stateは読み取り用。非同期式かどうかは欄ごとの設定に依存 |
| State Initial | 初期値を一度作る | 初期化時に評価。Propsは渡されない |
| Retention Variable / Action | 描画領域の値や処理を準備 | Stateは読み取り用。再評価され得るため、イベントごとの処理には使わない |
| イベント Action | クリックなどの応答 | State更新に使う。欄が許可する場合は非同期処理も利用可能 |
| Effect | 状態などに反応する処理 | Effectの実行契約とAbort Signalに従う |
| Function | 再利用する計算や処理 | 宣言の同期・非同期設定と戻り値型に従う |

画面を描画するための式を、クリック時に一度だけ実行する処理として使わないでください。反対に、値を表示する欄へ代入文を書くこともできません。

## エディター検証とRuntime

式エディターはStudioのProject情報から、現在のスコープにある名前と型をTypeScriptの宣言として構成します。構文・参照名・期待型の不一致を入力中に診断したり、補完候補を表示したりします。

Runtimeでは保存された式をTypeScriptでJavaScriptへ変換して実行します。この変換だけで式の型安全性が保証されるわけではありません。各要素が実行時に検証する値、エラー時の処理はそれぞれ異なります。たとえばPropsの値は型適合性を検証しますが、一般のState代入すべてに同じ検証があるとは限りません。

非同期の式やActionは、欄の設定によって `await` を含められるかが変わります。コード欄の種類だけから、いつでも `await` が使えるとは判断しないでください。

## 失敗時に確認すること

1. 入力欄が固定値・式・コードのどのモードか確認します。
2. 参照先の名前、型、配置場所を確認します。特に `$props` は受取側の契約です。
3. 期待型を返しているか確認します。数値を文字列表示する場合は `String(value)` のように変換します。
4. 描画準備の式でStateを更新していないか確認します。
5. Previewで表示されるRuntimeエラーを確認します。エディター診断が出ないことはRuntime成功の保証ではありません。

## 関連項目

- [式とスコープの概念](/concepts/expressions-and-scope/)
- [型システム](/reference/types/)
- [State](/reference/elements/state/)
- [PropsとValue Prop](/reference/elements/props/)
- [Retention](/reference/elements/retention/)
- [Componentを再利用する](/guides/reuse-components/)
