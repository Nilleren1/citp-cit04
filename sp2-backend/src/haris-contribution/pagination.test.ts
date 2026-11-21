import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPagination } from './pagination.js';

test('first page has next but no prev', () => {
    const result = createPagination('/titles?q=batman', 20, 0, true);

    assert.equal(result.next, '/titles?q=batman&limit=20&offset=20');
    assert.equal(result.prev, null);
});

test('middle page has next and prev', () => {
    const result = createPagination('/titles?q=batman', 20, 20, true);

    assert.equal(result.next, '/titles?q=batman&limit=20&offset=40');
    assert.equal(result.prev, '/titles?q=batman&limit=20&offset=0');
});

test('last page has no next', () => {
    const result = createPagination('/titles?q=batman', 20, 40, false);

    assert.equal(result.next, null);
    assert.equal(result.prev, '/titles?q=batman&limit=20&offset=20');
});

test('existing pagination parameters are replaced', () => {
    const result = createPagination('/titles?q=batman&limit=10&offset=0', 20, 20, true);

    assert.equal(result.next, '/titles?q=batman&limit=20&offset=40');
    assert.equal(result.prev, '/titles?q=batman&limit=20&offset=0');
});