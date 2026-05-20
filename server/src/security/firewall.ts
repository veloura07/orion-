/**
 * Orion 2.0 Security Subsystem - LLM Input/Output Firewall
 */

// Common injection signatures
const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?instructions/gi,
  /bypass\s+(?:all\s+)?rules/gi,
  /system\s+override/gi,
  /you\s+must\s+ignore/gi,
  /forget\s+what\s+i\s+said/gi,
  /new\s+rules\s+apply/gi,
];

// Common credential leak signatures
const CREDENTIAL_PATTERNS = [
  {
    name: 'Gemini/Google API Key',
    regex: /AIzaSy[A-Za-z0-9_\-]{33}/g,
  },
  {
    name: 'AWS Access Key ID',
    regex: /\b(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    name: 'AWS Secret Access Key',
    regex: /\b[A-Za-z0-9/+=]{40}\b/g, // We will match within specific contexts, but here we do a general match to be safe
  },
  {
    name: 'Generic Database Connection String',
    regex: /\b(?:mongodb\+srv|postgres|postgresql|mysql|sqlite):\/\/[^\s]+/gi,
  },
  {
    name: 'Private RSA/PEM Key Block',
    regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+ PRIVATE KEY-----/g,
  },
];

/**
 * Validates user queries for prompt injections and malicious instruction overrides.
 */
export function inspectPrompt(message: string): { allowed: boolean; reason?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return {
        allowed: false,
        reason: 'Suspicious instruction override or system injection signature detected.',
      };
    }
  }
  return { allowed: true };
}

/**
 * Scans AI-generated responses for sensitive data, redacting leaks automatically.
 */
export function inspectOutput(text: string): string {
  let sanitized = text;

  for (const pattern of CREDENTIAL_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, (match) => {
      // Avoid redacting common small words that could match generic rules
      if (pattern.name === 'AWS Secret Access Key' && (match.toLowerCase() === 'true' || match.toLowerCase() === 'false')) {
        return match;
      }
      return `[REDACTED BY ORION SHIELD: ${pattern.name}]`;
    });
  }

  return sanitized;
}
