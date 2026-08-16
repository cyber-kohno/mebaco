# 新Front Driven 開発引継ぎ資料

## 1. この文書の目的

旧Front Drivenの解析結果と、その後の再構築方針に関する検討内容を、新規プロジェクトへ引き継ぐための文書である。

この文書は「旧実装を再現する仕様書」ではない。旧版で実証された価値を残しつつ、最小構成から新しい製品を設計するための出発点とする。

旧版の詳細な静的解析結果は、同じリポジトリの次の文書を参照すること。

```text
docs/CURRENT_SYSTEM_SPEC.md
```

旧版ソースの場所：

```text
D:\app\git\front_driven_dev
```

---

## 2. 製品ビジョン

新しいFront Drivenは、ツリー構造とコードを組み合わせてフロントエンドアプリを開発し、その場で実行できるデスクトップ開発・実行環境を目指す。

中心となる考え方：

> UIの構造はツリーで組み、複雑な振る舞いは型付きコードで記述する。

目指す立ち位置は、制限の強いノーコードツールではなく、次のような「フロントエンドアプリ版Unity」である。

| Unityの概念 | 新Front Drivenの概念 |
|---|---|
| Scene Hierarchy | UI Program Tree |
| GameObject | UI Node / Component Instance |
| Component | Front Driven Component |
| MonoBehaviour | TypeScript Code Node |
| Inspector | Node Property Editor |
| Prefab | Component / Template |
| Play Mode | Preview / Runtime |
| Unity Runtime | Front Driven Runtime |

将来的には、人間とAIが同じ操作インターフェースを使ってアプリを構築できる基盤にする。

---

## 3. 再構築の背景

旧Front Drivenは2024年頃に約1600時間かけて開発された。Reactの経験が浅い段階からプロトタイプ的に試行錯誤し、そのまま本番利用へ進んだため、大規模である一方、構造や責務が十分に整理されていない。

それでも、実運用では次の価値が確認できた。

- 単一のProjectデータでアプリ全体を管理できる
- プログラムをツリーとして俯瞰・編集できる
- Component指向で部品を再利用できる
- フロントエンド未経験者も一部の開発に参加できる
- アプリの複製や別環境への移送が容易
- 開発を始めてから動作確認・共有までが速い

一方、AI駆動開発が一般化し、「GUIでコードを書きやすくする」だけではCodexやClaude Codeに対する優位性が弱くなった。

新製品では、AIと競争するのではなく、次の価値を提供する。

- 安定した共通Runtime
- 依存導入やビルド環境構築を意識せず、すぐ開発を始められる
- 作成したProjectをすぐ実行できる
- Projectファイルを渡すだけで共有できる
- ComponentとTemplateを資産として蓄積できる
- 将来、AIが制約された操作APIを通じて安定した成果物を作れる

---

## 4. 旧版から残すもの

### 4.1 必ず残す考え方

- 1つのProjectデータでプログラム全体を表現する
- ツリー中心の編集体験
- 1画面でプログラム構造を俯瞰できる
- App、Component、State、Props、UI、Event、Functionという構造
- Component指向による実行時の再利用
- Styleを再利用・継承できる考え方
- 編集中のProjectを同じRuntimeで即時実行するPlay Mode
- GUI操作によってコードを書かずに編集できる部分と、コードで自由に書ける部分の共存

### 4.2 再設計して残すもの

- 旧`native`ノード → 型付きAction Code Node
- 旧`return`ノード → 型付きFunction Code Node
- `__st.count__`のような文字列プレースホルダー → 実行Context引数
- gzip + Base64された単一JSON → 初期版では読みやすい単一Projectファイル
- `data: any`中心のノード → 判別可能Unionと検証可能なSchema
- Storeオブジェクトの直接破壊的変更 → Project Command経由の変更

### 4.3 引き継がないもの

- Webサービスとしてのユーザー登録・ログイン
- URLによるアプリ公開
- クライアントからSQL文字列を送るDB API
- Hashidsによる公開URL
- Region切替とクラウド上のProject保存
- 旧版の独自認証
- 旧版コード構造のそのままのコピー
- コメントアウトされた未完成機能
- 旧版の文字列置換による変数参照

---

## 5. 確定している製品方針

### 5.1 最初はWebサービスにしない

