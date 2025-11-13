import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { reviewAPI } from '../services/api';

const ReviewContext = createContext();

const reviewReducer = (state, action) => {
  switch (action.type) {
    case 'SET_REVIEWS':
      return {
        ...state,
        reviews: action.payload.reviews,
        totalCount: action.payload.totalCount,
        loading: false,
        error: null
      };
    case 'ADD_REVIEW':
      return {
        ...state,
        reviews: [action.payload, ...state.reviews],
        totalCount: state.totalCount + 1
      };
    case 'UPDATE_REVIEW':
      return {
        ...state,
        reviews: state.reviews.map(review =>
          review._id === action.payload._id ? action.payload : review
        )
      };
    case 'DELETE_REVIEW':
      return {
        ...state,
        reviews: state.reviews.filter(review => review._id !== action.payload),
        totalCount: state.totalCount - 1
      };
    case 'SET_LOADING':
      return { ...state, loading: true };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_SORT':
      return { ...state, sort: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    default:
      return state;
  }
};

const initialState = {
  reviews: [],
  totalCount: 0,
  loading: false,
  error: null,
  filters: { rating: null },
  sort: 'newest',
  page: 1,
  hasMore: true
};

export const ReviewProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reviewReducer, initialState);

  const getProductReviews = useCallback(async (productId, filters = {}, sort = 'newest', page = 1) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const response = await reviewAPI.getProductReviews(productId, filters, sort, page);
      if (response.success) {
        dispatch({
          type: 'SET_REVIEWS',
          payload: {
            reviews: response.data.reviews,
            totalCount: response.data.totalCount
          }
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);

  const createReview = useCallback(async (productId, reviewData) => {
    try {
      const response = await reviewAPI.createReview(productId, reviewData);
      if (response.success) {
        dispatch({ type: 'ADD_REVIEW', payload: response.data });
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const updateReview = useCallback(async (reviewId, reviewData) => {
    try {
      const response = await reviewAPI.updateReview(reviewId, reviewData);
      if (response.success) {
        dispatch({ type: 'UPDATE_REVIEW', payload: response.data });
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const deleteReview = useCallback(async (reviewId) => {
    try {
      const response = await reviewAPI.deleteReview(reviewId);
      if (response.success) {
        dispatch({ type: 'DELETE_REVIEW', payload: reviewId });
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const markHelpful = useCallback(async (reviewId) => {
    try {
      const response = await reviewAPI.markHelpful(reviewId);
      if (response.success) {
        dispatch({ type: 'UPDATE_REVIEW', payload: response.data });
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const unmarkHelpful = useCallback(async (reviewId) => {
    try {
      const response = await reviewAPI.unmarkHelpful(reviewId);
      if (response.success) {
        dispatch({ type: 'UPDATE_REVIEW', payload: response.data });
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setSort = useCallback((sort) => {
    dispatch({ type: 'SET_SORT', payload: sort });
  }, []);

  const setPage = useCallback((page) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, []);

  const value = {
    ...state,
    getProductReviews,
    createReview,
    updateReview,
    deleteReview,
    markHelpful,
    unmarkHelpful,
    setFilters,
    setSort,
    setPage
  };

  return (
    <ReviewContext.Provider value={value}>
      {children}
    </ReviewContext.Provider>
  );
};

export const useReviews = () => {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReviews must be used within a ReviewProvider');
  }
  return context;
};