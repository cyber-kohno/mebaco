# Function 要素仕様書

## 1. 目的

Function 要素は、Mebaco のツリー上で再利用可能な処理を定義するための要素である。

Function は次の場所に定義できる。

- App の `Declares > Functions`
- Retention
- Function の `Procedure`

Function は UI 要素を描画するためのものではなく、値を返す処理または副作用を持つ処理を再利用するためのものである。

Front Driven の Function / Arguments / Procedure という構造を参考にするが、Mebaco では既存の Value Type、Variable、Action、Retention、Monaco の仕組みと統合する。

## 2. MVP の対象範囲

### 対象

- Function の定義
- Function ID
- async 指定
- 戻り値型
- Arguments と引数型
- Procedure 内の Variable
- Procedure 内の Action
- Procedure 内の Object / Union
- Procedure 内の Block
- Procedure 内のネストした Function
- Return 要素
- `$fn.<id>(...)` による呼び出し
- 位置引数
- オブジェクト型引数
- リテラルユニオン、オブジェクトユニオン、Nullable、配列
- Monaco の関数シグネチャ補完と型検証

### MVP では対象外

- 関数のオーバーロード
- デフォルト引数
- 可変長引数
- 名前付き引数
- ジェネリクス
- Function 自体を値として渡すこと
- State の関数ローカル定義
- Style の関数ローカル定義
- Component の関数ローカル定義
- 関数の再帰呼び出しに対する専用UI

オブジェクトを渡す場合も、特別な名前付き引数機構は設けず、通常の位置引数の値として渡す。

```ts
$fn.updateUser({
  id: 'user-1',
  name: 'Taro',
})
```

## 3. ツリー構造

### 3.1 App のグローバル Function

```text
App
  Declares
    Functions
      Function calculate
        Arguments
          Argument count: number
        Procedure
          Variable total
          Action
          Return
```

App の `Functions` 配下に定義した Function は、その App のスコープから参照できる。

### 3.2 Retention 内のローカル Function

```text
Retention
  Variable multiplier
  Function calculate
    Arguments
    Procedure
      Action
      Return
```

Retention 内の Function は、その Retention のスコープと、その子孫スコープからのみ参照できる。

### 3.3 ネストした Function

```text
Function outer
  Arguments
  Procedure
    Function inner
      Arguments
      Procedure
        Action
        Return
    Action
    Return
```

ネストした Function は、親 Function の Procedure と、その子孫スコープからのみ参照できる。

### 3.4 Function の自動生成要素

Function マスターの作成時に、次の2要素を自動生成する。

- Arguments
- Procedure

Return は Procedure のメニューから1つ追加する。Function の保存時には Return の存在を検証する。

## 4. 要素モデル

### 4.1 Function マスター

```ts
type FunctionElement = {
  kind: 'function'
  id: string
  async: boolean
  returnType: ValueTypeDefinition.Definition | null
}
```

#### `id`

- JavaScript 識別子
- 1〜32文字
- 同一 Function スコープ内で重複禁止
- `$fn.<id>` のプロパティ名として使用する

#### `async`

- Function の実行方式を決める
- `true` の場合、Procedure は非同期関数として実行される
- 呼び出し側の戻り値は `Promise<T>` になる
- async であることと、戻り値型 `T` は別の情報として保持する

#### `returnType`

- `null` は void Function を表す
- null 以外は Function が返す解決済みの値の型 `T` を表す
- async Function でも、ここには `Promise<T>` ではなく `T` を設定する

例：

```text
async: true
returnType: User
```

呼び出し時の型：

```ts
$fn.load(id): Promise<User>
```

### 4.2 Arguments 管理要素

```ts
type FunctionArgumentsElement = {
  kind: 'function-arguments'
}
```

Arguments は Function の引数を管理するフォルダである。

### 4.3 Argument 要素

```ts
type FunctionArgumentElement = {
  kind: 'function-argument'
  id: string
  valueType: TypeExpression.Expression
  nullable: boolean
}
```

Argument の型指定は State / Variable と同じ Value Type UI を使用する。

対応する型：

