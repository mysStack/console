import assert from 'node:assert/strict';
import test from 'node:test';

import { createUnauthorizedRedirect, shouldRedirectAfterUnauthorized } from './authRedirect';

test('redirects only once through logout when the backend session is invalid', () => {
  const redirects: string[] = [];
  const redirect = createUnauthorizedRedirect(url => redirects.push(url));

  redirect();
  redirect();

  assert.deepEqual(redirects, ['/logout']);
});

test('does not redirect failed login requests or permission errors', () => {
  assert.equal(
    shouldRedirectAfterUnauthorized(401, '/kapis/tenant.kubesphere.io/v1beta1/metrics'),
    true,
  );
  assert.equal(shouldRedirectAfterUnauthorized(401, '/login'), false);
  assert.equal(shouldRedirectAfterUnauthorized(401, '/login/confirm'), false);
  assert.equal(shouldRedirectAfterUnauthorized(401, '/oauth/login/ldap'), false);
  assert.equal(
    shouldRedirectAfterUnauthorized(403, '/kapis/tenant.kubesphere.io/v1beta1/metrics'),
    false,
  );
});
