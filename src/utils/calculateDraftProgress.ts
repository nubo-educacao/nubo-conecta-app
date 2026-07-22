import { evaluateJsonLogic } from '@/utils/jsonLogic';
import type { PartnerStep } from '@/components/forms/PartnerFormEngine';
import type { PartnerFormField } from '@/components/forms/FormFieldRenderer';

function hasValue(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

/**
 * Calculates draft completion as a percentage (0–100) based on saved answers.
 * A step is "complete" when all its non-optional visible fields have a value.
 * Iterable steps are complete when at least one iteration exists.
 */
export function calculateDraftProgress(
  answers: Record<string, unknown>,
  steps: PartnerStep[],
  fields: PartnerFormField[],
): number {
  const evalData: Record<string, unknown> = { ...answers };

  const visibleSteps = steps.filter(s => {
    if (s.secret_step) return false;
    if (s.conditional_rule) {
      try { return evaluateJsonLogic(s.conditional_rule, evalData); } catch { return true; }
    }
    return true;
  });

  if (visibleSteps.length === 0) return 100;

  let completedSteps = 0;

  for (const step of visibleSteps) {
    if (step.is_iterable) {
      const iterations = answers[step.id];
      if (Array.isArray(iterations) && iterations.length > 0) completedSteps++;
    } else {
      const requiredFields = fields
        .filter(f => f.step_id === step.id && !f.optional)
        .filter(f => {
          if (!f.conditional_rule) return true;
          try { return evaluateJsonLogic(f.conditional_rule, evalData); } catch { return true; }
        });

      if (requiredFields.length === 0 || requiredFields.every(f => hasValue(answers[f.field_name]))) {
        completedSteps++;
      }
    }
  }

  return Math.round((completedSteps / visibleSteps.length) * 100);
}