- string
- number
- boolean
- color
- literal union
- object
- object union
- named union
- reference
- array
- nullable

Argument の値は `$args.<id>` で参照する。

```ts
$args.count
$args.user.name
```

### 4.4 Procedure 管理要素

```ts
type FunctionProcedureElement = {
  kind: 'function-procedure'
}
```

Procedure は Function 専用のローカルスコープである。

Procedure に追加できる要素：

- Variable
- Function
- Object
- Union
- Action
- Block
- Return

Procedure に追加できない要素：

- State
- Component
- Style

State は永続的なアプリ／コンポーネント状態であり、Function のローカル変数とは責務が異なるため、MVP では禁止する。

Component と Style は UI 定義の要素であり、Function の処理スコープには含めない。

### 4.5 Return 要素

```ts
type FunctionReturnElement = {
  kind: 'function-return'
  source: string
}
```

Return は Function の戻り値を定義する専用要素である。

制約：

- Function ごとに最大1つ
- Procedure 直下にのみ配置可能
- Procedure の末尾に固定する
- Return より後ろに Action、Variable、Function などを追加できない
- Function の保存時に必須
- 戻り値型がある場合、式は必須
- void Function の場合、式は空を許容する

例：

```text
Procedure
  Variable total
  Action
  Return total
```

Action のソースコード内に `return` を書くことは禁止する。処理の終了地点と戻り値は、常にツリー上の Return 要素で表現する。

## 5. Function の呼び出し

Function は `$fn` 名前空間のプロパティとして呼び出す。

```ts
$fn.calculate(2)
```

Function ID が `exec` の場合は、次の記述になる。

```ts
$fn.exec()
```

汎用的な `$fn.exec(name, args)` 形式は採用しない。Function ID を静的なプロパティとして扱うことで、Monaco の補完・引数チェック・戻り値型推論を利用する。

### 5.1 引数の渡し方

MVP では位置引数を使用する。

```ts
$fn.calculate(2, 'normal')
```

オブジェクト型も位置引数の値として渡せる。

```ts
$fn.updateUser({
  id: 'user-1',
  name: 'Taro',
})
```

### 5.2 可視性

Function の可視性はレキシカルスコープで解決する。

- Global Function：App 内の全スコープから参照可能
- Retention Function：定義した Retention と子孫スコープから参照可能
- Nested Function：定義した Procedure と子孫スコープから参照可能
- 同じ ID が親子スコープにある場合は、子スコープを優先する
- 同一スコープ内の同じ Function ID はエラー

## 6. 名前空間とスコープ

Function 実行時の名前空間は次のように分ける。

| 名前空間 | 用途 | 解決ルール |
|---|---|---|
| `$state` | App / Component の状態 | 実行時コンテキスト |
| `$props` | Component の Props | 実行時コンテキスト |
| `$args` | Function 引数 | Function 呼び出しごとのローカル |
| `$var` | Variable | Function / Retention のレキシカルスコープ |
| `$fn` | Function | Function / Retention のレキシカルスコープ |
| `$system` | ランタイムAPI | 実行時コンテキスト |
| `$event` | イベント情報 | イベント実行時のみ |

Function は呼び出し元のローカル `$var` をそのまま引き継がない。

- `$state`、`$props`、`$system`、`$event` は呼び出しコンテキストを利用する
- `$args` は呼び出しごとに新規作成する
- `$var` は Function の定義スコープを親にする
- `$fn` は Function の定義スコープを親にする

これにより、呼び出し元の一時変数が Function 内へ意図せず漏れることを防ぐ。

Argument ID と Variable ID は別名前空間であるため、次は許可する。

```text
Argument: count
Variable: count
```

参照方法が `$args.count` と `$var.count` で異なるためである。

## 7. 実行モデル

Function は RetentionResolver の Action 逐次実行をそのまま流用しない。

専用の FunctionRunner を使用する。

```text
FunctionRunner
  1. Function 定義を解決
  2. 引数の個数・型を検証
  3. Function 用の $args / $var / $fn フレームを作成
  4. Procedure の Variable を順番に初期化
  5. Procedure の Action を順番に実行
  6. Return 式を評価
  7. 戻り値型を検証
  8. async Function なら Promise として返す
```

