export type RatingSummary = {
  count: number;
  average: number;
  // distribution[n] = nombre d'avis a n etoiles (1 a 5).
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function summarizeRatings(ratings: number[]): RatingSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const rating of ratings) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Une note doit etre un entier entre 1 et 5.");
    }
    distribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
  }

  const total = ratings.reduce((sum, rating) => sum + rating, 0);

  return {
    count: ratings.length,
    average: ratings.length === 0 ? 0 : total / ratings.length,
    distribution,
  };
}

export function averageByProduct(
  reviews: { productId: string | null; rating: number }[],
): Map<string, RatingSummary> {
  const ratingsByProduct = new Map<string, number[]>();

  for (const review of reviews) {
    if (!review.productId) continue;
    const ratings = ratingsByProduct.get(review.productId) ?? [];
    ratings.push(review.rating);
    ratingsByProduct.set(review.productId, ratings);
  }

  return new Map(
    [...ratingsByProduct].map(([productId, ratings]) => [
      productId,
      summarizeRatings(ratings),
    ]),
  );
}

export function formatAverage(average: number): string {
  return average.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
