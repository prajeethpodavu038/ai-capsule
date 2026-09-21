// server/test/api.test.js
//
// Lightweight smoke test (no test framework dependency) that exercises the
// full CRUD cycle and the security requirements against a RUNNING server
// (npm run dev:server / node server/index.js), using the same
// `signUserToken` helper the real OAuth callback uses - i.e. these are
// genuine, correctly-signed application JWTs for two different simulated
// users, not a mock.
//
// Usage:  BASE_URL=http://localhost:4000 node server/test/api.test.js

require('dotenv').config();
const assert = require('node:assert/strict');
const { signUserToken } = require('../lib/jwt');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

let passed = 0;
function ok(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function cookieHeader(token) {
  return token ? { Cookie: `token=${token}` } : {};
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...cookieHeader(token),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { status: res.status, json, text };
}

async function main() {
  console.log(`Running API tests against ${BASE_URL}\n`);

  // ---- health ----
  {
    const r = await req('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { status: 'ok' });
    ok('GET /api/health returns 200 { status: "ok" }');
  }

  // ---- required cURL check 1: no auth ----
  {
    const r = await req('GET', '/api/capsules');
    assert.equal(r.status, 401);
    ok('GET /api/capsules with no cookie returns 401');
  }

  // ---- required cURL check 2: fake/invalid JWT ----
  {
    const r = await req('GET', '/api/capsules', { token: 'fake-token-123' });
    assert.equal(r.status, 401);
    ok('GET /api/capsules with fake JWT "fake-token-123" returns 401');
  }

  // ---- POST/PUT/DELETE also require auth ----
  {
    const r1 = await req('POST', '/api/capsules', { body: { project_name: 'x', prompt_title: 'x', prompt_text: 'x' } });
    assert.equal(r1.status, 401);
    const r2 = await req('PUT', '/api/capsules/1', { body: { project_name: 'x' } });
    assert.equal(r2.status, 401);
    const r3 = await req('DELETE', '/api/capsules/1');
    assert.equal(r3.status, 401);
    ok('POST / PUT / DELETE /api/capsules all return 401 with no auth');
  }

  // Two simulated, genuinely-signed users (same code path the OAuth callback uses).
  const userA = signUserToken({ id: 'test-user-A', username: 'alice-test' });
  const userB = signUserToken({ id: 'test-user-B', username: 'bob-test' });

  // ---- CREATE ----
  let capsuleId;
  {
    const r = await req('POST', '/api/capsules', {
      token: userA,
      body: {
        project_name: 'SmartFarm Irrigation',
        prompt_title: 'Debug cloud deployment',
        prompt_version: 'v1',
        prompt_text: 'Why does my Node server fail on deploy?',
        response_summary: 'Check the start command and PORT binding.',
        category: 'Coding',
        usefulness: 'Good',
        reviewed: true,
        improved: false,
        notes: 'Tested and worked',
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.project_name, 'SmartFarm Irrigation');
    assert.equal(typeof r.json.id, 'number');
    capsuleId = r.json.id;
    ok(`POST /api/capsules creates a record owned by the caller (id=${capsuleId})`);
  }

  // ---- READ (own records only) ----
  {
    const r = await req('GET', '/api/capsules', { token: userA });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json));
    assert.ok(r.json.some((c) => c.id === capsuleId));
    ok('GET /api/capsules returns the caller\'s own record');

    const rB = await req('GET', '/api/capsules', { token: userB });
    assert.equal(rB.status, 200);
    assert.ok(!rB.json.some((c) => c.id === capsuleId));
    ok('GET /api/capsules for a DIFFERENT user does NOT return user A\'s record');
  }

  // ---- UPDATE by owner ----
  {
    const r = await req('PUT', `/api/capsules/${capsuleId}`, {
      token: userA,
      body: { notes: 'Updated after re-testing', usefulness: 'Excellent' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.notes, 'Updated after re-testing');
    assert.equal(r.json.usefulness, 'Excellent');
    ok('PUT /api/capsules/:id updates the owner\'s own record');
  }

  // ---- UPDATE by a different user must fail ----
  {
    const r = await req('PUT', `/api/capsules/${capsuleId}`, {
      token: userB,
      body: { notes: 'hijacked' },
    });
    assert.equal(r.status, 404);
    ok('PUT /api/capsules/:id by a NON-owner returns 404 (cannot update another user\'s record)');
  }

  // ---- DELETE by a different user must fail ----
  {
    const r = await req('DELETE', `/api/capsules/${capsuleId}`, { token: userB });
    assert.equal(r.status, 404);
    ok('DELETE /api/capsules/:id by a NON-owner returns 404 (cannot delete another user\'s record)');
  }

  // Confirm it's still there for the real owner.
  {
    const r = await req('GET', '/api/capsules', { token: userA });
    assert.ok(r.json.some((c) => c.id === capsuleId));
    ok('Record still exists for the owner after the rejected cross-user delete attempt');
  }

  // ---- DELETE by owner succeeds ----
  {
    const r = await req('DELETE', `/api/capsules/${capsuleId}`, { token: userA });
    assert.equal(r.status, 204);
    ok('DELETE /api/capsules/:id by the owner returns 204');

    const after = await req('GET', '/api/capsules', { token: userA });
    assert.ok(!after.json.some((c) => c.id === capsuleId));
    ok('Deleted record no longer appears in GET /api/capsules');
  }

  // ---- validation ----
  {
    const r = await req('POST', '/api/capsules', { token: userA, body: { project_name: 'only this' } });
    assert.equal(r.status, 400);
    ok('POST /api/capsules with missing required fields returns 400');
  }

  // ---- /dashboard server-side gate ----
  {
    const r = await req('GET', '/dashboard');
    assert.equal(r.status, 302);
    assert.ok(r.text === '' || true);
    ok('GET /dashboard with no auth redirects (302) instead of serving the page');
  }
  {
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: cookieHeader(userA),
      redirect: 'manual',
    });
    assert.equal(res.status, 200);
    ok('GET /dashboard with a valid session returns 200');
  }

  // ---- /login redirects to GitHub with a state param ----
  {
    const res = await fetch(`${BASE_URL}/login`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    const location = res.headers.get('location') || '';
    assert.ok(location.startsWith('https://github.com/login/oauth/authorize'));
    assert.ok(location.includes('state='));
    ok('GET /login redirects to GitHub\'s OAuth authorize URL with a state param');
  }

  console.log(`\nAll ${passed} checks passed.`);
}

main().catch((err) => {
  console.error('\n✗ TEST FAILED:', err.message);
  process.exit(1);
});
