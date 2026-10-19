---
title: Componentを再利用する
description: PropsやSlotを使ってComponentを定義し、複数の場所で利用します。
---

同じPanelを2つ表示し、見出しはProps、本文はSlotで変える例を作ります。その後、Retentionで計算した値を差し込み内容へ渡します。

## 準備

[最初のProject](/start/first-project/)の追加・式入力・Preview操作を理解していることを前提にします。既存のProjectを保存してから新しいProjectを作り、Id `reuse-demo` のAppを追加してください。Main Componentの自動生成では「はい」を選びます。

以下のMainとPanelは、どちらも `reuse-demo / Declares / Components` の下に置きます。EntryはMainのままにします。

## 1. Panelの定義と入力を作る

1. Componentsを右クリックし、`Add component` を選びます。Idに `Panel` を入力して作成します。
2. `Panel / Props` を右クリックし、`Add value prop` を選びます。
3. Idを `title`、Value Typeを `string` にします。`Use Default Value` はオフのままにして作成します。titleは呼出側で必ず指定する入力になります。
4. `Panel / Elements` へ `Add view → Tag` で `h2` を追加します。
5. そのh2の子に `Add view → Text content` を追加し、式モードにして次を入力・確定します。

```ts
$props.title
```

ここまででは定義を作っただけなので、Mainの画面にはまだ表示されません。

## 2. Mainから同じPanelを2回使う

1. `Main / Elements` を右クリックし、`Add view → Component` を選びます。
2. `Create Component View` のComponentでPanelを選びます。
3. Props欄のtitleに、固定値モードで `1つ目のパネル` と入力して作成します。引用符は付けません。
4. MainのElementsへもう1つComponent Viewを追加します。同じPanelを選び、titleの固定値を `2つ目のパネル` にして作成します。
5. Appのreuse-demoを選び、`T → run → Enter` でPreviewを開きます。

「1つ目のパネル」「2つ目のパネル」の見出しが表示されれば成功です。Panel内の見出しTagを変えると両方へ反映されますが、渡したtitleは各使用箇所に保存されます。

## 3. 本文をSlotで差し込む

Previewを閉じてから操作します。

### 定義側に名前と表示位置を用意する

1. Panelを右クリックして `Use slots` を選びます。
2. 作られた `Panel / Slots` を右クリックし、`Add slot` を選びます。Idを `body` にして作成します。bodyのPropsは、この段階では空のままです。
3. `Panel / Elements` を右クリックし、`Add view → Slot content` を選びます。
4. `Create Slot Content` のSlotでbodyを選んで作成します。

