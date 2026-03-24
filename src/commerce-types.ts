export interface StorefrontMetrics {
  salesCount: number;
  revenueEur: number;
  reviewsCount: number;
  averageRating: number;
}

export interface StorefrontReview {
  id: string;
  orderId: string | null;
  productSlug: string;
  productTitle: string;
  rating: number;
  quote: string;
  displayName: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPaymentFeedEntry {
  orderId: string;
  customerLabel: string;
  totalEur: number;
  currency: string;
  createdAt: string;
}
