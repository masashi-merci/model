import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ArticleHighlights, { articlePath } from '../src/components/ArticleHighlights';
import ArticleImage from '../src/components/ArticleImage';
import { News, Work } from '../src/types';

const rows: Work[] = Array.from({ length: 7 }, (_, i) => ({ id: `work-${i}`, title: `Project ${i}`, description: 'Editorial description', date: '2026-10-30', created_at: '2026-10-30T00:00:00Z', active: true, image: '/fixture.jpg', category: 'CAMPAIGN' }));
const render = (items: Work[] | News[], kind: 'works' | 'news' = 'works', loading = false, error = false) => renderToStaticMarkup(<MemoryRouter><ArticleHighlights kind={kind} items={items} loading={loading} error={error} /></MemoryRouter>);

test('highlights expose latest one plus at most four siblings and More route', () => {
  const html = render(rows);
  assert.equal((html.match(/<article/g) || []).length, 5);
  assert(html.includes('href="/works"'));
  assert(html.includes('href="/works/work-0"'));
  assert(!html.includes('Project 5'));
  assert(html.indexOf('Project 0') < html.indexOf('Project 1'));
  assert(html.includes('58fr') && html.includes('42fr'));
  assert(html.includes('aspect-[4/3]'));
  assert(!html.includes('2026-10-30'));
});
test('zero and one article are valid layouts', () => {
  assert(render([]).includes('No works updates at this time.'));
  assert.equal((render(rows.slice(0, 1)).match(/<article/g) || []).length, 1);
  assert(!render(rows.slice(0, 1)).includes('Project 1'));
});
test('news content has working article links and never renders metadata dates', () => {
  const news: News[] = rows.map(({ description, category, ...r }) => ({ ...r, content: description, isGrayscale: true }));
  const html = render(news, 'news');
  assert(html.includes('href="/news/work-0"'));
  assert(html.includes('Editorial description'));
  assert(!html.includes('2026'));
  assert(html.includes('grayscale'));
});
test('loading and error states do not pretend there are no articles', () => {
  assert(render([], 'works', true).includes('Loading works'));
  assert(render([], 'news', false, true).includes('Unable to load news'));
});
test('missing image has accessible neutral fallback; titles remain escaped', () => {
  const html = renderToStaticMarkup(<ArticleImage title={'<script>alert(1)</script>'} />);
  assert(html.includes('image unavailable'));
  assert(!html.includes('<script>'));
});
test('article route IDs are encoded', () => {
  assert.equal(articlePath('news', 'a/b'), '/news/a%2Fb');
});
