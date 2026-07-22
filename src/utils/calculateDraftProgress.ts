import { evaluateJsonLogic } from '@/utils/jsonLogic';
import type { PartnerFormField } from '@/components/forms/FormFieldRenderer';

function hasValue(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

/**
 * Calculates draft completion as a percentage (0–100).
 * Denominator: non-optional fields whose conditional_rule passes given the saved answers.
 * Numerator: those fields that have a value in answers.
 */
export function calculateDraftProgress(
  answers: Record<string, unknown>,
  fields: PartnerFormField[],
): number {
  const evalData: Record<string, unknown> = { ...answers };

  const requiredVisible = fields.filter(f => {
    if (f.optional) return false;
    if (f.conditional_rule) {
      try { return evaluateJsonLogic(f.conditional_rule, evalData); } catch { return true; }
    }
    return true;
  });

  if (requiredVisible.length === 0) return 100;

  const filled = requiredVisible.filter(f => hasValue(answers[f.field_name])).length;
  return Math.round((filled / requiredVisible.length) * 100);
}
