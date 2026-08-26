# ツリーCriteria・ノード遷移仕様

更新日: 2026-08-26

ステータス: 実装前・仕様確定

## 1. 目的

Develop Workspaceのツリーに、次の2機能を追加する。

1. **Criteria機能**
   - 選択中のノードを「見た目上のルート」にして、不要な親階層・兄弟ノードを非表示にする。
   - 作業対象へ集中できる表示範囲を提供する。
2. **ノード遷移機能**
   - リファレンスグラフの参照元・依存先から対象ノードへ移動する。
   - IDEの定義ジャンプと同様に、移動前の位置へ戻れる履歴を提供する。

両機能は別々のUI機能だが、ノード遷移時にCriteriaの表示範囲を越える可能性があるため、共通のツリービューポート状態とナビゲーション機構の上に実装する。

本資料は、会話コンテキストのない別のCodex環境でも実装できるよう、決定済み仕様、現行コードとの接続点、推奨アーキテクチャ、境界条件、テスト観点をまとめた引き継ぎ資料である。

## 2. 用語

| 用語 | 意味 |
|---|---|
| プロジェクトルート | `TreeStore.rootNode`が保持する実データ上の最上位ノード |
| 選択ノード | 現在操作対象となっているノード。`TreeStore.selectedNodeId`で管理される |
| Criteria | ツリー上で最上位に表示する基準ノード |
| 表示ルート | Criteriaが設定されていればCriteriaノード、未設定ならプロジェクトルート |
| ジャンプ | リファレンスグラフなどから、離れた別ノードへ明示的に遷移する操作 |
| ナビゲーション履歴 | ジャンプ前の選択ノードとCriteriaを保持するセッション内履歴 |

Criteriaはデータ構造上の親子関係を変更しない。表示対象となる部分木の起点を変更するだけである。

## 3. 決定事項

### 3.1 状態を分離する

少なくとも次の状態を分離して管理する。

```ts
type TreeViewportState = {
  /** nullはプロジェクトルートを表示することを表す。 */
  viewRootNodeId: number | null
}
```

- 選択ノード: `TreeStore.selectedNodeId`
- 表示基準: `TreeViewportState.viewRootNodeId`
- 実ツリー: `TreeStore.rootNode`

`viewRootNodeId`にはプロジェクトルートのIDを重ねて保存せず、プロジェクト全体表示を`null`で表す。これにより「Criteria未設定」と「特定ノードを明示的にCriteriaにした状態」を区別できる。

### 3.2 履歴にスクロール値を保存しない

ナビゲーション履歴は次の情報だけを保持する。

```ts
type NavigationLocation = {
  selectedNodeId: number
  viewRootNodeId: number | null
}
```

`scrollTop`、`scrollLeft`、開閉状態は履歴へ保存しない。

理由:

- ノードの開閉状態は遷移前後で共有されるため、古い`scrollTop`を復元しても同じノード位置には戻らない。
- Criteriaの変更により、表示される部分木とツリー全体の高さが変わる。
- ウインドウサイズ変更後は、保存したスクロール値が適切ではなくなる。
- 戻る操作の本質は、以前と完全に同じピクセル位置ではなく、以前の作業対象と表示範囲へ戻ることである。

復元時は、現在のウインドウサイズと描画後のノード位置から、選択ノードが見やすいスクロール位置を再計算する。

### 3.3 開閉状態は共有する

- Criteria変更やジャンプの前後で、各ノードの`isOpen`は同じツリー状態を共有する。
- 履歴を戻っても、過去の開閉状態へ巻き戻さない。
- 遷移先を表示するために必要な祖先ノードは自動的に開く。
- 自動的に開いたノードも、その後は通常の共有開閉状態として残る。

## 4. Criteria機能

### 4.1 表示規則

- `viewRootNodeId === null`の場合、プロジェクトルートからツリーを描画する。
- `viewRootNodeId`が有効な場合、そのノードからツリーを描画する。
- Criteriaより上の親階層と、Criteriaおよびその祖先の兄弟ノードは描画しない。
- Criteria配下の開閉状態、選択、編集、無効状態、検証状態などは通常のツリー表示と同じ規則を使用する。
- 選択ノードは、原則として表示ルートの部分木内に存在する状態を維持する。

