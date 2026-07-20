/**
 * Lightweight JSON Logic evaluator for conditional form fields/steps.
 * Ported from nubo-hub-app — Sprint 04
 */

// ── Humanizer: JSON Logic → readable Portuguese text ─────────────────────

const OP_LABELS: Record<string, string> = {
  '==': 'igual a', '!=': 'diferente de',
  '<': 'menor que', '<=': 'no máximo',
  '>': 'maior que', '>=': 'no mínimo',
};

function formatListWithOr(list: unknown[]): string {
  if (list.length === 0) return '';
  if (list.length === 1) return String(list[0]);
  const stringList = list.map(item => String(item));
  const last = stringList.pop();
  return `${stringList.join(', ')} ou ${last}`;
}

function parseComparison(node: unknown): { op: string; varName: string; value: unknown } | null {
  if (!node || typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length !== 1) return null;
  const op = keys[0];
  if (!['==', '!=', '<', '<=', '>', '>=', 'in'].includes(op)) return null;
  const args = obj[op];
  if (!Array.isArray(args) || args.length !== 2) return null;
  
  const [left, right] = args;
  if (left && typeof left === 'object' && 'var' in left) {
    return { op, varName: String((left as any).var), value: right };
  }
  return null;
}

function humanizeNode(node: unknown): string {
  if (!node || typeof node !== 'object') return String(node);
  const obj = node as Record<string, unknown>;

  // Check for logical AND
  if ('and' in obj && Array.isArray(obj.and)) {
    const subNodes = obj.and;
    
    // Detect range on a single variable
    if (subNodes.length === 2) {
      const p1 = parseComparison(subNodes[0]);
      const p2 = parseComparison(subNodes[1]);
      if (p1 && p2 && p1.varName === p2.varName) {
        let minVal: unknown = null;
        let maxVal: unknown = null;
        let isMinInclusive = false;
        let isMaxInclusive = false;

        const processParam = (p: { op: string; value: unknown }) => {
          if (p.op === '>') {
            minVal = p.value;
            isMinInclusive = false;
          } else if (p.op === '>=') {
            minVal = p.value;
            isMinInclusive = true;
          } else if (p.op === '<') {
            maxVal = p.value;
            isMaxInclusive = false;
          } else if (p.op === '<=') {
            maxVal = p.value;
            isMaxInclusive = true;
          }
        };

        processParam(p1);
        processParam(p2);

        if (minVal !== null && maxVal !== null) {
          const minStr = String(minVal);
          const maxStr = String(maxVal);
          
          const minNum = Number(minVal);
          const maxNum = Number(maxVal);
          if (!isNaN(minNum) && !isNaN(maxNum) && Number.isInteger(minNum) && Number.isInteger(maxNum)) {
            const actualMin = isMinInclusive ? minNum : minNum + 1;
            const actualMax = isMaxInclusive ? maxNum : maxNum - 1;
            return `De ${actualMin} a ${actualMax}`;
          }
          return `De ${minStr} a ${maxStr}`;
        }
      }
    }

    return subNodes.map(humanizeNode).join(' E ');
  }

  // Check for logical OR
  if ('or' in obj && Array.isArray(obj.or)) {
    const subNodes = obj.or;
    
    const parsedList = subNodes.map(parseComparison);
    const allEqualsSameVar = parsedList.length > 0 && parsedList.every(
      p => p !== null && p.op === '==' && p.varName === parsedList[0]!.varName
    );

    if (allEqualsSameVar) {
      const values = parsedList.map(p => p!.value);
      return formatListWithOr(values);
    }

    return subNodes.map(humanizeNode).join(' OU ');
  }

  // Check for IN
  if ('in' in obj && Array.isArray(obj.in)) {
    const [, list] = obj.in;
    if (Array.isArray(list)) {
      return formatListWithOr(list);
    }
    return String(list);
  }

  // Check other comparison operators
  const parsed = parseComparison(node);
  if (parsed) {
    if (parsed.op === '==') {
      if (parsed.value === true || String(parsed.value).toLowerCase() === 'sim') return 'Sim';
      if (parsed.value === false || String(parsed.value).toLowerCase() === 'não' || String(parsed.value).toLowerCase() === 'nao') return 'Não';
      return String(parsed.value);
    }
    return `${OP_LABELS[parsed.op]} ${parsed.value}`;
  }

  return JSON.stringify(node);
}

