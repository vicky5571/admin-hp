export function paginateMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  };
}
