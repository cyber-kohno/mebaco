---
title: Styleを適用する
description: Style、Parameter、継承、状態別ルールで見た目を再利用します。
---

StyleはCSS値をProject内で再利用する仕組みです。まず通常の宣言を適用し、必要になったら状態別宣言・Parameter・継承・Animationを足します。

## 1. Styleを作る

ProjectのCommon > Declares > StylesからStyleを追加し、Idを決めます。CategoryはStyle一覧を整理する任意のラベルで、CSSクラス名ではありません。

PropertiesにCSSプロパティと値を追加します。値は固定文字列か式です。最初は固定値で表示を確かめると切り分けが簡単です。

```css
padding: 12px
background-color: #2563eb
color: white
```

## 2. Tagに適用する

画面のTagを選び、Stylesで作成したStyleを選択します。Previewで見た目を確認します。Styleは定義しただけでは画面に反映されません。

複数Styleを適用した場合、同じCSSプロパティは解決順や状態によって上書きされます。大きな共通Styleと画面固有Styleを分け、重複宣言を意識しておきます。

## 3. 値をParameterにする

複数のTagで値だけ変えたい場合、Style ParametersにParameterを追加し、Propertiesの式から`$param.<id>`で参照します。適用するTag側で値をBindingします。String、Number、Boolean、Color型を使えます。

```ts
$param.surface
```

式欄の期待型とColorの入力形式はStudioのフィールド診断を確認してください。Styleに必須Parameterが増えると、既存の適用箇所もBindingの見直しが必要です。

## 4. Base Styleで共通化する

StyleのInheritanceでBase Styleを追加すると、基底の宣言を再利用できます。引数を直接渡すか、公開ParameterとしてTag側へ委譲します。Style MonitorでResolved Styleとエラーを確認してください。

循環継承、存在しないStyle参照、同じ公開Parameterの競合は解決エラーになります。小さな単方向の継承から始めます。

## 5. 状態とAnimationを加える

hover、focus、focus-visible、checked、active、disabledの状態別Propertiesを設定できます。Style KeyframesをLocalsに作り、Animationsから再生条件とAnimation設定を結びます。状態別ルールとAnimationを同時に使う場合は、Previewで各状態と解除後の見た目を確認します。

KeyframesはそのStyleのローカルスコープに属します。CSS値の診断は全ブラウザー構文を保証するものではありません。

## 関連リファレンス

- [Style](/reference/elements/style/)、[Style Parameters](/reference/elements/style-params/)、[Style Parameter](/reference/elements/style-param/)
- [Style Locals](/reference/elements/style-locals/)、[Style Keyframes](/reference/elements/style-keyframes/)、[Tag](/reference/elements/tag/)
