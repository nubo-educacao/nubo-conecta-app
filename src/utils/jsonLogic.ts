/**
 * Lightweight JSON Logic evaluator for conditional form fields/steps.
 * Ported from nubo-hub-app — Sprint 04
 */

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

    const compare = (a: unknown, b: unknown, opStr: string): boolean => {
        if (a == null || b == null) return false;
        const numA = Number(a);
        const numB = Number(b);
        const valA = isNaN(numA) ? a : numA;
        const valB = isNaN(numB) ? b : numB;
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
