/**
 * Quote Service
 *
 * API service for quote management operations.
 */

import axios from 'axios';
import type {
  Quote,
  QuoteCreate,
  QuoteUpdate,
  QuoteListResponse,
  QuoteFilters,
  QuoteApprovalRequest,
  QuoteSendRequest,
  QuoteAcceptRequest,
  QuoteVersionRequest,
  QuoteTimeline,
  QuoteStatistics,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const quoteService = {
  /**
   * Get all quotes with optional filters
   */
  async getAll(filters?: QuoteFilters): Promise<QuoteListResponse> {
    const params = new URLSearchParams();

    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('skip', String((filters.page - 1) * (filters.page_size || 100)));
    if (filters?.page_size) params.append('limit', String(filters.page_size));

    const response = await axios.get(`${API_BASE_URL}/api/v1/quotes?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  /**
   * Get quote by ID
   */
  async getById(id: string): Promise<Quote> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/quotes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  /**
   * Create a new quote
   */
  async create(data: QuoteCreate): Promise<Quote> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/quotes`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  /**
   * Update an existing quote
   */
  async update(id: string, data: QuoteUpdate): Promise<Quote> {
    const response = await axios.put(`${API_BASE_URL}/api/v1/quotes/${id}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  /**
   * Delete a quote
   */
  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/v1/quotes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
  },

  /**
   * Submit quote for approval
   */
  async submitForApproval(id: string): Promise<Quote> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/quotes/${id}/submit-for-approval`,
      {},
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  /**
   * Approve or reject a quote
   */
  async approve(id: string, data: QuoteApprovalRequest): Promise<Quote> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/quotes/${id}/approve`,
      data,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  /**
   * Send quote to customer
   */
  async send(id: string, data: QuoteSendRequest): Promise<Quote> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/quotes/${id}/send`,
      data,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  /**
   * Customer accepts a quote
   */
  async accept(id: string, data: QuoteAcceptRequest): Promise<Quote> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/quotes/${id}/accept`,
      data,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  /**
   * Customer declines a quote
   */
  async decline(id: string): Promise<Quote> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/quotes/${id}/decline`,
      {},
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  /**
   * Create a new version of a quote
   */
  async createVersion(id: string, data: QuoteVersionRequest): Promise<Quote> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/quotes/${id}/create-version`,
      data,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  /**
   * Get all versions of a quote
   */
  async getVersions(id: string): Promise<Quote[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/quotes/${id}/versions`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  /**
   * Get quote timeline/history
   */
  async getTimeline(id: string): Promise<QuoteTimeline[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/quotes/${id}/timeline`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  /**
   * Expire old quotes (admin only)
   */
  async expireOldQuotes(): Promise<{ message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/quotes/expire-old-quotes`,
      {},
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },
};

export default quoteService;
