/**
 * Password Validation Middleware
 * Enforces strong password requirements for user registration and password changes
 */

/**
 * Password strength requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*(),.?":{}|<>)
 * - Maximum 128 characters (prevent DoS attacks)
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

/**
 * Validates password strength
 * @param {String} password - The password to validate
 * @returns {Object} - { valid: boolean, errors: Array<string> }
 */
const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password) {
    return {
      valid: false,
      errors: ['Password is required']
    };
  }

  // Check length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  // Check for uppercase letter
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  // Check for lowercase letter
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  // Check for number
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  // Check for special character
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  // Check for common weak passwords
  const commonWeakPasswords = [
    'password', 'password123', '12345678', 'qwerty123', 'abc123456',
    'password1', 'admin123', 'letmein123', 'welcome123', 'monkey123'
  ];

  if (commonWeakPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Express middleware to validate password in registration
 * Checks req.body.password
 */
const validatePasswordMiddleware = (req, res, next) => {
  const password = req.body.password;

  // Skip validation if no password is provided (might be optional in some updates)
  if (!password) {
    return next();
  }

  const validation = validatePasswordStrength(password);

  if (!validation.valid) {
    return res.status(400).json({
      error: 'Weak password',
      message: 'Password does not meet security requirements',
      requirements: validation.errors
    });
  }

  next();
};

/**
 * Express middleware to validate new password in password change
 * Checks req.body.newPassword
 */
const validateNewPasswordMiddleware = (req, res, next) => {
  const newPassword = req.body.newPassword;

  if (!newPassword) {
    return res.status(400).json({
      error: 'New password is required'
    });
  }

  const validation = validatePasswordStrength(newPassword);

  if (!validation.valid) {
    return res.status(400).json({
      error: 'Weak password',
      message: 'New password does not meet security requirements',
      requirements: validation.errors
    });
  }

  next();
};

/**
 * Get password requirements for client-side validation
 */
const getPasswordRequirements = () => {
  return {
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
      'At least one special character (!@#$%^&*(),.?":{}|<>)'
    ]
  };
};

module.exports = {
  validatePasswordStrength,
  validatePasswordMiddleware,
  validateNewPasswordMiddleware,
  getPasswordRequirements,
  PASSWORD_REQUIREMENTS
};