### 4.2 キーボード操作

| 操作 | 動作 | 無効条件 |
|---|---|---|
| `Q` | 現在の選択ノードをCriteriaにする | 既に選択ノードがCriteriaの場合 |
| `Ctrl + ArrowLeft` | Criteriaを1階層親へ上げる | それ以上上げられない場合 |
| `Ctrl + ArrowRight` | Criteriaを選択ノードへ向かって1階層下げる | 選択ノードとCriteriaが同じ、または有効な下降経路がない場合 |

補足:

- Criteria未設定時の`Ctrl + ArrowLeft`は何もしない。
- Criteriaの親がプロジェクトルートの場合、`Ctrl + ArrowLeft`の結果は`viewRootNodeId = null`とする。
- Criteria未設定時の`Ctrl + ArrowRight`では、プロジェクトルートから選択ノードへ至るパスの最初の子ノードをCriteriaにする。
- `Ctrl + ArrowRight`は、現在の表示ルートから選択ノードまでの一意な親子パスを1段だけ進む。
- 選択ノードが表示ルート部分木の外にある異常状態では、下降操作を行わない。通常フローではこの状態を作らない。
- Criteria変更後も選択ノードは変更しない。
- Criteria変更はナビゲーション履歴へ新しい履歴項目を追加しない。

既存のツリー操作との割り当ては次のように共存する。

| キー | 既存／新規動作 |
|---|---|
| `ArrowLeft` | 選択を親ノードへ移動 |
| `Shift + ArrowLeft` | 選択ノードを閉じる |
| `Ctrl + ArrowLeft` | Criteriaを親へ上げる |
| `Alt + ArrowLeft` | ナビゲーション履歴を戻る |
| `ArrowRight` | 選択ノードを開く、または子へ移動 |
| `Shift + ArrowRight` | 選択ノードを開く |
| `Ctrl + ArrowRight` | Criteriaを選択ノードへ向けて下げる |

現行の`KeyboardController`は修飾キーの完全一致でコマンドを判定しているため、これらは別コマンドとして共存できる。

### 4.3 Criteria変更後の表示

Criteria変更後はDOMの再描画を待ち、選択ノードが見える位置へ自動スクロールする。スクロール規則は「7. 自動スクロール」を参照する。

## 5. ノード遷移機能

### 5.1 リファレンスグラフからの遷移

`ReferenceGraphPanel.svelte`のReferences／Dependencies一覧に表示している次のノードIDを、内部遷移用のリンクとして表示する。

- `node-{reference.sourceNodeId}`
- `node-{dependency.targetNodeId}`

表示仕様:

- 下線を表示する。
- ホバー時に色または背景を変え、クリック可能であることを示す。
- `cursor: pointer`を使用する。
- キーボード操作とアクセシビリティを確保するため、`span`のクリック処理ではなく`button type="button"`を推奨する。
- 見た目はテキストリンクにする。
- `aria-label`には遷移先ノードIDを含める。
- `:focus-visible`のフォーカス表示を設ける。

クリックすると、共通のノードナビゲーション機構へ対象ノードIDを渡す。`TreeStore.selectedNodeId`を直接変更しない。

現行の`ReferenceGraphPanel.svelte`は選択ノード変更時にパネルを閉じる。この既存挙動は維持し、遷移後はリファレンスグラフを閉じる。

### 5.2 ジャンプ時の履歴

新しいジャンプを開始する直前に、現在位置を戻る履歴へ追加する。

```ts
{
  selectedNodeId: currentSelectedNodeId,
  viewRootNodeId: currentViewRootNodeId,
}
```

履歴へ追加するのは、リファレンスリンクなどによる**明示的なジャンプ**だけとする。

次の操作は履歴へ追加しない。