- Tauriによるデスクトップアプリを第一候補とする
- 開発環境とRuntimeを同じデスクトップアプリに持つ
- Projectファイルを読み込んでアプリを実行する
- URLによる一般公開は初期要件に含めない
- クラウドアカウント、課金、Communityは初期要件に含めない

比喩としては次の関係になる。

```text
Front Driven Desktop = ゲーム機
Projectファイル      = ゲームソフト
```

### 5.2 自由度を低くしすぎない

- UIの大枠はツリーで開発する
- イベント処理や複雑な計算はコードで記述できる
- 基本的にReactで実現できることを広く表現可能なEngineを目指す
- ツリーだけですべての処理を表現する制約型ローコードにはしない
- ただし、OSや外部環境への副作用は将来的にCapabilityで管理する

### 5.3 編集中の正本はアプリ内Project State

- 表示されているProject全体はアプリ内Stateに保持する
- 編集中に物理ファイルとの自動同期は行わない
- ユーザーの保存操作時にProject State全体をSnapshotとして出力する
- ファイル監視、外部変更の自動取込、Workspace常時同期は初期要件に含めない

---

## 6. 第一目標（MVP）

第一目標は次の3点である。

1. ツリー上でイベントドリブンなフロントエンドUIを組める
2. アプリ内でProjectを直接実行して動作確認できる
3. Projectを単一ファイルへ保存し、再読込して実行できる

### 6.1 MVPに含める機能

#### Project操作

- New Project
- Open Project
- Save
- Save As
- 未保存変更のDirty表示
- 未保存状態で閉じる際の確認
- Projectファイル読込時の検証

#### Program Tree

- App
- Component
- Props
- State
- UI Root
- Container
- Text
- Button
- Input
- Action Code Node
- Function Code Node

#### Tree編集

- ノード追加
- ノード削除
- ノード移動
- ノード選択
- Property編集
- Component配置
- EventとActionの接続

#### Code編集

- Monaco Editor
- TypeScript Sourceの編集
- Action Node
- Function Node
- 引数と戻り値
- State、Props等の補完
- TypeScript診断表示
- Runtime Error表示

#### Runtime

- 現在のProject StateからReact UIを生成
- Play Mode
- State変更による再レンダリング
- click、change等の基本イベント
- Action / Function実行

### 6.2 MVPに含めないもの

- Template
- Component Marketplace / Community
- MCP
- CLI
- AIによる自動開発
- Workspaceフォルダ形式
- Git連携
- 自動保存・常時ファイル同期
- `.fdapp`配布専用形式
- Project署名
- Cloudflare Workers / D1
- 認証・ユーザー管理
- 外部Plugin
- 自由なOSファイル操作
- ローカルSQLite
- 一般公開
- リアルタイム共同編集

これらは製品構想として保持するが、第一目標の完成を妨げないよう実装しない。

---

## 7. 最初の完成判定：Counter App

最初の垂直スライスとして、カウンターアプリを作れる状態を目指す。

```text
Counter App
├─ State
│  └─ count: number = 0
└─ UI
   ├─ Text
   │  └─ value: state.count
   └─ Button
      ├─ label: "+"
      └─ onClick
         └─ Action
```

Action Code：

```ts
ctx.state.count += 1;
```

### 完成条件

1. 新規Projectを作成できる
2. ツリーにState、Text、Button、Actionを追加できる
3. Textの表示をStateへBindingできる
4. ButtonのclickとActionを接続できる
5. Monaco上でActionを編集できる
6. Play ModeでButtonを押すと数値が増える
7. Projectを単一ファイルに保存できる
8. アプリを再起動してProjectを読み込める
9. 読み込んだProjectが同じように動作する

この一連が完成した時点で、新Engineの中核が成立したと判断する。

---

## 8. Projectモデルの初期方針

### 8.1 共通Node

旧版の`data: any`を避け、Node種別ごとの判別可能Unionを使用する。

概念例：

```ts
type ProjectNode =
  | AppNode
  | ComponentNode
  | StateNode
  | ContainerNode
  | TextNode
  | ButtonNode
  | InputNode
  | ActionNode
  | FunctionNode;
```

各Nodeには表示名とは独立した安定IDを持たせる。

