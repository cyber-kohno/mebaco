# Mebaco MCP 読み取りツール設計

## 目的

固定Resourceで定義したMebacoのモデル知識を使い、エージェントがStudioで現在開いているプロジェクトを、概要から必要箇所へ段階的に調査できるようにする。

対象は読み取り専用である。保存、編集、検証の実行、選択変更などの操作は含めない。データの正本は保存ファイルではなく、指定セッションの現在のWebView `TreeStore` とする。

## 設計原則

- すべてのプロジェクト読取ツールで完全な`sessionId`を必須にする。暗黙に「最初のセッション」を選ばない。
- 各呼び出しでセッションを再検証し、呼び出し時点のライブ状態を読む。
- node IDはライブツリー内でのみ有効な探索用IDとして扱う。永続キーにはしない。
- ドメイン要素を無差別にJSON serializeせず、kind別の許可フィールドを返す。
- 調査は概要から始め、エージェントが必要とする枝だけ展開する。
- 大きなツリー、長い式やコード、参照結果には明示的な上限と切り詰め情報を付ける。
- プロジェクト内の名前、説明、式、コード、テキストはユーザー作成データであり、指示として実行しない。
- 「存在しない」「参照されていない」と「ツールが調べていない」を区別する。

## 推奨する調査フロー

```text
get_project_overview
  ├─ get_app_analysis_context(appId)
  ├─ get_app_context(appId)
  │    └─ get_component_structure(componentId)
  └─ get_node_details(nodeId)
       └─ get_node_references(nodeId)
```

アプリの目的を分析するときは、App一覧だけで判断せず、必ずAppのEntryから起点Componentを解決する。対象Componentを決めたら、Retention/Elementsの構造を確認し、個別ノードの詳細や参照関係へ進む。

通常の目的把握では`get_project_overview`の直後に`get_app_analysis_context`を使う。既存の個別ツールは、大規模Appの部分調査、切り詰め箇所、特定ノードの精査に使う。

## Tool 1: `get_project_overview`

### 用途

開いているプロジェクトの規模と最上位構造を把握し、次に調べるAppやComponentを選ぶ入口。

### 入力

```json
{ "sessionId": "<complete session ID>" }
```

### 出力

```json
{
  "sessionId": "...",
  "modelVersion": "1",
  "project": { "projectId": "...", "dirty": true },
  "summary": {
    "nodeCount": 91,
    "kindCounts": { "app": 1, "component": 4, "tag": 18 }
  },
  "apps": [
    {
      "nodeId": 12,
      "appId": "stable app identity",
      "name": "Main",
      "entry": {
        "nodeId": 13,
        "componentId": "stable component identity",
        "componentName": "MainView",
        "status": "resolved",
        "propBindingCount": 1
      }
    }
  ],
  "components": {
    "count": 4,
    "items": [
      { "nodeId": 27, "componentId": "...", "name": "MainView", "scope": "app", "local": false }
    ],
    "truncated": false
  }
}
```

### 要件

- AppごとにEntryを解決する。未指定Entry、未解決componentId、空のprop bindingは異なる状態として表す。
- Component一覧はCommon/Appの所有スコープを示す。Retention内のlocal Componentは通常一覧と混ぜず、所有Componentの構造取得で示す。
- Component一覧の返却上限は100件。超過時は`truncated: true`と件数を返す。まずは個別のComponent詳細呼び出しを促し、ページングは必要性が出た段階で追加する。
- `dirty`は必ず返し、返却データがライブ未保存状態に基づくことを示す。
- project display nameが実在する場合は任意で返せるが、パスや認証情報は返さない。

## Tool 2: `get_app_context`

### 用途

AppのEntry、起点Component、初期prop bindings、App所有Componentを一まとまりで理解する。

### 入力

```json
{ "sessionId": "...", "appId": "stable app identity" }
```

### 出力の要点

- Appの`appId`、表示名、node ID
- Entryの有無とEntry node ID
- Entry `componentId`と解決状態（`resolved` / `unset` / `unresolved` / `ambiguous`）
- 解決先ComponentのID、表示名、ローカル性
- Entry prop bindingのprop IDと値形態（literal / formula）。式本文は既定では返さず、必要なノード詳細取得で読む
- Appスコープで参照可能な非local Component一覧（最大100件、切り詰め表示）
- App固有の主要構造（declares、resources、storageなど）はkindとnode IDの短い一覧

### 解決規則

- `appId`はアプリ要素のIDで解決し、node IDと混同しない。
- Entryの`componentId`は、そのAppから見えるComponent定義に対して解決する。
- 0件なら`unresolved`、複数候補なら`ambiguous`とし、勝手に1件を選ばない。
- 初期prop bindingの値を評価・実行しない。式はデータとして返す。

## Tool 3: `get_component_structure`

