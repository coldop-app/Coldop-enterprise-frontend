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