:::caution[この例の配置]
表示位置のSlot Useは、PanelのElements直下でh2と並べます。現行ソースには、Tagや制御要素の内側へSlot情報が引き継がれない経路があります。h2やdivの子に入れないでください。[配置制約](/reference/elements/slot-use/#制約と注意点)も参照してください。
:::

### 呼出側でそれぞれの本文を作る

1. Mainに置いた1つ目のPanel使用要素を右クリックして `Refresh slots` を選びます。
2. 使用要素の下に表示される `Slots / body` を展開します。
3. bodyを右クリックして `Add view → Text content` を選び、固定値 `こちらは最初のパネルの本文です。` を入力して作成します。
4. 2つ目のPanel使用要素でもRefresh slotsを実行します。そのbodyには固定値 `こちらは別の本文です。` のTextを追加します。
5. 再びPreviewを開き、各見出しの後に異なる本文が表示されることを確認します。

```text
Panelの定義                         Mainで使う場所
├─ Props / title                    ├─ Component Use: Panel
├─ Slots / body                     │  ├─ Props欄 title: 1つ目のパネル
└─ Elements                         │  └─ Slots / body / Text: 最初の本文
   ├─ h2 / Text: $props.title       └─ Component Use: Panel
   └─ Slot Use: body                   ├─ Props欄 title: 2つ目のパネル
                                      └─ Slots / body / Text: 別の本文
```

定義側のbodyは「領域の契約」、Slot Useは「表示位置」、使用箇所側のbodyは「実際の内容」です。画面上では似た名前でも別の要素です。

## 4. Retentionで計算した値をSlotへ渡す

Slotは表示内容だけでなく、その内容が使う値も受け渡せます。ここではtitleから作った説明を、captionというSlot Propで渡します。Previewを閉じて操作します。

1. `Panel / Slots / body / Props` に `Add value prop` でId `caption`、Value Type `string` の項目を作ります。Use Default Valueはオフのままです。
2. `Panel / Retention` を右クリックし、`Add declare → Variable` を選びます。
3. Idを `captionText` にします。MutableとSpecify Value Typeはオフのままにし、Initialの式エディターで次を入力して作成します。

```ts
$props.title + 'の内容'
```

4. `Panel / Elements` のbodyを表示するSlot Useを右クリックして `Modify` を選びます。
5. Props欄のcaptionを式モードに切り替え、次を入力して「更新」で確定します。

```ts
$var.captionText
```

6. Mainの1つ目のPanel使用箇所の `Slots / body` にあるTextをModifyします。固定値から式モードへ切り替え、次を入力して更新します。2つ目の本文も同じ式に変更します。

```ts
$props.caption
```

7. Previewで、それぞれの本文が「1つ目のパネルの内容」「2つ目のパネルの内容」になることを確認します。

ここでの `$props.caption` はSlotから渡された値です。呼出側MainのPropsや、Panel本体のtitleを直接読む式ではありません。

:::note[Retentionを挟む理由]
現行Runtimeでは、Propsの割当て式内の `$props` は「今、受取側へ解決している値」です。Slotへの割当て欄に直接 `$props.title` と書くと、Panelのtitleを読むことにはなりません。Retentionの表示準備でtitleを `$var.captionText` へ取り出してから渡します。
:::

## 5. ローカルStateが別になることを試す

発展例です。Panel自身がクリック回数を持つようにします。

1. `Panel / Store / States` にnumber型のState `localCount` を作り、InitialをSet Valueの固定値 `0` にします。
2. PanelのElementsにpのTagと子Textを追加し、Textを式 `String($state.localCount)` にします。
3. PanelのElementsにbuttonのTagを追加し、子Textを固定値 `+1` にします。
4. buttonのAttributeタブにclickイベントを追加し、TypeScript Actionに次を書きます。

```ts
$state.localCount += 1;
```

Previewで最初のPanelのボタンだけを押し、最初の数値だけが増えることを確認します。同じ定義でも、各使用インスタンスのローカルStateは別です。Previewを閉じて起動し直すと両方とも0に戻ります。

## 保存と変更時の注意

Previewを閉じ、保存してProjectを残します。初回は `reuse-demo.mbc` など、新しいファイル名を指定してください。

Propsの定義変更後は各使用箇所の割当てを確認します。Slotの追加後はRefresh slotsを使いますが、削除されたSlotや参照先切替で一致しないSlotの内容は同期時に取り除かれます。変更前に保存・バックアップしてください。

## うまくいかないとき

| 状況 | 確認すること |
| --- | --- |
| Panelが候補にない | 同じAppまたはCommonに定義したか。Main→Panel→Mainなどの循環を作っていないか |
| title未指定のエラー | 各Component UseのProps欄でtitleを入力・確定したか |
| Slot contentの追加項目がない | PanelでUse slotsとbodyの定義を済ませ、PanelのElementsを右クリックしているか |
| 使用箇所にbodyがない | 各Component UseでRefresh slotsを実行したか |
| 本文が表示されない | PanelのSlot UseがElements直下にあるか。Main側のSlots / bodyへ内容を入れたか |
| captionがundefined、またはエラー | PanelのRetention変数、Slot Useのcaption割当て、Main側Textの式を順に確認する |
| RetentionでStateを更新できない | 描画準備は読み取り用。クリック処理はbuttonのイベントActionに置く |

## 関連する仕様

- [Props](/reference/elements/props/) / [Value Prop](/reference/elements/value-prop/)
- [Component Use](/reference/elements/component-use/)
- [Slots](/reference/elements/slots/) / [Slot](/reference/elements/slot/)
- [Slot Use](/reference/elements/slot-use/) / [Slot Content](/reference/elements/slot-content/)
- [Retention](/reference/elements/retention/)
