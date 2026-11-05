export interface Choice<T extends string = string> {
  readonly value: T;
  readonly label: string;
}
