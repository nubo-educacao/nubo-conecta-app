/**
 * Utility for applying and validating input masks in Partner Forms.
 * Ported from nubo-hub-app — Sprint 04
 */

export const applyMask = (value: string, maskType: string | null): string => {
    if (!maskType || !value) return value;

    const type = maskType.toLowerCase();
    const cleanValue = value.replace(/\D/g, '');

    switch (type) {
        case 'cpf':
            return cleanValue
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');

        case 'cnpj':
            return cleanValue
                .replace(/(\d{2})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d{1,2})/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');

        case 'phone':
            if (cleanValue.length <= 10) {
                return cleanValue
                    .replace(/(\d{2})(\d)/, '($1) $2')
                    .replace(/(\d{4})(\d{1,4})/, '$1-$2')
                    .replace(/(-\d{4})\d+?$/, '$1');
            } else {
                return cleanValue
                    .replace(/(\d{2})(\d)/, '($1) $2')
                    .replace(/(\d{5})(\d{1,4})/, '$1-$2')
                    .replace(/(-\d{4})\d+?$/, '$1');
            }

        case 'cep':
            return cleanValue
                .replace(/(\d{5})(\d)/, '$1-$2')
                .replace(/(-\d{3})\d+?$/, '$1');

        case 'brl': {
            if (!cleanValue) return '';
            const amount = (parseInt(cleanValue) / 100).toFixed(2);
            return 'R$ ' + amount.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        }

        case 'date':
            return cleanValue
                .replace(/(\d{2})(\d)/, '$1/$2')
                .replace(/(\d{2})(\d)/, '$1/$2')
                .replace(/(\/\d{4})\d+?$/, '$1');

        case 'number':
            return cleanValue;

        default:
            return value;
    }
};

export const validateMask = (value: string, maskType: string | null): { isValid: boolean; error?: string } => {
    if (!value || !maskType) return { isValid: true };

    const type = maskType.toLowerCase();
    const clean = value.replace(/\D/g, '');

    switch (type) {
        case 'cpf':
            if (clean.length !== 11) return { isValid: false, error: 'CPF deve ter 11 dígitos' };
            return { isValid: validateCPF(clean), error: 'CPF inválido' };

        case 'cnpj':
            if (clean.length !== 14) return { isValid: false, error: 'CNPJ deve ter 14 dígitos' };
            return { isValid: validateCNPJ(clean), error: 'CNPJ inválido' };

        case 'phone':
            if (clean.length < 10 || clean.length > 11) return { isValid: false, error: 'Telefone inválido' };
            return { isValid: true };

        case 'cep':
            if (clean.length !== 8) return { isValid: false, error: 'CEP deve ter 8 dígitos' };
            return { isValid: true };

        case 'email': {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return { isValid: emailRegex.test(value), error: 'E-mail inválido' };
        }

        case 'date':
            if (clean.length !== 8) return { isValid: false, error: 'Data incompleta' };
            return { isValid: true };

        case 'link': {
            const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
            return { isValid: urlRegex.test(value), error: 'Link inválido' };
        }

        case 'textarea':
            if (value.length > 500) return { isValid: false, error: 'Máximo de 500 caracteres' };
            return { isValid: true };

        default:
            return { isValid: true };
    }
};

const validateCPF = (cpf: string): boolean => {
    if (/^(\d)\1+$/.test(cpf)) return false;
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    return true;
};

const validateCNPJ = (cnpj: string): boolean => {
    if (/^(\d)\1+$/.test(cnpj)) return false;
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    const digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    return true;
};

export const getPlaceholder = (maskType: string | null, dataType: string): string => {
    if (!maskType) {
        if (dataType === 'number') return 'Digite um número...';
        return 'Digite sua resposta...';
    }
    const type = maskType.toLowerCase();
    if (type === 'textarea') return 'Digite até 500 caracteres';
    switch (type) {
        case 'cpf': return '999.999.999-99';
        case 'cnpj': return '99.999.999/9999-99';
        case 'phone': return '(99) 99999-9999';
        case 'cep': return '99999-999';
        case 'date': return 'DD/MM/AAAA';
        case 'brl': return 'R$ 0,00';
        case 'email': return 'exemplo@email.com';
        case 'link': return 'https://exemplo.com';
        default:
            if (dataType === 'number') return 'Digite um número...';
            return 'Digite sua resposta...';
    }
};

export const getMaxLength = (maskType: string | null): number | undefined => {
    if (!maskType) return undefined;
    const type = maskType.toLowerCase();
    switch (type) {
        case 'cpf': return 14;
        case 'cnpj': return 18;
        case 'phone': return 15;
        case 'cep': return 9;
        case 'date': return 10;
        case 'textarea': return 500;
        case 'email': return 255;
        case 'link': return 2048;
        default: return undefined;
    }
};

export const getComponentType = (
    maskType: string | null,
    dataType: string
): 'input' | 'textarea' | 'date' | 'select' | 'checkbox' | 'autocomplete' | 'grid' => {
    if (dataType === 'select') return 'select';
    if (dataType === 'searchable_select') return 'autocomplete';
    if (dataType === 'multiselect') return 'input';
    if (dataType === 'boolean') return 'checkbox';
    if (dataType === 'grid_select' || dataType === 'grid_multiselect') return 'grid';
    if (!maskType) return 'input';
    const type = maskType.toLowerCase();
    if (type === 'textarea') return 'textarea';
    if (type === 'date') return 'date';
    return 'input';
};
