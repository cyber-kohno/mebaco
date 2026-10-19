# Code

`code/`にはmebacoのアプリ、共通モジュール、ビルド・リリース用ファイルをまとめます。リポジトリ全体の設定と資料はルートに置きます。

| 配置 | 内容 |
|---|---|
| `apps/studio` | Studioデスクトップアプリ |
| `apps/mcp` | Studio連携用MCPサーバー |
| `apps/homepage` | 製品サイト |
| `crates/mcp-protocol` | MCP通信契約・世代判定 |
| `crates/mcp-transport` | MCPからStudioへのloopback通信 |
| `release` | Studio/MCPの製品情報正本、同期検査、組み合わせ検証 |
| `package.json` / lockfile | npm workspaceと依存関係 |

以下のコマンドはリポジトリルートから実行します。

```powershell
npm ci --prefix code
npm --prefix code run check:docs
npm --prefix code/apps/studio run check
npm --prefix code/apps/studio run test
npm --prefix code/apps/studio run build
node code/release/check-studio-mcp-suite.mjs
cargo test --locked --manifest-path code/crates/mcp-protocol/Cargo.toml
cargo test --locked --manifest-path code/crates/mcp-transport/Cargo.toml
cargo check --locked --manifest-path code/apps/mcp/Cargo.toml
```

MCP通信世代の正本と更新・検証手順は [`release/README.md`](release/README.md) を参照してください。