export function humanizeJsonLogic(jsonLogicStr: string | null): string | null {
  if (!jsonLogicStr) return null;
  try {
    const parsed = typeof jsonLogicStr === 'string' ? JSON.parse(jsonLogicStr) : jsonLogicStr;
    return humanizeNode(parsed);
  } catch {
    // If it's already an object, humanize directly
    if (typeof jsonLogicStr === 'object') {
      return humanizeNode(jsonLogicStr);
    }
    return null;
  }
}

export function evaluateJsonLogic(rule: unknown, data: Record<string, unknown>): unknown {
    if (Array.isArray(rule)) {
        return rule.map(item => evaluateJsonLogic(item, data));
    }

    if (typeof rule !== 'object' || rule === null) {
        return rule;
    }

    const ruleObj = rule as Record<string, unknown>;
    const keys = Object.keys(ruleObj);
    if (keys.length === 0) return false;

    const op = keys[0];
    let args = ruleObj[op];
    if (!Array.isArray(args)) {
        args = [args];
    }

    if (op === 'var') {
        const varName = (args as unknown[])[0] as string;
        return data[varName];
    }

    const evalArgs = (args as unknown[]).map((a) => evaluateJsonLogic(a, data));

function extractNumericValue(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;

  if (typeof val === 'object' && val !== null) {
    if ('per_capita_income' in val) {
      return extractNumericValue((val as Record<string, unknown>).per_capita_income);
    }
    if ('value' in val) {
      return extractNumericValue((val as Record<string, unknown>).value);
    }
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return null;

    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }

    if (!/\d/.test(trimmed)) return null;

    let clean = trimmed.replace(/[^\d.,-]/g, '');

    if (clean.includes(',') && clean.indexOf(',') > clean.lastIndexOf('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',') && !clean.includes('.')) {
      clean = clean.replace(',', '.');
    } else if (clean.includes('.') && !clean.includes(',')) {
      const parts = clean.split('.');
      if (parts.length > 1 && parts[parts.length - 1].length === 3 && parts[0].length >= 1) {
        clean = clean.replace(/\./g, '');
      }
    } else {
      clean = clean.replace(/,/g, '');
    }

    const num = Number(clean);
    return isNaN(num) ? null : num;
  }

  return null;
}

    const compare = (a: unknown, b: unknown, opStr: string): boolean => {
        if (a == null || b == null) return false;
        const numA = extractNumericValue(a);
        const numB = extractNumericValue(b);
        const valA = numA !== null ? numA : a;
        const valB = numB !== null ? numB : b;
        switch (opStr) {
            case '>': return (valA as number) > (valB as number);
            case '>=': return (valA as number) >= (valB as number);
            case '<': return (valA as number) < (valB as number);
            case '<=': return (valA as number) <= (valB as number);
            default: return false;
        }
    };

    const normalizeValue = (val: unknown): unknown => {
        if (val === true || (typeof val === 'string' && val.toLowerCase() === 'sim')) return 'sim';
        if (
            val === false ||
            (typeof val === 'string' && val.toLowerCase() === 'não') ||
            (typeof val === 'string' && val.toLowerCase() === 'nao')
        ) return 'não';
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed !== '' && !isNaN(Number(trimmed))) return Number(trimmed);
            return trimmed.toLowerCase();
        }
        return val;
    };

    switch (op) {
        case '==':
        case '===':
            return normalizeValue(evalArgs[0]) === normalizeValue(evalArgs[1]);
        case '!=':
        case '!==':
            return normalizeValue(evalArgs[0]) !== normalizeValue(evalArgs[1]);
        case '>':
        case '>=':
        case '<':
        case '<=':
            return compare(evalArgs[0], evalArgs[1], op);
        case 'in':
            if (evalArgs[1] == null || evalArgs[0] == null) return false;
            if (Array.isArray(evalArgs[1])) {
                const val = evalArgs[0];
                if (typeof val === 'string') {
                    return (evalArgs[1] as unknown[]).some(
                        x => String(x).trim().toLowerCase() === val.trim().toLowerCase()
                    );
                }
                return (evalArgs[1] as unknown[]).includes(val);
            }
            if (typeof evalArgs[1] === 'string') {
                return evalArgs[1].includes(String(evalArgs[0]));
            }
            return false;
        case 'and':
            return evalArgs.every(Boolean);
        case 'or':
            return evalArgs.some(Boolean);
        case '!':
            return !evalArgs[0];
        default:
            return false;
    }
}