Return がツリー要素として独立しているため、Action のソースコード内の `return` を解析する必要はない。

### 7.1 Action の実行

Action は Procedure 内で上から順番に実行する。

Action のソースには処理だけを書く。

```ts
$var.total = $args.count * 2
```

Action 内の `return` はコンパイルエラーとする。

### 7.2 Return の実行

Procedure 内の Action がすべて完了した後、Return の式を評価する。

```ts
$var.total
```

戻り値型が設定されている場合は `TypeValue.isCompatible` 相当の検証を行う。

### 7.3 Function の状態

Function のローカル `$args` と `$var` は呼び出しごとに新規作成する。

複数回または同時に呼び出しても、ローカル変数が共有されてはならない。

一方、`$state` は既存の State runtime を利用するため、Function から State を更新した場合は通常の State 更新として扱う。

## 8. async

Function マスターの `async` が `true` の場合、Procedure は非同期で実行する。

### 8.1 await

async Function 内の Action と Return の式では `await` を許可する。

```ts
const user = await $fn.loadUser($args.id)
$var.name = user.name
```

通常の Function の Action / Return では `await` を Monaco とコンパイラの両方で禁止する。

### 8.2 呼び出し結果

```text
async: false, returnType: number
  => (args) => number

async: true, returnType: number
  => (args) => Promise<number>
```

async Function の returnType は解決後の値の型であり、Promise を Value Type として指定しない。

### 8.3 エラー

- async Function の実行中に発生したエラーは rejected Promise とする
- 呼び出し側で `await` しない場合、呼び出し側には Promise が返る
- 非async Action で async Function の結果を同期値として扱おうとした場合、Monaco で型エラーにする

## 9. Monaco

Function の所有スコープを解決し、対象 Action / Return に次の型情報を注入する。

### 9.1 `$args`

Function の Arguments から生成する。

```ts
declare const $args: {
  count: number
  user: User
}
```

### 9.2 `$fn`

可視スコープの Function から生成する。

```ts
declare const $fn: {
  calculate(count: number): number
  loadUser(id: string): Promise<User>
}
```

### 9.3 Return の期待型

Return の式には Function の returnType を期待型として設定する。

```text
Return Type: User
Return editor expected type: User
```

オブジェクト型の場合は、波カッコ入力時にプロパティ補完を表示する。

### 9.4 await の制御

- Function Action / Return で所有 Function の async が true の場合のみ許可
- 通常の Retention Action では許可しない
- async でない Function の Action / Return では Monaco エラーにする
- 実行時コンパイラでも同じ制約を適用する

### 9.5 スコープエラー

Monaco の表示だけでなく、保存時にも次を検証する。

- 存在しない Function 呼び出し
- 引数不足
- 引数過多
- 引数型不一致
- 存在しない `$args` プロパティ
- 存在しない `$fn` プロパティ
- 非async Function での await
- Action 内の return

## 10. UI 仕様

### 10.1 Function マスター編集

Function 編集ダイアログに次を表示する。

- Id
- Async
- Specify Return Type
- Return Type

Return Type は State / Variable と同じ Value Type UI を使用する。

### 10.2 Arguments

Arguments のメニューに `Add Argument` を追加する。

Argument 編集では次を設定する。

- Id
- Value Type

Argument に初期値は設定しない。値は呼び出し側から必ず渡す。

### 10.3 Procedure

Procedure に追加できるメニュー：

- Variable
- Function
- Object
- Union
- Action
- Block
- Return

Procedure では Component と Style を表示しない。

### 10.4 Return

Return は Procedure に1つだけ追加できる。

Return が存在する場合、Procedure の末尾に固定する。Return の後ろへの要素追加は無効にする。

## 11. バリデーション

### Function マスター

- Function ID 必須
- Function ID は同一スコープ内で一意
- 戻り値型がある場合、Return 必須
- Return が複数ある場合エラー
- Return がない場合エラー

### Arguments

- Argument ID 必須
- Argument ID は同一 Function 内で一意
- JavaScript 識別子のみ

### Procedure

