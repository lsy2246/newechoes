export interface FilterRequest {
  tags?: string[];
  sort?: string;
  page?: number;
  limit?: number;
  date?: string;
}

export interface FilterArticle {
  title: string;
  url: string;
  date: string;
  summary?: string;
  tags?: string[];
}

export interface FilterResult {
  articles: FilterArticle[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
