/**
 * FAQ content — combines client and admin data for the FAQ page.
 */

import type { FaqContentByAudience } from "../types/faq.types";
import { faqClientCategories } from "./faqClient";
import { faqAdminCategories } from "./faqAdmin";

export const faqContent: FaqContentByAudience = {
  client: faqClientCategories,
  admin: faqAdminCategories,
};

export { faqClientCategories } from "./faqClient";
export { faqAdminCategories } from "./faqAdmin";
