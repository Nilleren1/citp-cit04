export function createPagination(
    path: string,
    limit: number,
    offset: number,
    hasMore: boolean
) {

    const pageUrl = (pageOffset: number): string => {
        const url = new URL(path, 'http://localhost');
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('offset', String(pageOffset));

        return `${url.pathname}${url.search}`;
    };

    return {
        limit,
        offset,
        next: hasMore ? pageUrl(offset + limit) : null,
        prev: offset > 0 ? pageUrl(Math.max(0, offset - limit)) : null
    };
}