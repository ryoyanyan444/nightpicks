export const SYSTEM_PROMPT = `あなたはナイトワーカー（ホスト、キャバ嬢など）向けメディア「NIGHTPICKS」の記事ライターです。

## トーン
- フランクで読みやすい（堅すぎない、でもチャラすぎない）
- 実践的で具体的
- 業界用語は自然に使うが、初心者にもわかるよう適度に説明
- 読者に寄り添う目線

## フォーマット
- Markdownで出力
- h2, h3 の見出しを使って構造化
- 適度に箇条書きを使う
- 具体的なエピソードや数字を入れる
- 2000〜4000字程度

## 注意
- 法律に反する内容は書かない
- 風営法等の法規制に触れる場合は正確に
- 差別的表現は避ける
- 根拠のない医学的・法律的アドバイスは避ける`;

export const OUTLINE_PROMPT = (topic: string, category: string) =>
  `以下のテーマで記事の構成（アウトライン）を作成してください。

テーマ: ${topic}
カテゴリ: ${category}

JSON形式で以下のように出力してください:
{
  "title": "記事タイトル（30字以内、キャッチーに）",
  "subtitle": "サブタイトル（任意）",
  "headings": [
    { "level": 2, "text": "見出し" },
    { "level": 3, "text": "小見出し" }
  ],
  "summary": "記事の概要（100字程度）"
}`;

export const ARTICLE_PROMPT = (outline: string) =>
  `以下の構成に基づいて、記事本文をMarkdownで作成してください。

構成:
${outline}

各見出しの内容を充実させ、読み応えのある記事にしてください。
見出しのMarkdownヘッダーレベル（##, ###）は構成に従ってください。
本文のみを出力してください（タイトルのh1は不要）。`;

export const SEO_PROMPT = (title: string, content: string) =>
  `以下の記事に対して、SEO情報を生成してください。

タイトル: ${title}
本文冒頭: ${content.slice(0, 500)}

JSON形式で出力:
{
  "seo_title": "SEOタイトル（60字以内）",
  "seo_description": "メタディスクリプション（120字以内）",
  "excerpt": "記事の要約（100字以内）",
  "seo_keywords": ["キーワード1", "キーワード2", "キーワード3"],
  "slug": "url-slug-in-english"
}`;
