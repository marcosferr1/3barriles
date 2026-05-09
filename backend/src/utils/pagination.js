'use strict';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * @param {Record<string, unknown>} query - req.query
 * @param {{ defaultPageSize?: number; maxPageSize?: number }} [options]
 */
function parsePagination(query, options = {}) {
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const maxPageSize = options.maxPageSize ?? MAX_PAGE_SIZE;

  let page = parseInt(String(query.page ?? ''), 10);
  if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;

  let pageSize = parseInt(String(query.pageSize ?? ''), 10);
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = defaultPageSize;
  pageSize = Math.min(Math.max(1, pageSize), maxPageSize);

  const offset = (page - 1) * pageSize;
  return { page, pageSize, limit: pageSize, offset };
}

module.exports = {
  parsePagination,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE,
  MAX_PAGE_SIZE,
};
