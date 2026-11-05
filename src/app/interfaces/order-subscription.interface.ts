export interface OrderSubscription {
  close(): void;
  retry(): void;
}