```ts
interface NodeBase {
  id: string;
  type: string;
  name: string;
}
```

- `id`: 内部参照用。原則変更しない
- `name`: 人間向け表示名。変更可能
- 必要になった場合のみ、コード参照用の`symbol`を追加する

### 8.2 Project変更

画面ComponentからProjectを直接書き換えず、操作単位のCommandを通す。

```ts
projectCommands.addState(...);
projectCommands.addNode(...);
projectCommands.moveNode(...);
projectCommands.updateNode(...);
projectCommands.removeNode(...);
```

初期目的は、変更ロジックと画面を分離し、検証とUndo/Redoを実装しやすくすることである。MCP対応のために過剰設計しない。

---

## 9. Code Nodeの方針

### 9.1 Action Node

イベント処理や副作用を実行する。

```ts
type Action = (ctx: Context) => void | Promise<void>;
```

例：

```ts
ctx.state.count += 1;
```

### 9.2 Function Node

引数を受け取り、値を返す。

```ts
type FunctionNode<TArgs, TResult> = (
  ctx: Context,
  args: TArgs
) => TResult | Promise<TResult>;
```

例：

```ts
return args.items.reduce(
  (total, item) => total + item.price * item.quantity,
  0
);
```

### 9.3 実行Context

文字列プレースホルダー置換ではなく、関数引数としてContextを渡す。

初期イメージ：

```ts
interface FrontDrivenContext<TState, TProps> {
  state: TState;
  readonly props: Readonly<TProps>;
  runtime: {
    log(value: unknown): void;
  };
}
```

StateはProxy等を通し、次の記述がRuntimeのState更新へ反映されるようにする。

```ts
ctx.state.count += 1;
```

### 9.4 TypeScript

- 正本はTypeScript Sourceとする
- 実行前に型チェック・JavaScript変換を行う
- 利用者に手動Buildを要求しない
- ProjectのState、Props、引数、戻り値から型定義を生成する
- 生成型をMonacoへ渡し、補完と診断を有効にする

Monaco上では本文だけを編集させても、内部的には次のような仮想モジュールとして扱える。

```ts
import type { Context } from "front-driven:current-context";

export default async function execute(ctx: Context): Promise<void> {
  // ユーザー編集範囲
}
```

### 9.5 セキュリティ上の注意

`new Function("ctx", source)`のように引数を使う方式は、旧版の文字列置換より保守性と型付けの面で優れるが、任意コード実行を安全にする仕組みではない。

初期版は次の信頼モデルでよい。

- 自分または信頼されたメンバーが作成したProjectのみ実行する
- Code NodeからTauriの強いOS権限を直接利用させない
- 外部機能は将来`ctx.services`経由で提供する
- 不特定作者のProjectを扱うSandboxはMVP後に設計する

React管理下のDOMを壊すため、Code Nodeからの直接DOM操作は標準機能にしない。

---

## 10. 保存形式の確定方針

### 10.1 MVPでは単一Projectファイルのみ

```text
example.fdproj
```

- 中身はUTF-8のプレーンJSONでよい
- 編集中の正本はアプリ内Project State
- ユーザーがSave / Save Asを実行したときだけ書き出す
- ディスクとの自動同期はしない
- 保存時にProject全体を一貫したSnapshotとして出力する

最低限、次のメタデータを持つ。

```json
{
  "format": "front-driven-project",
  "schemaVersion": 1,
  "runtimeVersion": "0.1.0",
  "project": {},
  "components": [],
  "apps": []
}
```

### 10.2 初期から実装する保存上の最低条件

- `schemaVersion`
- `runtimeVersion`
- 読込時のSchema検証
- Node ID重複検証
- 参照整合性検証
- Dirty状態
- 未保存状態で閉じる際の確認
- 保存失敗時に既存ファイルを可能な限り壊さない処理

### 10.3 将来の拡張候補

必要になった段階で、手動Exportとして追加する。

```text
Project State
├─ Save as Single Project File
├─ Export as Workspace Directory
└─ Build Runtime Package
```

Workspace形式を追加しても、常時同期を前提にしない。ユーザー操作時にProject State全体から完全な展開Snapshotを生成する。

将来的な形式候補：

- `.fdproj`: 編集可能な単一Projectファイル
- Workspace Directory: Git差分確認用の手動Export
- `.fdapp`: 検証・コンパイル済み配布Package

