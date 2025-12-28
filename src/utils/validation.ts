// Form validation utilities

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

// Email validation
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

// URL validation
export const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Required field check
export const isRequired = (value: string): boolean => {
    return value.trim().length > 0;
};

// Minimum length check
export const hasMinLength = (value: string, min: number): boolean => {
    return value.trim().length >= min;
};

// Maximum length check
export const hasMaxLength = (value: string, max: number): boolean => {
    return value.trim().length <= max;
};

// Contact form validation
export const validateContactForm = (data: {
    name: string;
    email: string;
    subject?: string;
    message: string;
}): ValidationResult => {
    const errors: Record<string, string> = {};

    if (!isRequired(data.name)) {
        errors.name = 'name is required';
    } else if (!hasMinLength(data.name, 2)) {
        errors.name = 'name must be at least 2 characters';
    }

    if (!isRequired(data.email)) {
        errors.email = 'email is required';
    } else if (!isValidEmail(data.email)) {
        errors.email = 'please enter a valid email';
    }

    if (data.subject !== undefined && !isRequired(data.subject)) {
        errors.subject = 'subject is required';
    }

    if (!isRequired(data.message)) {
        errors.message = 'message is required';
    } else if (!hasMinLength(data.message, 10)) {
        errors.message = 'message must be at least 10 characters';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// WIM application form validation
export const validateWimForm = (data: {
    name: string;
    email: string;
    portfolio: string;
    pitch: string;
}): ValidationResult => {
    const errors: Record<string, string> = {};

    if (!isRequired(data.name)) {
        errors.name = 'name is required';
    }

    if (!isRequired(data.email)) {
        errors.email = 'email is required';
    } else if (!isValidEmail(data.email)) {
        errors.email = 'please enter a valid email';
    }

    if (!isRequired(data.portfolio)) {
        errors.portfolio = 'portfolio url is required';
    } else if (!isValidUrl(data.portfolio)) {
        errors.portfolio = 'please enter a valid url';
    }

    if (!isRequired(data.pitch)) {
        errors.pitch = 'pitch is required';
    } else if (!hasMinLength(data.pitch, 50)) {
        errors.pitch = 'pitch must be at least 50 characters';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
