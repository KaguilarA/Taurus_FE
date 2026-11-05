import { WritableSignal } from '@angular/core';
/** Replace each edited branch so computed values and OnPush views are notified. */
export function updateField<T>(
  target: WritableSignal<T>,
  path: readonly string[],
  value: unknown,
): void {
  const replace = (current: unknown, index: number): unknown => {
    if (index === path.length) return value;
    const record = (current ?? {}) as Record<string, unknown>;
    return { ...record, [path[index]]: replace(record[path[index]], index + 1) };
  };
  target.update((current) => (current == null ? current : (replace(current, 0) as T)));
}