この拡張は、MVP完成後に実際の必要性を確認してから判断する。

---

## 11. ComponentとTemplateの将来構想

### 11.1 Component

実行時に再利用する部品。

```text
Component
├─ Props
├─ State
├─ Events
├─ Functions
├─ Lifecycle
└─ UI Tree
```

Componentの更新は利用箇所へ反映される。

### 11.2 Template

開発時にProgram Treeを生成するユーザー定義ジェネレーター。

```text
Template + Parameters
        ↓ 展開
通常のProgram Tree
        ↓
自由に個別編集
```

例：

- Split Pane Templateを展開して変換ツールのUIを即時作成
- 家計簿Templateへ管理項目を渡し、Model、画面、Componentを生成
- 問診票TemplateへAPI Mappingを渡し、アプリの大枠を生成

Template展開後は、原則として元Templateと自動同期しない。一方向のSnapshot生成とする。生成元Template、Version、Parametersは履歴情報として保持できる。

Template自体も将来Front Driven上で自作・配布可能にする。ただしMVPには含めない。

---

## 12. AI対応の将来構想

AIにProject JSON全体を直接生成させる方式は採用しない。

将来は、GUIと同じProject CommandをCLIまたはMCP経由で公開する。

```text
Human GUI ─┐
           ├─ Project Domain API → Validation → Project State
AI / MCP ──┤
CLI ───────┘
```

想定操作：

```text
project.create
template.search
template.inspect
template.expand
component.add
state.add
event.connect
code.update
project.validate
app.preview
test.run
package.export
```

AIは許可された操作だけを繰り返し実行し、検証、Preview、Runtime Error、テスト結果を確認しながらアプリを構築する。

ただし、現段階ではMCP Tool、AI用Summary、認可、Batch API等を設計・実装しない。安定したProjectモデルとCommand APIが完成した後に追加する。

---

## 13. 将来の外部Capability

Tauriの強みを活かし、将来的にはProjectから次を利用可能にする。

- ユーザーが選択したファイルの読込
- ファイル保存ダイアログ
- Project専用データ領域
- CSV読込・出力
- ローカルSQLite
- Clipboard
- HTTP API
- Secret参照

ProjectのコードへTauri Commandを直接公開せず、`ctx.services`等の高水準APIを提供する。

```ts
const file = await ctx.services.files.pick({
  extensions: ["properties"]
});
```

外部通信やOS操作は、言語表現の自由度とは分離してCapability管理する。

```text
プログラム表現の自由度：高くする
OS・ネットワーク権限：明示的に制御する
```

Cloudflare Workers + D1は、共有データが必要な業務アプリの将来候補である。D1へDesktopから直接接続せず、Worker APIを介して認証、認可、入力検証、パラメータ化Queryを実行する。

---

## 14. 新プロジェクトの推奨責務分割

具体的なフレームワーク構成は新プロジェクト開始時に決めるが、論理的には次を分離する。

```text
Application Shell
├─ Project Session
│  ├─ Current Project State
│  ├─ Dirty State
│  └─ Open / Save / Save As
├─ Project Domain
│  ├─ Schema
│  ├─ Commands
│  ├─ Validation
│  └─ Reference Resolution
├─ Editor
│  ├─ Tree
│  ├─ Inspector
│  └─ Monaco Code Editor
├─ Runtime
│  ├─ UI Renderer
│  ├─ State Runtime
│  ├─ Event Runtime
│  └─ Code Executor
└─ Infrastructure
   ├─ Tauri File Service
   └─ TypeScript Compiler Service
```

EditorとRuntimeがProjectデータ構造へ個別の解釈を持たないよう、Project Domainを中心に置く。

---

## 15. 実装前に決める必要がある事項

MVP着手前に、次だけは決める。

1. 新しい製品名とProject内の内部名称
2. React + Tauriの具体的な初期構成
3. Project Schema検証ライブラリ
4. Node IDの生成方式
5. Project State管理方式
6. Tree UIライブラリを使うか自作するか
7. TypeScript Sourceの変換方式
8. Code Node Runtime Contextの最小仕様
9. `.fdproj`の拡張子と初期Schema
10. PreviewをEditor内に置くか別Windowに置くか

