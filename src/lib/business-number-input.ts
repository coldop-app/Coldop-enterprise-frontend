import type {
  KeyboardEvent as ReactKeyboardEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';

/**
 * Spinner removal for `<input type="number" />`.
 * Prefer with blur-on-wheel and arrow-key guard to avoid accidental changes.
 */
export const businessNumberSpinnerClassName =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export function blurTargetOnNumberWheel(
  e: ReactWheelEvent<HTMLInputElement>
): void {
  e.currentTarget.blur();
}

/** Blocks ArrowUp / ArrowDown nudging quantity and weight inputs. */
export function preventArrowUpDownOnNumericInput(
  e: ReactKeyboardEvent<HTMLInputElement>
): void {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
}

/** Blocks typing a minus sign into rate / amount fields. */
export function preventMinusOnNumericInput(
  e: ReactKeyboardEvent<HTMLInputElement>
): void {
  if (e.key === '-' || e.key === 'Minus') e.preventDefault();
}

/** Parses a number input value and clamps finite results to >= 0. */
export function parseNonNegativeNumber(value: string): number {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return parsed;
  return Math.max(0, parsed);
}
