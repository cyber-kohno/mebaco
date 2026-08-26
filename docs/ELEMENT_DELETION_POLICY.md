# 要素削除ポリシー

## 1. 目的

要素の削除によって、別要素の編集フォームを保存できない構造的不整合を発生させない。

一方で、式はコードとして一時的な不整合を許容し、検証エラーとして明示できるようにする。これにより、安全性を維持しながら、リファクタリング時の編集順を過度に制限しない。

## 2. 基本方針

- 削除のデフォルト動作は、参照を考慮せず対象要素を削除する。
- 参照を考慮する対象は、マスタ要素のKindごとに個別に決定する。
- 参照収集、削除判定、通知、確認、削除後の検証は共通基盤に集約する。
- 各要素の個別実装は、利用する削除ポリシーの指定に限定する。
- 削除対象の配下にある参照元は対象要素と同時に消えるため、削除制限や再検証の対象に含めない。

## 3. 参照の分類

### 3.1 構造参照（Structural Reference）

UUIDが要素プロパティに格納される参照。

例：

- Entryの`componentId`
- component-useの`componentId`
- Launcherの`appId`
- slot-use、slot-contentの`slotId`
- 型定義を参照するtype ID
- Prop、Launch Argument、Style Parameterを参照するUUID

参照先を削除すると、参照元フォームの現在値が候補に存在しなくなり、フォームを保存できない状態が発生する。そのため、構造参照を保護対象としたマスタは、参照が残っている間は削除を禁止する。

削除時に参照元を自動的に`null`へ変更したり、別の候補へ置き換えたりしない。参照の解除は利用者が明示的に行う。

### 3.2 式参照（Expression Reference）

式またはAction内からIDを使って参照するもの。

例：

- `$state.data`
- `$var.index`
- `$function.save()`
- `$args.value`
- `$launch.environment`
- `$props.title`
- `$param.color`
- `$system.transition('app-id', args)`

式参照を保護対象としたマスタは、参照がある場合に確認ダイアログを表示する。利用者は削除を中止するか、強行削除を選択できる。

強行削除後は、削除後も残る式参照元要素だけを自動Verifyし、参照切れを検証エラーとしてツリーへ反映する。

## 4. 削除フロー

```text
Delete
  ├─ 保護対象の構造参照が存在する
  │    ├─ エラーダイアログを表示
  │    └─ 削除しない
  │
  ├─ 保護対象の式参照だけが存在する
  │    ├─ 確認ダイアログを表示
  │    ├─ Cancel: 削除しない
  │    └─ Delete anyway: 削除後に参照元を自動Verify
  │
  └─ 保護対象の参照が存在しない
       └─ 即時削除
```

構造参照と式参照の両方が存在する場合は、構造参照による削除禁止を優先する。強行削除は選択できない。

件数は参照の出現回数ではなく、削除後も残る参照元要素数で数える。同じ要素の複数フィールドや、同じ式内で複数回参照されていても1要素として扱う。

## 5. Reference Graphとの関係

削除判定はReference Graphの解析結果を利用する。

参照を検出した時点で、参照結果に次の種別を保持する。

```ts
type ReferenceSourceType = 'structural' | 'expression'
```

表示ラベルやフィールド名から参照種別を推測しない。Reference Graphの画面表示、IDリファクタリング、削除判定で同じ解析結果を共有する。

## 6. 要素ごとのポリシー

削除ポリシーが未指定の要素は、従来どおり参照を考慮せず削除する。

概念上、マスタKindごとに次の方針を指定できるものとする。

```ts
type ReferenceDeleteBehavior = 'ignore' | 'block' | 'confirm'

type ElementDeletePolicy = {
  structuralReferences?: ReferenceDeleteBehavior
  expressionReferences?: ReferenceDeleteBehavior
}
```

実際に有効化するポリシーは、各マスタ要素の仕様を確認してから1要素ずつ追加する。

## 7. Componentの初期仕様

Component定義の削除は、次のポリシーとする。

```ts
{
  structuralReferences: 'block',
  expressionReferences: 'ignore',
}
```

- Entryまたはcomponent-useなどからUUID参照されている場合は削除しない。
- エラーダイアログに参照元要素数とnode IDを表示する。
- 参照を解除した後は通常どおり削除できる。
- Component IDを利用する式参照は現行仕様に存在しないため、式参照の確認処理は適用しない。

## 8. 将来拡張

- 式参照の強行削除と自動Verify
- エラーダイアログからReference Graphを開く導線
- 参照元nodeへの移動
- プロジェクト全体の静的検証との統合
- 対象Kindごとの削除ポリシー追加

これらは共通基盤を拡張して対応し、個別要素へ参照解析や検証処理を重複実装しない。