- ツリー行の通常クリック
- 上下左右キーによる通常の選択移動
- `Q`、`Ctrl + ArrowLeft`、`Ctrl + ArrowRight`によるCriteria変更
- ノードの開閉
- ノード編集後の再選択

通常の選択変更まで記録すると、履歴が細かなカーソル移動で埋まり、定義ジャンプの戻る操作として役に立たなくなるためである。

同じ選択ノードと同じCriteriaへのジャンプは履歴へ追加しない。

### 5.3 スマートCriteria

ジャンプ先と現在のCriteriaの関係に応じて、次の規則を適用する。

| 現在の状態 | ジャンプ後のCriteria |
|---|---|
| Criteria未設定（プロジェクト全体表示） | Criteria未設定を維持する |
| ジャンプ先が現在のCriteria部分木内 | 現在のCriteriaを維持する |
| ジャンプ先が現在のCriteria部分木外 | ジャンプ先ノードを新しいCriteriaにする |

この規則により、通常の全体表示中にジャンプするたび表示範囲が狭まることを防ぎつつ、集中表示中に範囲外へジャンプした場合は、移動先へ集中対象を切り替えられる。

ジャンプ先がプロジェクトルートの場合は、CriteriaへプロジェクトルートIDを設定せず、Criteria未設定（`null`）へ正規化する。

範囲外ジャンプの直後に周辺構造を確認したい場合は、`Ctrl + ArrowLeft`でCriteriaを必要な階層まで上げる。

ジャンプ先を無条件にCriteriaへ設定しない。リーフノードへの遷移で1行しか表示されず、毎回Criteriaを上げる操作が必要になるのを避けるためである。全体表示から明示的に集中したい場合は、遷移後に`Q`を押す。

### 5.4 ジャンプの処理順序

1. ジャンプ先ノードが現在の実ツリーに存在することを確認する。
2. 現在の`selectedNodeId`と`viewRootNodeId`を戻る履歴へ追加する。
3. 新しいジャンプであるため、進む履歴をクリアする。
4. スマートCriteria規則から遷移後の`viewRootNodeId`を決定する。
5. 表示ルートからジャンプ先までの祖先を必要に応じて開く。
6. `TreeStore.selectedNodeId`をジャンプ先へ変更する。
7. Criteriaおよびツリーの更新を反映する。
8. DOMの再描画を待つ。
9. ジャンプ先ノードを見やすい位置へスクロールする。

存在しないノードIDへのジャンプでは、履歴や選択状態を変更しない。

## 6. ナビゲーション履歴

### 6.1 戻る操作

`Alt + ArrowLeft`で、直前の明示的なジャンプ元へ戻る。

処理順序:

1. 現在位置を進む履歴へ追加する。
2. 戻る履歴から最後の有効な項目を取り出す。
3. 履歴のCriteriaを復元する。
4. Criteriaから履歴の選択ノードまでの祖先を必要に応じて開く。
5. 選択ノードを復元する。
6. DOMの再描画後、選択ノードを見やすい位置へスクロールする。

`Alt + ArrowLeft`はWebViewやブラウザーの戻る操作と衝突する可能性がある。Develop Workspaceでショートカットを受け付けられる状態では、履歴の有無にかかわらず`preventDefault()`と`stopPropagation()`を行い、アプリ内ショートカットとして扱う。戻る履歴がない場合は、イベントを消費したうえで状態を変更しない。

### 6.2 進む履歴

初回実装で`Alt + ArrowRight`のUI操作を公開することは必須ではない。ただし、履歴管理は戻るスタックと進むスタックの2スタック構造にする。

- 戻る操作時: 現在位置を進むスタックへ積む。
- 進む操作時: 現在位置を戻るスタックへ積む。
- 新規ジャンプ時: 進むスタックをクリアする。

これにより、将来`Alt + ArrowRight`を追加するときに履歴モデルを変更せずに済む。

### 6.3 手動操作後の履歴

ジャンプ後に通常選択やCriteria変更を行っても、直前の戻る履歴は維持する。

例:

