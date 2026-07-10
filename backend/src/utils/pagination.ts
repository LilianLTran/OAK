import { Request } from 'express';

export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const MAX_PAGE_SIZE = 100;

export function getPageParams(req: Request, defaultSize = 20): PageParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(String(req.query.pageSize ?? String(defaultSize)), 10) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginate<T>(items: T[], total: number, p: PageParams): Paginated<T> {
  return { items, page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) };
}