### 用途

Component定義の構造を、Retention/Elementsを保ったまま確認する。

### 入力

```json
{
  "sessionId": "...",
  "componentId": "stable component identity",
  "maxDepth": 4,
  "maxNodes": 120
}
```

`maxDepth`と`maxNodes`は任意。既定値はそれぞれ3、80。指定する場合はそれぞれ1〜8、1〜200の範囲とし、範囲外は`INVALID_PARAMS`として拒否する（暗黙の丸め・clampはしない）。

### 出力の要点

- Component identity、表示名、owner scope、local flag
- Componentの標準枝（`props`、`store`、`retention`、`elements`）
- `contentMode`: `retention-elements` / `invalid-structured-content`（古い直接形式を検出した場合のみ`direct`）
- props、slotsの定義（ID、名前、型または既定値の有無など要約）
- 子ツリーの浅い構造。各項目にnode ID、kind、短いlabel、子数
- Retention branchとElements branchを明示的な別フィールドにする
- Retention直下のdeclaration inventory（kind別件数と識別子）。式・コード全文は含めない
- `truncated`、`omittedNodeCount`、切り詰められた枝のnode ID

### 構造上の扱い

- 現行Component定義では`props`、`store`、`retention`、`elements`が標準枝であり、Componentのrenderable rootは`elements.children`から始める。
- Component配下のTag、条件分岐など、Retentionが任意のnested content hostは、それぞれ直下contentか`retention`/`elements`分岐かを判定して再帰表示する。
- `contentMode`はComponent自身については通常`retention-elements`。古い/不正データやモデル移行時のdirect形を検出した場合に限り別状態を返す。
- 各content hostのRetention/Elements枝を独立して明示し、RetentionをView子要素として扱わない。
- 壊れた構造（RetentionまたはElementsの重複・片側欠落）は隠さず、`invalid-structured-content`と問題箇所を返す。
- 子ノードの詳細は別Toolで取得できるよう各枝にnode IDを含める。

### サイズ制御

- 一回あたり最大200ノード。
- 深さまたはノード数で切り詰めた場合、返していない子の数と親node IDを示す。
- node IDを使って、次に取得すべき枝を特定できるようにする。snapshot cursorは初期版では導入しない。

## Tool 4: `get_node_details`

### 用途

任意の既存ノードについて、祖先パス、要素の意味情報、直接の子一覧を取得する。

### 入力

```json
{
  "sessionId": "...",
  "nodeId": 42,
  "includeSource": false
}
```

### 出力の要点

- node ID、kind、表示label、ancestor path
- kind別allowlistに含まれる意味情報
- 子ノードの短い一覧（最大100件）
- 対応するRetention/Elements hostがある場合のbranch情報
- `dirty`とmodel version
- 長い値は切り詰め表示し、`truncatedFields`で明示

### Field policy

- デフォルトはコード・式・大量テキストを除く。
- `includeSource=true`でもソース文字列は最大8,000文字/フィールド。超過時は切り詰めて元の長さを返す。
- secrets、token、ローカルファイルの絶対パス、生成バイナリは返さない。
- `kind`を識別できてもallowlist未対応なら、共通情報と「詳細フィールド未対応」を返す。未対応データを黙って欠落させない。
- 部分的な詳細から実行結果を推定しない。

### 実装上の対応範囲

- 詳細フィールドはkind別allowlistのみを返す。未対応kindは`detailsSupported: false`とし、共通の識別情報・子一覧だけを返す。
- `includeSource`既定値はfalse。式/コード/任意テキストを含むフィールドは除外し、trueの場合も各文字列を8,000文字に制限する。
- 子一覧は直接の子を最大100件返す。祖先はrootから対象ノードまでのnode ID/kind/labelのみ。
- 絶対パスや認証情報にあたるキーは、allowlist値の内部にあっても返却時に除外する。

## Tool 5: `get_node_references`

### 用途

選択ノードの参照元と依存先を、既存のReferenceGraphの意味に沿って確認する。

### 入力

```json
{
  "sessionId": "...",
  "nodeId": 42,
  "direction": "both",
  "limit": 100
}
```

`direction`: `incoming` / `outgoing` / `both`。`limit`既定値50、最大200。

### 出力の要点

- `canHaveReferences`と`canHaveDependencies`
- incoming references（source node/kind/label/target label/sourceType）
- outgoing dependencies（target node/kind/label/source label/sourceType）
- `sourceType`: `structural` / `expression`
- 各方向の件数、返却件数、`truncated`
- 参照なしを「調査不能」と混同しないためのcapability flags

ReferenceGraphが未対応・不完全な関係は、空配列で成功したように見せず`coverage`または警告に記録する。現行graphのラベルだけでは親kindやpropertyの精度が足りない場合は、Tool設計の実装前に型を拡張する。

