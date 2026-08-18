# RetentionにおけるState更新検出の設計メモ

更新日: 2026-08-18

ステータス: 将来検討（未実装）

## 目的

Retention内のActionはViewの評価・描画に伴って繰り返し実行される。そのため、Retention ActionからStateを更新すると、次のような再評価ループが発生する可能性がある。

```text
Retention Action
  -> State更新
  -> ランタイム再描画
  -> Retention再評価
  -> Retention Action再実行
```

将来的にはFunction要素とProcedure要素が実装される予定である。ProcedureはRetentionと同様にVariableやActionを持ち、Function／Procedureの呼び出しを何段か経由した先でStateが更新される可能性がある。

本資料は、Retentionから直接または間接的にStateの書き込みが試みられた場合に、書き込みを適用せず、明確なランタイムエラーとして検出するための設計方針を残すものである。

## 要求仕様

- Retention ActionではStateの読み取りを許可する。
- Retention ActionからのState書き込みは、書き込みを適用する前にランタイムエラーにする。
- FunctionやProcedureを経由した間接的な書き込みも検出する。
- `$var`などへStateオブジェクトの参照を格納した場合も検出する。
- Event Actionなど、State更新が許可された実行コンテキストでは従来どおり更新できる。
- 呼び出し先のFunction／Procedureが、呼び出し元より強いState権限を取得できないようにする。
- ComponentローカルStateと親Stateのどちらにも同じ規則を適用する。
- エラーは書き込み元のRetention Actionノードへ関連付ける。
- Monaco上の静的診断は補助とし、ランタイム検出を最終的な判定とする。

## 現状のランタイム

調査時点の関連実装は次のとおり。

- `RuntimeState.createState()`が生成するApp Stateのルートは通常のObjectである。
- `RuntimeState.createComponentState()`は、親StateとローカルStateを重ねるためにルートだけをProxy化している。
- State内のObjectやArrayは深いProxyではない。
- `RetentionResolver`はRetention内のActionを`ActionEvaluator.executeScript()`で直接実行する。
- `ActionEvaluator`はAction内で発生した例外をランタイムエラーへ変換できる。
- `RetentionResolver`はエラーが発生したActionのノードIDを返せる。
- Scriptは`FormulaContext`を引数として実行されるため、Function／Procedureも同様のコンテキスト引数方式へ拡張できる。

関連ファイル:

- `apps/studio/src/system/runtime/runtime-state.ts`
- `apps/studio/src/system/runtime/retention/retention-resolver.ts`
- `apps/studio/src/system/runtime/action/action-evaluator.ts`
- `apps/studio/src/system/runtime/formula/formula-context.ts`
- `apps/studio/src/system/runtime/script/script-compiler.ts`

## 検出対象

少なくとも以下の書き込み操作を検出する。

```ts
$state.count = 1
$state.count += 1
$state.data.count += 1
$state.items.push(item)
$state.items.splice(0, 1)
$state.items.sort(compare)
delete $state.data.value
Object.assign($state.data, value)
Object.defineProperty($state.data, 'value', descriptor)
```

値が実際に変わったかではなく、書き込み操作が試みられたかで判定する。

```ts
$state.count = $state.count
```

上記もRetention Actionではエラーにする。結果を比較する方式では、書き込み後のロールバック、参照同一性、途中まで実行されたArray操作などが問題になるためである。

## 単純なReadonly Proxyだけでは不十分な理由

Retention Actionへ渡す`$state`だけを一時的なReadonly Proxyにすると、直接書き込みは検出できる。

しかし、次のようにStateオブジェクトが別名参照されている場合、元のObjectを保持しているとProxyを迂回できる。

```ts
// Retention Variable
const data = $state.data

// Retention Action
$var.data.count += 1
```

Function定義時に書き込み可能な`$state`をクロージャとして固定する設計も、RetentionからそのFunctionを呼ぶことで権限を迂回できる。

したがって、構文や変数名ではなく、Stateへの参照そのものと実行コンテキストの権限を管理する必要がある。

## 推奨アーキテクチャ

### 1. State本体を外部へ公開しない

ランタイム内部にState Storeを保持し、ユーザーコードへは必ずState Viewを渡す。

```ts
type StateAccessPolicy = {
  canWrite: boolean
  origin: ExecutionOrigin
}

type ExecutionOrigin =
  | { type: 'retention'; nodeId: number }
  | { type: 'event'; nodeId: number }
  | { type: 'function'; functionId: string }
  | { type: 'procedure'; procedureId: string }
```

