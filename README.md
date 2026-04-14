# Hadol_s

개발 기록, 프로젝트, PS 풀이를 남기는 개인 기술 블로그.

**[→ jhs9918.github.io](https://jhs9918.github.io)**

---

## Stack

- **Jekyll** — 정적 사이트 생성
- **GitHub Pages** — 호스팅 및 자동 배포
- **Notion** — 글 작성 에디터

## 로컬 실행

```bash
bundle install
bundle exec jekyll serve
# http://localhost:4000
```

## 글 발행

노션 [Posts DB](https://www.notion.so/3428e6f2770380f98100de95491f1dad)에서 작성 후 Status를 `Ready`로 변경하고 실행:

```bash
node scripts/publish.js
```

Notion → Markdown 변환, `_posts/` 저장, 커밋, 푸시까지 자동으로 처리된다.

## License

[MIT](./LICENSE)
