# Studio / MCPのrelease情報と通信世代

`code/release/studio-mcp.json`がStudioと独立MCPの製品version・MCP通信世代の正本。
初回対応版は製品`0.1.1`、`bridgeProtocolGen=1`。
API/Schema世代は`code/apps/studio/src/system/version.ts`の既存定数を読み、値・数値型を維持する。

## 接続条件と世代更新

接続条件は双方の`bridgeProtocolGen`が正の整数で完全一致することだけ。
製品version、API/Schema世代、ResourceのmodelVersion、標準MCPのprotocolVersionは比較しない。
世代情報なし・不正・0・異世代は拒否し、旧形式へのfallbackは行わない。

MCPから見えるtool/resource/method、引数・応答・エラー、Kind/式/Style/Retention等の仕様、
編集checkout/checkin/cancel/復旧、Preview、内蔵解説の対象仕様を変えるときに世代を上げる。
後方互換な追加も対象。GUIだけの変更、契約を維持する内部整理・障害修正・誤字修正では維持する。
修正の分類名ではなく、MCP向け契約が変わるかで判断する。

世代の更新漏れは番号の比較だけでは検出できない。リリース時に契約差分と回帰試験をレビューする。
認証・checkoutId・expectedRevision・既存の権限/操作検査は引き続き必要。

## release情報の更新

以下の検査コマンドはリポジトリルートから実行する。

1. `studio-mcp.json`を更新する。配布済みversionへ異なる内容を上書きしない。
2. Studioの`code/apps/studio/package.json` / package-lock.json、`code/package-lock.json`の`packages/apps/studio` / Cargo.toml / tauri.conf.json、MCPのCargo.tomlを同期する。
   ルートnpm・Homepage・内部crateの製品versionは同期対象ではない。
3. 両アプリのCargo.lockをCargoで更新し、外部依存の意図しない更新がないことを確認する。
4. 以下の検査を実行する。通信世代を意図して変えた場合はbaseline fixtureの期待値もレビューする。

```powershell
node code/release/check-studio-mcp.mjs
node code/release/check-studio-mcp-suite.mjs
```

統合検証はoffline/lockedのRust検査・テスト、Nodeのrelease試験、Studio型検査/Vitest/Frontend build、
MCP debug exeのstdio/Resource/自己紹介、隔離した実プロセス間の組み合わせ検査を行う。
既存toolchainと依存cacheが必要。依存のinstall、GUI起動、実プロジェクトへの接続、設定変更、配布は行わない。
ログは`code/apps/mcp/target/generation-checks/`。

ブラウザー試験も含める場合:

```powershell
# playwrightを通常のmodule解決で取得できない場合は、既存installのentrypointのfile URLを設定する。
# $env:MEBACO_PLAYWRIGHT_MODULE = 'file:///.../playwright/index.mjs'
node code/release/check-studio-mcp-suite.mjs --browser
```

既定は既存Edgeのheadless実行。`MEBACO_TEST_BROWSER_CHANNEL=chrome`へ変更可能。
ブラウザー試験は隔離fixtureで診断UIと実Svelte Previewを確認し、実Tauriの確認を代替しない。

## ビルドと識別情報

- `code/crates/mcp-protocol`はDTO・純粋判定だけ。`code/crates/mcp-transport`は有界なloopback HTTPクライアント。
- 両Rust build.rsが共通helperで正本・自分のCargo versionを検査し、OUT_DIRへidentityを生成する。
- Studio Vite/Vitestは同じvirtual moduleから情報を取得する。APP_VERSIONの既存exportを維持する。
- Vite buildは`dist/product-identity.json`を生成する。Studio Rustのrelease buildは一致を必須とする。
  Frontendを先にbuildすること。debugではdev serverを使えるよう、このreceiptを必須にしない。
- identity入力の変更でViteは再起動する。Rustも再ビルド・再起動が必要。
- MCPは`--version`/`-V`、`--version-json`、pingのidentityを提供する。引数なしは従来のstdio。
  Studioは`get_product_info`と`mcp_diagnostics`の安全なIPC snapshotを提供する。

descriptorは16 KiBまで、HTTP応答headerは16 KiB/bodyは32 MiBまで。
クライアントはconnect最大500 ms、health全体2秒、bridge全体7秒。送信と受信の両方に絶対deadlineを適用する。
Studioはbody 64 KiB、request読取全体2秒、WebView待ち5秒、直列受付を維持する。
Windowsではaccept後のstreamを明示的にblockingへ戻し、listenerのnonblocking継承による一時的な400を防ぐ。

## 接続・診断

MCPは各操作で認証付きhealthを確認し、非互換相手へPOSTしない。
Studioは認証・envelope解析の後、世代と対象sessionIdをpending登録・WebView eventより前に確認する。
HTTP 409の構造化エラーはcode/messageと双方のcontractを持つ。

一覧のstatusはcompatible/incompatible/legacy/invalid/unavailable。操作対象は`compatible=true`だけ。
内部descriptorのtoken/endpointを公開session DTOへ出さない。
固定ResourceはStudio未起動でも取得でき、本文・metadataに対象世代を表示する。

Studioは直近8グループまで拒否を集約し、公開・外部要求の受付履歴・拒否を区別する。
healthと内部pingを受付数へ加算しない。MCP事前拒否はStudioで観測していないため表示しない。
拒否履歴へtoken・生の要求・ソース・不正入力・相手の自由なmessageを保存しない。
停止/再公開で履歴をリセットし、UIは別セッションの古いIPC応答を破棄する。

## 初回の実機確認・入替

[実装記録と実機確認手順](../docs/MCP_BRIDGE_GENERATION_IMPLEMENTATION.md)を参照。
工程1〜4の自動検証成功と、工程5の実Tauri/利用側AIクライアントの確認を分けて記録する。
稼働中のstdioプロセス停止・正式exe差し替え・設定変更はこの検査scriptでは行わない。
