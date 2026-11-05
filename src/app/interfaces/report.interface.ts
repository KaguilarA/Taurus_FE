export interface Report {
  revenue: number;
  count: number;
  ranking: {
    _id: { productId: string; category: string };
    name: string;
    quantity: number;
    revenue: number;
  }[];
}
