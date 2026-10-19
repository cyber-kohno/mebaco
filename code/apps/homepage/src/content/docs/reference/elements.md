---
title: 要素一覧と仕様台帳
description: Studioに登録されている全Element kindと文書化の対象を管理します。
---

import ElementCatalog from '../../../components/ElementCatalog.astro';

<span class="doc-status">82種類をRegistry照合対象として登録</span>

## 台帳について

要素一覧はStudioの `ElementRegistry` と `element-catalog.mjs` を照合します。新要素の登録、名称変更、廃止があれば、カタログの差分が明らかになります。個別リファレンスの本文・根拠ソースは `element-reference-catalog.mjs` で追跡します。索引への登録と、個別仕様の整備は別の段階です。

StudioのElement Registryに登録された82 kindすべてに個別仕様ページを用意しました。全ページの共通項目と根拠ソースは仕様台帳で照合します。本文内容の正確性や、配布ビルドでの通し操作は担当者によるソース・デスクトップ確認を継続します。

<ElementCatalog />