State ViewはState Storeへアクセスする深いProxyで、書き込み権限とエラー報告元を保持する。

```ts
const retentionState = createStateView(stateStore, {
  canWrite: false,
  origin: { type: 'retention', nodeId },
})
```

### 2. 深いProxyで書き込みを遮断する

Object／Arrayを取得した場合も、同じPolicyを持つProxyを返す。循環参照と参照同一性を扱うため、`WeakMap`で元ObjectとProxyの対応をキャッシュする。

検討するProxy trap:

- `get`
- `set`
- `deleteProperty`
- `defineProperty`
- `setPrototypeOf`

Arrayの`push()`や`splice()`は内部的に`set`や`deleteProperty`へ到達するため、書き込み前に例外を発生させられる。

### 3. 権限を呼び出し先へ継承する

Function／Procedureは定義時のコンテキストを固定せず、呼び出し時のExecution Contextを受け取って実行する。

```ts
invokeFunction(functionId, callerContext, args)
invokeProcedure(procedureId, callerContext, args)
```

呼び出し先の有効権限は、呼び出し元と呼び出し先自身の制約の積集合にする。

```text
effectiveCanWrite = callerCanWrite && calleeAllowsWrite
```

呼び出し先から権限を昇格させてはならない。

| 呼び出し元 | 呼び出し先 | State更新 |
|---|---|---|
| Retention | Function | 禁止 |
| Retention | Procedure | 禁止 |
| Event Action | Pure Function | 禁止 |
| Event Action | State更新可能Procedure | 許可 |
| Procedure | Function／Procedure | 呼び出し元権限を継承 |

次のような多段呼び出しでもRetentionの書き込み禁止権限を維持する。

```text
Retention Action
  -> Function A
    -> Function B
      -> Procedure C
        -> State書き込み（ここでエラー）
```

### 4. State由来の別名参照を再バインドする

State Viewから得たObjectを`$var`、Function引数、戻り値、Procedure変数などへ渡しても、生のState Storeを露出させない。

実行コンテキストの境界を越える際は、State由来の参照を識別し、現在のPolicyを持つViewとして再バインドする。

書き込み可能なEvent Actionで取得したState Viewを永続変数へ保存し、後からRetentionで再利用することで権限を迂回できないようにする必要がある。

### 5. 遅延実行にもPolicyを引き継ぐ

グローバルな「現在Retention実行中」というフラグだけで管理すると、非同期コールバックがRetention終了後に実行された場合に検出を逃れる。

```ts
setTimeout(() => {
  $state.count += 1
}, 100)
```

State View自体がPolicyを保持する方式なら、コールバックが保持する`$state`は後から実行されても書き込み禁止のままになる。

Mebacoが提供するScheduler APIでは、予約時のExecution Contextを明示的に保存して復元する。

```ts
$system.schedule(() => {
  // 予約元と同じState権限で実行
})
```

Function／Procedureの初期仕様を同期実行に限定する場合でも、将来の非同期対応を阻害しない形でPolicyをコンテキストへ含める。

## FunctionとProcedureの副作用分類

将来的に、Function／Procedureへ副作用情報を持たせることを検討できる。

```ts
type FunctionEffect =
  | 'pure'
  | 'read-state'
  | 'write-state'
```

既知の`write-state` FunctionをRetentionから呼ぶ場合、Monacoや要素検証で事前に警告できる。

ただし、次のように実行時条件によってのみ書き込むFunctionがあるため、静的分類だけを最終判定にしない。

```ts
if ($args.shouldUpdate) {
  $state.count += 1
}
```

実際に書き込みが試みられた時点でState Viewが判定する方式を必須とする。

## エラー仕様案

基本メッセージ:

```text
State '$state.count' cannot be updated while evaluating Retention.
```

Function／Procedureを経由した場合:

```text
State '$state.data.count' cannot be updated while evaluating Retention.
Called from function 'updateCount'.
```

エラー情報として保持したい項目:

- エラー種別（State mutation denied）
- Stateパス
- 書き込み操作
- 権限の起点となったRetention ActionノードID
- Function／Procedureの呼び出し経路
- Script上の行・列（取得可能な場合）

Proxyは`Reflect.set()`などを呼ぶ前に専用エラーをthrowする。`ActionEvaluator`が既存の仕組みでランタイムエラーへ変換し、`RetentionResolver`がActionノードIDとともに返す。

## Monacoによる補助診断

