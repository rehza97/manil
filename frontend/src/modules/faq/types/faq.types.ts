/**
 * FAQ types — category and item for static FAQ content.
 */

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  title: string;
  items: FaqItem[];
}

export type FaqAudience = "client" | "admin";

export interface FaqContentByAudience {
  client: FaqCategory[];
  admin: FaqCategory[];
}