それ以外の将来要件は、Counter Appの垂直スライス完成後に判断する。

---

## 16. 保留中の設計事項

現時点では確定させない。

- 製品正式名称
- Style継承の厳密な仕様
- Template定義言語
- Component Package形式
- Runtime Package形式
- Workspace Export形式
- Sourceを配布Packageに含めるか
- Code NodeのSandbox方式
- Tauri Capabilityの詳細
- Local SQLiteの抽象化
- Communityと署名
- AI / MCP Tool仕様
- CLI仕様
- Cloud Backend
- Plugin API
- Project Migration UI

---

## 17. 最初にやらないこと

新プロジェクト開始直後に、以下を先回りして作らない。

- 完成版のNode体系
- 旧版全機能の移植
- 汎用Template Engine
- Marketplace
- クラウド同期
- ファイル常時同期
- 高度な権限管理
- 任意Plugin
- AI Agent
- 複数Project同時編集
- 最終的な配布Package最適化

設計上の拡張余地は残すが、未確定機能のための抽象化を増やしすぎない。

---

## 18. 新プロジェクト開始時の作業順

### Step 1: Project Domain

- 最小Project Schemaを定義
- Counter Appを手書きデータとして表現
- SchemaのParseとValidationを実装
- Node IDと参照を定義

### Step 2: Runtime

- 手書きCounter ProjectをReact UIとして表示
- Button clickからActionを実行
- `ctx.state.count += 1`で再レンダリング

### Step 3: Editor

- Project Treeを表示
- State、Text、Button、Actionを追加・編集
- Project Commands経由でStateを変更

### Step 4: Code Editor

- Monacoを組み込む
- Action Sourceを編集
- Contextの型を生成
- TypeScript診断と変換を実装

### Step 5: Persistence

- New / Open / Save / Save As
- `.fdproj`読込・保存
- Dirty状態と終了確認
- 再起動後の再実行を確認

### Step 6: MVP検証

- Counter AppをGUIだけで作成
- 保存・再読込
- Preview実行
- 異常Projectの拒否
- Runtime Errorの表示

ここまで完了してから、Input、複数Component、Style、Template等の次機能を選ぶ。

---

## 19. 旧版を参照する際の注意

旧版は仕様を理解する資料として利用し、新版へそのままコピーしない。

主な参照先：

| 目的 | 旧版の参照先 |
|---|---|
| エントリ・Routing | `src/module/system/contents/entry/systemEntry.tsx` |
| 全体Store | `src/module/system/redux/store/` |
| Projectデータ | `src/module/system/redux/store/storeProject.tsx` |
| Node型 | `src/module/system/contents/develop/function/util/modelUtil.tsx` |
| 初期Project生成 | `src/module/system/contents/develop/function/util/modelElementUtil.tsx` |
| Tree Editor | `src/module/system/contents/develop/function/tree/` |
| Code系Node | `src/module/system/contents/develop/function/editor/var/func/` |
| 公開Runtime | `src/module/system/contents/gui/appReader.tsx` |
| Runtime解釈 | `src/module/system/contents/gui/readerUtil.tsx` |
| 旧保存・DB通信 | `src/module/common/serverUtil.tsx` |

旧版で確認された主な問題：

- UI、Domain、Persistence、Runtimeの責務混在
- `any`中心のProjectデータ
- Storeの直接変更
- クライアントからSQL送信
- SQL文字列連結
- スキーマVersion不在
- Editorと公開Runtimeの密結合
- `Function`による動的実行の境界不足
- テスト不足
- コメント文字化け

---

## 20. 新プロジェクトへの引継ぎ要約

新プロジェクトで最初に作るものは、巨大なローコードIDEではない。

> ツリーでCounter Appを組み、TypeScript Actionを書き、その場で動かし、単一Projectファイルへ保存・再読込できる小さなEngineを作る。

最初の設計原則：

```text
Tree          = UIとComponentの構造
TypeScript    = 自由な振る舞い
Project State = 編集中の唯一の正本
Project File  = ユーザー操作で保存するSnapshot
Runtime       = Projectを直接実行する共通環境
Command       = GUIと将来のAIが共有できる変更単位
```

Template、外部Capability、配布Package、Community、AIは、このEngineが安定してから積み上げる。

