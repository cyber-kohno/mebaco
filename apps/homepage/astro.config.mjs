import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Mebaco',
      description: 'UIを組み、振る舞いを記述し、その場で動かすローカルアプリ開発環境。',
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: '日本語', lang: 'ja' },
      },
      logo: { src: './src/assets/mebaco-mark.svg', alt: 'Mebaco' },
      customCss: ['./src/styles/site.css'],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 },
      sidebar: [
        { label: '製品紹介', items: [
          { slug: 'index', label: 'Mebacoとは' },
          { slug: 'concepts', label: '基本概念' },
          { slug: 'concepts/project-model', label: 'Projectの構造' },
          { slug: 'concepts/component', label: 'ComponentとRetention' },
          { slug: 'concepts/expressions-and-scope', label: '式とスコープ' },
        ] },
        { label: 'はじめる', items: [
          { slug: 'start', label: 'はじめ方' },
          { slug: 'start/install', label: 'インストール' },
          { slug: 'start/first-project', label: '最初のProject' },
        ] },
        { label: '使い方ガイド', items: [
          { slug: 'guides', label: 'ガイド一覧' },
          { slug: 'guides/build-ui', label: 'UIを組み立てる' },
          { slug: 'guides/state-and-actions', label: 'StateとAction' },
          { slug: 'guides/reuse-components', label: 'Componentを再利用する' },
          { slug: 'guides/style-app', label: 'Styleを適用する' },
          { slug: 'guides/resources-storage', label: 'ResourceとStorage' },
          { slug: 'guides/debug', label: 'デバッグする' },
          { slug: 'guides/distribute', label: 'アプリを配布する' },
        ] },
        { label: 'リファレンス', items: [
          { slug: 'reference', label: 'リファレンス概要' },
          { slug: 'reference/elements', label: '要素一覧と仕様台帳' },
          { slug: 'reference/expressions', label: '式・コード' },
          { slug: 'reference/types', label: '型システム' },
          { slug: 'reference/project-files', label: '保存形式とBundle' },
        ] },
        { label: 'レシピ・運用', items: [
          { slug: 'recipes', label: 'レシピ' },
          { slug: 'mcp', label: 'MCP・AI連携' },
          { slug: 'troubleshooting', label: 'トラブルシューティング' },
        ] },
        { label: '配布情報', items: [
          { slug: 'download', label: 'ダウンロード' },
          { slug: 'compatibility', label: '対応環境・互換性' },
          { slug: 'changelog', label: 'リリースノート' },
          { slug: 'legal/license', label: 'ライセンス' },
          { slug: 'legal/privacy', label: 'プライバシー' },
        ] },
      ],
    }),
  ],
});
