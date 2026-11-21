export function validateLimit(value: unknown): number {
    if (value === undefined) return 20;

    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        throw new Error('Limit must be a positive integer.');
    }

    const limit = Number(value);

    if (!Number.isSafeInteger(limit) || limit < 1) {
        throw new Error('Limit must be a positive integer.');
    }

    if (limit > 100) {
        return 20;
    }

    return limit;
}

export function validateOffset(value: unknown): number {
    if (value === undefined) return 0;

    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        throw new Error('Offset must be a non-negative integer.');
    }

    const offset = Number(value);

    if (!Number.isSafeInteger(offset) || offset > 2147483647) {
        throw new Error('Offset must be between 0 and 2147483647.');
    }

    return offset;
}