1. AからBへジャンプする。履歴へAが積まれる。
2. B付近でCを通常選択する。
3. `Q`でCをCriteriaにする。
4. `Alt + ArrowLeft`を押す。
5. Aの選択と、Aからジャンプする直前のCriteriaへ戻る。

戻る時点のCとCriteriaは進む履歴へ保存する。

### 6.4 履歴の有効期間

履歴はプロジェクトファイルへ保存しない。Develop Workspaceの編集セッション内だけで保持する。

次の場合は戻る履歴と進む履歴をクリアする。

- 新規プロジェクト開始
- 別プロジェクトの読み込み
- `TreeStore.replaceRoot()`相当のルート全置換

履歴上限は100件程度を推奨する。上限を超えた場合は最も古い項目から破棄する。

### 6.5 削除済みノード

- 戻る／進む履歴の`selectedNodeId`が存在しない場合、その履歴項目をスキップして次を探す。
- `selectedNodeId`は存在するが`viewRootNodeId`が削除済みの場合、Criteria未設定へフォールバックする。
- 有効な履歴項目がなくなった場合は何もしない。

## 7. 自動スクロール

### 7.1 基本方針

スクロール位置は履歴に保存せず、次の操作後に現在のDOMから算出する。

- ノードへのジャンプ
- 履歴の戻る／進む
- Criteriaの設定、上昇、下降

選択ノードの縦位置は、スクロール領域の上端からおよそ35%の位置を目標にする。

```ts
const desiredTop = nodeOffsetTop - viewportClientHeight * 0.35
const nextScrollTop = clamp(desiredTop, 0, scrollHeight - viewportClientHeight)
```

中央より少し上に置くことで、選択ノードの子孫を確認しやすくする。

### 7.2 横方向

- 選択ノードのラベル全体が既に表示されている場合、`scrollLeft`を変更しない。
- 左端または右端からはみ出している場合だけ、ラベルが余白付きで見える最小限のスクロールを行う。
- 深い階層のインデントすべてを必ず表示する必要はない。選択ノードのラベル可読性を優先する。

### 7.3 描画タイミング

Criteria変更や祖先展開の直後は、対象行の位置とスクロール領域の高さがまだ確定していない。次の順序を守る。

1. ストアと`isOpen`を更新する。
2. Svelteの`tick()`を待つ。
3. 必要なら`requestAnimationFrame()`を1回待つ。
4. 対象行とスクロールコンテナの矩形を取得する。
5. スクロール位置を計算して適用する。

ツリー行には、DOMから対象を安全に取得できる属性を設ける。

```svelte
<div class="tree-row" data-node-id={row.node.id}>...</div>
```

CSSセレクターへ外部入力を直接組み立てる必要がないよう、数値ノードIDだけを使用するか、行要素のMapを管理する。

### 7.4 対象を描画できない場合

祖先展開とCriteria復元後も対象行を取得できない場合は、スクロールだけを試行し続けない。状態不整合として安全に処理を終了する。開発時には原因を追跡できるログまたはテスト可能な失敗結果を返してよい。

## 8. 推奨アーキテクチャ

名称は実装時に既存規約へ合わせて調整してよいが、責務は次のように分ける。

### 8.1 TreeViewportController／Store

責務:

- `viewRootNodeId`の保持
- 実ツリーから表示ルートを解決
- Criteriaの設定、上昇、下降
- 選択ノードがCriteria部分木内かの判定
- 削除やルート置換後のCriteria整合性修復
- TreeViewへ「選択ノードを表示せよ」という要求を通知

CriteriaはUIの一時状態なので、mbcスキーマへ追加しない。

### 8.2 TreeNavigationController

責務:

- `jumpToNode(nodeId)`
- `goBack()`
- 将来の`goForward()`
- 戻る／進む履歴の管理
- スマートCriteriaの適用
- 無効・削除済み履歴のスキップ
- プロジェクト切替時の履歴クリア
- TreeViewportControllerへの自動表示要求

リファレンスグラフ固有のロジックを持たせない。将来、次の機能から共通利用できるようにする。

- 式や識別子から定義へ移動
- 検証エラー一覧から該当ノードへ移動
- 検索結果からノードへ移動
- ブックマークからノードへ移動

