import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateLimit, validateOffset } from './validation.js';

test('validateLimit accepts valid values', () => {
    assert.equal(validateLimit(undefined), 20);
    assert.equal(validateLimit('1'), 1);
    assert.equal(validateLimit('50'), 50);
    assert.equal(validateLimit('100'), 100);
});

test('validateLimit uses default when maximum is exceeded', () => {
    assert.equal(validateLimit('101'), 20);
    assert.equal(validateLimit('150'), 20);
});

test('validateLimit rejects invalid values', () => {
    for (const value of ['0', '-5', '2.5', 'abc']) {
        assert.throws(() => validateLimit(value));
    }
});

test('validateOffset accepts valid values', () => {
    assert.equal(validateOffset(undefined), 0);
    assert.equal(validateOffset('0'), 0);
    assert.equal(validateOffset('10'), 10);
});

test('validateOffset rejects invalid values', () => {
    for (const value of ['-5', '1.5', 'abc', '2147483648']) {
        assert.throws(() => validateOffset(value));
    }
});