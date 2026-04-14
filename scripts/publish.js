import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// ── Config ─────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// .env 파일에서 API 키 읽기
const envPath = path.join(ROOT, ".env");
const NOTION_KEY = readFileSync(envPath, "utf-8").trim();
const DATABASE_ID = "44915bc8-ea4d-4f25-9e62-6a5f2d8149ab";

const notion = new Client({ auth: NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// ── Helpers ────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function toArray(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  return dateStr.split("T")[0];
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log("📋 Ready 상태 글 확인 중...");

  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: "Status", select: { equals: "Ready" } },
  });

  if (response.results.length === 0) {
    console.log("✅ Ready 상태 글이 없습니다.");
    return;
  }

  console.log(`📝 ${response.results.length}개 발견\n`);
  const published = [];

  for (const page of response.results) {
    const props = page.properties;

    const title = props.Title?.title?.[0]?.plain_text ?? "untitled";
    const date = formatDate(props.Date?.date?.start ?? page.created_time);
    const tags = toArray(props.Tags?.multi_select?.map
      ? JSON.stringify(props.Tags.multi_select.map(t => t.name))
      : "[]");
    const categories = toArray(props.Categories?.multi_select?.map
      ? JSON.stringify(props.Categories.multi_select.map(c => c.name))
      : "[]");
    const description = props.Description?.rich_text?.[0]?.plain_text ?? "";

    console.log(`  처리 중: ${title}`);

    // 본문 변환
    const mdBlocks = await n2m.pageToMarkdown(page.id);
    const body = n2m.toMarkdownString(mdBlocks).parent;

    // front matter 생성
    const tagsYaml = tags.length ? `[${tags.join(", ")}]` : "[]";
    const catsYaml = categories.length ? `[${categories.join(", ")}]` : "[]";
    const descLine = description ? `\ndescription: "${description}"` : "";

    const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date} 00:00:00 +0900
categories: ${catsYaml}
tags: ${tagsYaml}${descLine}
---

`;

    // 파일명
    const slug = slugify(title);
    const filename = `${date}-${slug}.md`;
    const filepath = path.join(ROOT, "_posts", filename);

    if (existsSync(filepath)) {
      console.log(`  ⚠️  이미 존재: ${filename} (건너뜀)`);
      continue;
    }

    writeFileSync(filepath, frontmatter + body, "utf-8");
    console.log(`  ✅ 저장: _posts/${filename}`);

    // 노션 Status → Published
    await notion.pages.update({
      page_id: page.id,
      properties: { Status: { select: { name: "Published" } } },
    });

    published.push({ title, filename });
  }

  if (published.length === 0) {
    console.log("\n새로 발행된 글이 없습니다.");
    return;
  }

  // git commit + push
  console.log("\n🚀 Git 커밋 & 푸시 중...");
  const files = published.map(p => `_posts/${p.filename}`).join(" ");
  const msg = published.length === 1
    ? `feat(post): ${published[0].title}`
    : `feat(post): ${published.length}개 글 발행`;

  execSync(`git -C "${ROOT}" add ${files}`, { stdio: "inherit" });
  execSync(`git -C "${ROOT}" commit -m "${msg}"`, { stdio: "inherit" });
  execSync(`git -C "${ROOT}" push origin main`, { stdio: "inherit" });

  console.log("\n✨ 완료!");
  published.forEach(p => console.log(`  - ${p.title}`));
}

main().catch(err => {
  console.error("❌ 오류:", err.message);
  process.exit(1);
});
