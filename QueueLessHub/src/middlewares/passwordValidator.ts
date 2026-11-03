import { NextFunction, Request, Response } from 'express';

type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

const validatePasswordStrength = (
  password: string | undefined | null
): PasswordValidationResult => {
  const errors: string[] = [];

  if (!password) {
    return {
      valid: false,
      errors: ['Password is required'],
    };
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  const commonWeakPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty123',
    'abc123456',
    'password1',
    'admin123',
    'letmein123',
    'welcome123',
    'monkey123',
  ];

  if (commonWeakPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const validatePasswordMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const password = (req.body as { password?: string } | undefined)?.password;

  if (!password) {
    next();
    return;
  }

  const validation = validatePasswordStrength(password);

  if (!validation.valid) {
    res.status(400).json({
      error: 'Weak password',
      message: 'Password does not meet security requirements',
      requirements: validation.errors,
    });
    return;
  }

  next();
};

const validateNewPasswordMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const newPassword = (req.body as { newPassword?: string } | undefined)?.newPassword;

  if (!newPassword) {
    res.status(400).json({
      error: 'New password is required',
    });
    return;
  }

  const validation = validatePasswordStrength(newPassword);

  if (!validation.valid) {
    res.status(400).json({
      error: 'Weak password',
      message: 'New password does not meet security requirements',
      requirements: validation.errors,
    });
    return;
  }

  next();
};

const getPasswordRequirements = () => ({
  minLength: PASSWORD_REQUIREMENTS.minLength,
  maxLength: PASSWORD_REQUIREMENTS.maxLength,
  requireUppercase: PASSWORD_REQUIREMENTS.requireUppercase,
  requireLowercase: PASSWORD_REQUIREMENTS.requireLowercase,
  requireNumbers: PASSWORD_REQUIREMENTS.requireNumbers,
  requireSpecialChars: PASSWORD_REQUIREMENTS.requireSpecialChars,
  description: [
    `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    'At least one uppercase letter (A-Z)',
    'At least one lowercase letter (a-z)',
    'At least one number (0-9)',
    'At least one special character (!@#$%^&*(),.?":{}|<>)',
  ],
});

export {
  validatePasswordStrength,
  validatePasswordMiddleware,
  validateNewPasswordMiddleware,
  getPasswordRequirements,
  PASSWORD_REQUIREMENTS,
};