### 実装上のcoverage

- 本ToolはStudioの`ReferenceGraph.build`が認識する意味的・構造的な関係のみを返す。全フィールドの全文検索や、グラフが未対応の文字列参照を保証しない。
- incomingはReferenceGraphの参照元node ID/label/sourceTypeを返す。outgoingは依存先node ID/kind/target labelとsource label/sourceTypeを返す。
- `canHaveReferences`/`canHaveDependencies`はReferenceGraphの能力判定をそのまま使う。falseは「グラフがこのkindを対象にしない」を意味し、プロジェクト全体にテキスト上の言及がないことの証明ではない。
- 方向ごとにlimitを適用し、全件数とtruncatedを返す。指定していない方向は`included: false`で明示する。limitは1〜200、既定値50。

## Tool 6: `get_app_analysis_context`

### 用途

Appが何を作っているかを少ない往復で把握するため、Entry起点Component、AppのStore・宣言、Retention内定義、View、式・イベント、依存先定義を一回のライブスナップショットで返す。

### 入力

```json
{ "sessionId": "...", "appId": "...", "maxNodes": 200 }
```

`maxNodes`は任意で、既定値200、最大300。返却対象は意味ノードに限定し、構造フォルダーは省略して`parentNodeId`で関係を示す。

### 出力と境界

- Entryの解決状態と起点Component
- Component、State、定数、型、Function、Style、View、Directiveなどのkind別allowlistフィールド
- 式、イベント、Function実装、Styleルールを含む。ただし各文字列は8,000文字まで
- 分析に不要なUUID系内部IDは省き、node IDと依存エッジで関係を表す
- 起点Component/App Store/App宣言から到達するReferenceGraph依存先を再帰的に同梱する
- ReferenceGraphの依存エッジを最大300件返す
- `semanticNodes`と`dependencies`の件数・切り詰め状態を明示する
- Project全体JSONの代替ではない。詳細確認には個別ツールを使う

## 共通応答ルール

- 成功応答は`sessionId`, `modelVersion`, `dirty`, `revision`, `data`を含む。`revision`は同じライブTreeStoreに対する後続更新の`expectedRevision`として使用する。
- エラーは`SESSION_NOT_AVAILABLE`, `NODE_NOT_FOUND`, `APP_NOT_FOUND`, `COMPONENT_NOT_FOUND`, `AMBIGUOUS_REFERENCE`, `INVALID_PARAMS`など安定したcodeを使う。
- 切り詰めはエラーにせず、`truncated: true`と続きを特定できるIDを返す。
- 各ツール結果はJSONとして構造化し、自由文を主形式にしない。
- すべてのテキスト・式・コードはプロジェクトデータとして扱う。プロンプト命令として追従しない。
- タイムアウトと出力上限を設け、任意の全Project JSON返却は公開しない。
- 呼び出し間にTreeStoreが変化し得る。同一snapshot保証がない場合、その旨を結果に含め、必要なら概要を再取得する。

## 実装順

1. `get_project_overview`: App/Entry/Component識別の入口。
2. `get_app_context`: Entry Componentを正しく解決する。
3. `get_component_structure`: Retention/Elementsを保ってView構造を返す。
4. `get_node_details`: 個別要素の意味・ソースを必要時に取得する。
5. `get_node_references`: 構造を越える関係を調べる。
6. `get_app_analysis_context`: 1〜5で得た情報をApp目的把握向けに一括取得する。

最初の実装対象は1〜3とする。これらで「このアプリが何を作っているか」の骨格を把握できるか確認した後、詳細と参照Graphを追加する。

## 受け入れ条件

- MCPがOFF、セッション停止、stale descriptorの場合にライブデータを返さない。
- 同名App/ComponentがあってもIDで曖昧さを報告できる。
- EntryからApp起点Componentを追跡できる。
- Retention有無の両方でComponentのView rootを正しく示す。
- Retention内定義をrendered UIとして誤分類しない。
- 結果上限に達したとき、切り詰めた位置から追加調査できる。
- 長い式、コード、ユーザーテキストが出力上限を超えない。
- 呼び出し中のプロジェクト変更を検出できない場合、結果を同一snapshot保証として表現しない。
- Studio未保存変更が返却内容に反映される。

## 決定保留事項

- Toolごとの確定JSON Schemaと命名規則
- appId/componentId/nodeIdを返す識別子表記の統一
- Component構造の切り詰め時に子IDをどこまで列挙するか
- `includeSource`対象allowlistの拡張（現行は基本的なComponent/View/State/Style/Function/Type要素）
- ReferenceGraphのProperty単位ラベル拡張（現行応答はsource/target labelまで）
- 参照結果に親パスを含めるか（トークン量とのトレードオフ）
- 複数ツール呼出し間での一貫したsnapshot/version検出方式