### 8.3 TreeNodeヘルパー

既存の`tree-node.ts`へ、重複した再帰処理を避けるため次のヘルパー追加を検討する。

```ts
findPath(rootNode, nodeId): Node[] | null
findParent(rootNode, nodeId): Node | null
isDescendantOrSelf(rootNode, ancestorId, targetId): boolean
openPath(rootNode, fromNodeId, targetNodeId): boolean
```

`openPath`がツリーを変更した場合は、`TreeNode.clone()`または現行ストア規約に従って`rootNode`ストアへ更新を通知する。

### 8.4 TreeView

変更点:

- `TreeStore.rootNode`全体ではなく、解決した表示ルートから行を構築する。
- 各行をノードIDから取得できるようにする。
- ナビゲーション／Criteria変更後の自動スクロールをDOM描画後に実行する。
- 選択状態そのものは従来どおり`TreeStore.selectedNodeId`を参照する。

表示ルートを変えても、ノードオブジェクトを別ツリーとして複製しない。同じ実ツリー内のノードを表示起点として利用し、開閉状態を共有する。

### 8.5 キーボード処理

関連ファイル:

- `apps/studio/src/system/keyboard/app-keyboard-controller.ts`
- `apps/studio/src/system/keyboard/keyboard-controller.ts`
- `apps/studio/src/system/keyboard/shortcut-registry.ts`
- `apps/studio/src/system/keyboard/shortcut-command.ts`

注意点:

- `AppKeyboardController`の入力欄、ダイアログ、メニュー、ランタイム表示中のブロック規則を継続して使用する。
- `Q`は入力欄や編集可能要素で発火させない。
- Criteria導入後、キーボード操作へ渡す`visibleNodes`も表示ルート基準で生成する。現状のように常にプロジェクトルートから生成すると、非表示ノードへキーボード選択が移動する可能性がある。
- `Alt + ArrowLeft`はDevelop Workspaceでショートカットを受け付けられる状態なら常にイベントを消費し、有効な履歴がある場合だけ状態を変更する。

### 8.6 リファレンスグラフ

関連ファイル:

- `apps/studio/src/system/analysis/ReferenceGraphPanel.svelte`
- `apps/studio/src/system/analysis/reference-graph.ts`
- `apps/studio/src/system/analysis/reference-graph-controller.ts`

`reference-graph.ts`が返す`sourceNodeId`と`targetNodeId`は、既に実ツリー上の遷移先を指している。グラフ解析方式を変更せず、そのIDをナビゲーションへ渡す。

ノードIDは実ツリー内の数値IDであり、App、Component、Styleなどの定義UUIDとは役割が異なる。ナビゲーション履歴は同一編集セッション内のツリーノード位置を指すため、数値ノードIDを使用してよい。

## 9. 状態不整合への対応

### 9.1 Criteriaノードの削除

Criteria自身が削除された場合は、その削除操作で選択される有効な親ノードを新しいCriteria候補にする。親がプロジェクトルートの場合、または親を特定できない場合はCriteria未設定へ戻す。

削除後に存在しない`viewRootNodeId`を保持し続けて、ツリー全体が空表示にならないようにする。

### 9.2 選択ノードの削除

既存の`TreeStore.removeNode()`は削除後に親ノードを選択する。この動作を維持する。親ノードが現在のCriteria部分木外になる場合は、Criteriaも親ノードまたはプロジェクトルートへ補正する。

### 9.3 ルート置換

プロジェクト読込などで実ツリーを全置換した場合:

- Criteriaを未設定へ戻す。
- ナビゲーション履歴をクリアする。
- 選択ノードは現行の`TreeStore.replaceRoot()`どおり、新しいプロジェクトルートにする。

### 9.4 ノード移動

ノードの並べ替えや将来のリファクタリングでノードの親が変わった場合、数値ノードIDが維持されていれば選択と履歴は有効である。ただし、現在のCriteria部分木外へ移動した選択ノードについては表示範囲を再判定し、必要ならCriteria未設定へ戻す。