Retention ActionのMonacoでは、`$state`をDeepReadonlyとして宣言することで、単純な書き込みを編集時にも検出できる。

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]:
    T[K] extends object ? DeepReadonly<T[K]> : T[K]
}
```

ただし、型キャスト、動的アクセス、Function内部の副作用などでは静的検査を回避できるため、ランタイム検出の代替にはしない。

## 段階的な実装案

### Phase 1: 実行コンテキストの権限モデル

- `ExecutionContext`へState Access Policyを追加する。
- Event ActionとRetention Actionの起点でPolicyを設定する。
- 呼び出し先が権限を昇格できない規則を定義する。

### Phase 2: State StoreとState View

- State本体を内部Storeへ分離する。
- 深いProxyのState Viewを実装する。
- Object／Arrayの書き込み、削除、定義変更を検出する。
- Stateパスを保持した専用エラーを実装する。

### Phase 3: Retention Actionへの適用

- Retention Actionへ書き込み禁止Viewを渡す。
- Event Actionへ書き込み可能Viewを渡す。
- App State、Component State、親Stateへの委譲をテストする。

### Phase 4: Function／Procedureへの伝播

- Function／Procedureをコンテキスト引数方式で実行する。
- 呼び出し元Policyを継承する。
- 多段呼び出しと再帰呼び出しをテストする。
- `$var`、引数、戻り値を経由したState参照を再バインドする。

### Phase 5: 静的診断と非同期対応

- Retention Actionの`$state`をDeepReadonlyとしてMonacoへ注入する。
- Function Effect情報を検討する。
- Mebaco SchedulerへExecution Contextを引き継ぐ。
- 非同期Function／Procedureを許可する場合の規則を確定する。

## テスト観点

### 直接更新

- ルートStateへの代入を拒否する。
- 深いObjectへの代入を拒否する。
- Arrayの`push`、`splice`、`sort`を拒否する。
- `delete`、`Object.assign`、`Object.defineProperty`を拒否する。
- 同じ値の再代入も拒否する。
- エラー後にStateが変更されていないことを確認する。

### 間接更新

- `$var`に格納したState参照からの更新を拒否する。
- Function引数からの更新を拒否する。
- Function戻り値を経由した更新を拒否する。
- Procedureローカル変数を経由した更新を拒否する。
- Function／Procedureを複数段経由しても拒否する。

### 権限境界

- Event Actionからの更新は許可する。
- Event Actionから呼んだ更新可能Procedureは許可する。
- 同じProcedureをRetentionから呼んだ場合は拒否する。
- ComponentローカルStateから親Stateへの更新も同じ規則で判定する。
- 別Componentインスタンス間でPolicyやState Viewが混ざらないことを確認する。

### ライフサイクル／非同期

- 予約コールバックが元のPolicyを継承する。
- Retention由来のコールバックが後から実行されても更新を拒否する。
- Component破棄後に予約処理やState参照が残らないことを確認する。

## 制限と前提

現行のMebaco Stateは主に次の値で構成されるため、深いProxyによる監視と相性がよい。

- string
- number
- boolean
- Object
- Array
- Object Type
- Named Type

将来、`Date`、`Map`、`Set`、独自Class、外部ライブラリが管理するMutable ObjectをStateとして許可する場合は、Proxyの内部slotやメソッド呼び出しを含む追加設計が必要になる。

State Storeの生Objectを取得する`toRaw()`のようなAPIは、権限を迂回できるためユーザーScriptへ公開しない。

## 未決事項

- Functionを常にPureとするか、副作用レベルを選択可能にするか。
- Procedureを呼び出した時点で静的に拒否するか、実際の書き込み時だけエラーにするか。
- Function／Procedureの非同期実行を初期仕様から許可するか。
- State Viewを変数やState自身へ保存した場合の内部表現。
- Error UIにFunction／Procedureの呼び出し経路をどこまで表示するか。
- MonacoのDeepReadonly診断を警告にするかエラーにするか。
- Formula内のState書き込みも同じ仕組みで明示的に禁止するか。

## 設計上の結論

Retention ActionのSourceだけを解析する方式では、Function／Procedure、別名参照、動的呼び出しを十分に検出できない。

State本体を直接公開せず、実行コンテキストの権限を持つ深いState Viewを通してアクセスさせる方式を採用する。権限は呼び出し元から呼び出し先へ単調に制限され、Function／Procedureが権限を昇格できないようにする。

この下地をFunction／Procedure実装時に先に整備することで、Retentionからの直接・間接State更新を一貫したランタイムエラーとして高精度に検出できる。