- Function ID の重複を同一スコープ内で禁止
- Variable の同一フレーム重複を禁止
- Function と Function の同一スコープ重複を禁止
- Return は1つのみ
- Return は末尾のみ
- Action 内の `return` を禁止

### 実行時

- 引数個数
- 引数型
- Variable の明示型
- Return 値の型
- Function の存在
- async / await の整合性

## 12. 既存要素との関係

### Retention

Retention は UI の描画前処理とローカル宣言を担当する。

Function は Retention 内にも定義できるが、Function の Procedure は専用 FunctionRunner で実行する。

RetentionResolver に Function 実行ロジックを追加して共用しない。

### Action

既存 Action 要素の編集UIと基本ソース表現は再利用する。

ただし、Function Procedure 内の Action は次の追加制御を受ける。

- 所有 Function の `$args` 注入
- 所有 Function の `$fn` 注入
- async に応じた await 制御
- return 禁止

### Variable

Procedure 内の Variable は既存 Variable 要素を利用する。

Variable の値は Function 呼び出しごとのローカル VariableFrame に登録する。

### Object / Union

Procedure 内で定義した Object / Union は Function スコープ内だけで参照可能にする。

## 13. 実装フェーズ

### Phase 1：要素とUI

1. Function マスター要素
2. FunctionArguments 要素
3. FunctionArgument 要素
4. FunctionProcedure 要素
5. FunctionReturn 要素
6. Function 作成時の Arguments / Procedure 自動生成
7. Functions / Retention / Procedure の追加メニュー
8. Function 編集UI
9. Argument 編集UI
10. Return 編集UI

### Phase 2：スコープと型情報

1. Function の可視スコープ収集
2. Function ID の重複検証
3. Argument の重複検証
4. Procedure 内 Variable / Function のスコープ検証
5. Value Type の参照解決
6. Function シグネチャ生成

### Phase 3：Monaco

1. `$args` 宣言生成
2. `$fn` 宣言生成
3. Return の期待型注入
4. async に応じた await 制御
5. Action 内 return 禁止
6. 引数個数・型検証

### Phase 4：同期実行

1. FunctionRunner
2. Function ごとのローカル VariableFrame
3. Argument 展開
4. Procedure Variable / Action 実行
5. Return 評価
6. 戻り値型検証
7. `$fn.<id>(...)` のランタイム解決

### Phase 5：非同期とネスト

1. async FunctionRunner
2. await 実行
3. Promise の戻り値型
4. ネストした Function
5. レキシカルな `$fn` 解決
6. 同時実行時のローカルフレーム分離

## 14. テスト計画

### 要素テスト

- Function 作成時に Arguments / Procedure が生成される
- Function 編集で async / returnType が保持される
- Argument の Value Type が保持される
- Return が1つに制限される
- Return が末尾に固定される

### スコープテスト

- Global Function が App 内から参照できる
- Retention Function が Retention 内から参照できる
- Nested Function が親 Procedure 内から参照できる
- Function ID の重複が検出される
- 子スコープの Function が親スコープをシャドーイングできる
- 呼び出し元の `$var` が Function の `$var` に漏れない

### 型テスト

- primitive 引数
- オブジェクト引数
- object union 引数
- literal union 引数
- nullable 引数
- 配列引数
- 戻り値型不一致
- async 戻り値 `Promise<T>`

### 実行テスト

- Action が順番に実行される
- Return の式が評価される
- Return 後の要素が実行されない
- State 更新が維持される
- Function ローカル変数が呼び出しごとに分離される
- async Function が Promise を返す
- async Function の await が完了する
- 存在しない Function 呼び出しがエラーになる

## 15. 設計上の禁止事項

- Action 内の `return` をFunctionの戻り値として利用しない
- `$fn.exec(name, args)` の動的ディスパッチをMVPに導入しない
- Function ローカル State を導入しない
- Function のローカル Component / Style を許可しない
- Function のローカル変数をグローバル状態として共有しない
- async を Promise 型の手入力で表現させない
- Monaco だけで検証し、ランタイム検証を省略しない
- RetentionResolver にFunction特有のreturn/await制御を混ぜない