## 10. 実装順序

Criteriaとナビゲーションは同じタイミングで実装するが、次の順序で段階的に組み立てる。

1. `TreeNode`へパス・祖先・包含判定ヘルパーを追加する。
2. `TreeViewportState`とCriteria操作を追加する。
3. TreeViewを表示ルート基準の描画へ変更する。
4. `Q`、`Ctrl + ArrowLeft`、`Ctrl + ArrowRight`を追加する。
5. 自動スクロール要求とTreeView側のDOM処理を追加する。
6. `TreeNavigationController`と戻る／進む履歴を追加する。
7. `Alt + ArrowLeft`を追加する。
8. リファレンスグラフのノードIDをリンク化し、`jumpToNode()`へ接続する。
9. 削除・ルート置換時の整合性修復を追加する。
10. 単体テスト、コンポーネントテスト、手動確認を行う。

## 11. テスト仕様

### 11.1 TreeNodeヘルパー

- ルートから対象までのパスを返す。
- 存在しないIDでは`null`を返す。
- 自身を子孫または自身として判定する。
- 深い子孫を正しく判定する。
- 対象までの祖先だけを開き、無関係なノードの開閉状態を変更しない。

### 11.2 Criteria

- `Q`で選択ノードが表示ルートになる。
- Criteriaより上の親と兄弟が表示されない。
- `Ctrl + ArrowLeft`で1階層ずつ上がる。
- プロジェクトルートまで上がるとCriteria未設定になる。
- `Ctrl + ArrowRight`で選択ノードへのパスを1階層ずつ下がる。
- 選択ノードとCriteriaが同じ場合は下降しない。
- Criteria変更で選択ノードが変わらない。
- Criteria変更がナビゲーション履歴を増やさない。
- キーボード選択が非表示部分木へ移動しない。

### 11.3 スマートCriteria付きジャンプ

- Criteria未設定時のジャンプでCriteriaを設定しない。
- 現Criteria配下へのジャンプでCriteriaを維持する。
- 現Criteria外へのジャンプで対象ノードをCriteriaにする。
- 閉じた階層内へのジャンプで必要な祖先が開く。
- 存在しないノードへのジャンプで履歴・Criteria・選択を変更しない。
- 同じ位置へのジャンプで重複履歴を追加しない。

### 11.4 履歴

- AからB、BからCへジャンプした後、戻る操作でB、Aの順に戻る。
- 戻ると選択ノードとCriteriaの両方が復元される。
- 通常クリックや矢印キーで履歴が増えない。
- Criteriaを手動変更した後も、戻るとジャンプ直前のCriteriaへ戻る。
- 新規ジャンプで進む履歴がクリアされる。
- 削除済み選択ノードの履歴をスキップする。
- 削除済みCriteriaはCriteria未設定へフォールバックする。
- プロジェクトのルート置換で履歴がクリアされる。
- 履歴上限を超えると古い項目が破棄される。

### 11.5 自動スクロール

- ジャンプ後、対象行がビューポート内に表示される。
- 対象行がおおむね上から35%の位置になる。
- 上端・下端付近ではスクロール可能範囲に丸められる。
- ウインドウサイズ変更後も、その時点の高さから位置を再計算する。
- 開閉状態が変わっていても対象行を基準に再計算する。
- 横方向にラベルが隠れている場合だけスクロールする。
- 描画前の古いDOM位置を使わない。

### 11.6 リファレンスグラフUI

- ReferencesのノードIDがキーボード操作可能なリンクになる。
- DependenciesのノードIDも同じリンクになる。
- クリックで対象ノードへジャンプする。
- 遷移後にリファレンスグラフが閉じる。
- ホバー、フォーカス、下線表示がある。

## 12. 手動確認シナリオ

### シナリオA: 全体表示から参照先へ移動

1. Criteria未設定で任意のノードを選択する。
2. `R`でリファレンスグラフを開く。
3. 別ノードのリンクをクリックする。
4. Criteria未設定のまま、対象ノードが選択され見やすい位置へ表示されることを確認する。
5. `Alt + ArrowLeft`で元のノードへ戻ることを確認する。

