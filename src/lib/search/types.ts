export type SuggestionType = "completion" | "correction";

export interface HeadingNode {
  id: string;
  text: string;
  level: number;
  content?: string;
  matched_terms?: string[];
  children: HeadingNode[];
}

export interface SearchSuggestion {
  text: string;
  suggestion_type: SuggestionType;
  matched_text: string;
  suggestion_text: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  score: number;
  heading_tree?: HeadingNode;
  page_type: string;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  time_ms: number;
  query: string;
  suggestions: SearchSuggestion[];
}

export interface SearchRequest {
  query: string;
  search_type: string;
  page_size: number;
  page: number;
}

export type SearchWarmupStatus = "idle" | "warming" | "ready" | "error";
