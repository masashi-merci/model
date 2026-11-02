import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import AdminGuard from '../src/components/AdminGuard';
import type { AdminSessionState } from '../src/lib/adminSession';

const render = (isAdmin: boolean, checking: boolean) => {
  const auth: AdminSessionState = { isAdmin, checking, user: null, error: null };
  return renderToStaticMarkup(<MemoryRouter><AdminGuard auth={auth}><div>protected dashboard</div></AdminGuard></MemoryRouter>);
};
test('route gate keeps verified content on revalidation and hides it for new, absent or rejected sessions', () => {
  assert.equal(render(true, true), render(true, false));
  assert.match(render(true, true), /protected dashboard/);
  assert.doesNotMatch(render(false, true), /protected dashboard/);
  assert.match(render(false, true), /Verifying administrator access/);
  assert.doesNotMatch(render(false, false), /protected dashboard/);
});