### シナリオB: 集中表示から範囲外へ移動

1. 任意の深いノードを選択し、`Q`でCriteriaにする。
2. リファレンスグラフからCriteria外のノードへジャンプする。
3. 遷移先が新しいCriteriaになることを確認する。
4. `Ctrl + ArrowLeft`で親階層を段階的に表示できることを確認する。
5. `Alt + ArrowLeft`で元の選択ノードとCriteriaへ戻ることを確認する。

### シナリオC: Criteria内の移動

1. Criteriaを設定する。
2. Criteria配下の別ノードへジャンプする。
3. Criteriaが変更されないことを確認する。
4. 戻る操作で元の選択へ戻ることを確認する。

### シナリオD: 開閉状態とウインドウサイズ

1. AからBへジャンプする。
2. B付近で複数ノードを開閉する。
3. ウインドウサイズを変更する。
4. `Alt + ArrowLeft`でAへ戻る。
5. 過去のスクロール値ではなく、現在の表示状態に合わせてAが見やすく表示されることを確認する。

### シナリオE: 削除済み履歴

1. AからBへジャンプする。
2. AまたはAのCriteriaを削除する。
3. 戻る操作で空画面や例外にならず、有効な履歴へのスキップまたはCriteria未設定へのフォールバックが行われることを確認する。

## 13. 完了条件

- Criteriaによって実ツリーを変更せず、表示する部分木だけを切り替えられる。
- 指定した3つのCriteriaショートカットが既存ツリー操作と競合せず動作する。
- リファレンスグラフのReferences／Dependenciesから対象ノードへ遷移できる。
- Criteria範囲内・範囲外のジャンプでスマートCriteria規則が適用される。
- `Alt + ArrowLeft`でジャンプ前の選択ノードとCriteriaへ戻れる。
- 通常のノード選択が履歴を汚さない。
- スクロール値を保存せず、描画後のノード位置とビューポートサイズから表示位置を算出する。
- 削除済みノード、Criteria削除、プロジェクト切替で不整合や空画面が発生しない。
- 既存のツリー操作、編集ダイアログ、リファレンスグラフ、式検証表示を壊さない。
- `npm run check --workspace @mebaco/studio`と`npm test --workspace @mebaco/studio`が成功する。

## 14. 対象外・将来拡張

初回実装の対象外:

- Criteriaやナビゲーション履歴のmbcファイル保存
- 過去の開閉状態の復元
- 過去のピクセル単位のスクロール位置復元
- 式エディター内の識別子を`Ctrl + Click`して定義へ移動する機能
- ブックマークUI
- ナビゲーション履歴一覧UI
- 複数プロジェクトをまたぐ履歴

将来拡張:

- `Alt + ArrowRight`による進む操作
- 式、検証結果、検索結果からの定義ジャンプ
- Criteriaを保存するブックマーク
- 戻る／進むボタンと履歴ドロップダウン

これらはすべて`TreeNavigationController`と`TreeViewportState`を再利用して実装する。

## 15. 旧Front Drivenから引き継ぐ考え方

旧アプリ`C:\app\git\front_driven_dev`では、次のように実装されていた。

- `focus`: 選択ノード
- `criteriaNode`: 見た目上のルート
- `criteriaNode ?? rootElementNode`: ツリーへ渡す表示起点
- `Root`、`Higher`、`Criteria`: Criteria操作
- ブックマークの`Switch`: ブックマークノードをCriteriaへ設定

主な参照先:

- `src/module/system/contents/develop/function/tree/structManageTab.tsx`
- `src/module/common/component/tree/treeUtil.tsx`
- `src/module/system/contents/develop/function/markNode/markNodeFrame.tsx`

新Mebacoでは「選択とCriteriaを分離する」という考え方を引き継ぎつつ、オブジェクト参照ではなくノードIDをUI状態として保持し、リファレンスグラフや将来の定義ジャンプと共通化されたナビゲーション機構へ発展させる。
