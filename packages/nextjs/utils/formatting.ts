/**
 * Utility functions for formatting data in the UI
 */

/**
 * Format a number with spaces as thousand separators
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with spaces as thousand separators
 */
export const formatNumberWithSpaces = (num: number | string, decimals: number = 2): string => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(numValue)) return '0';
  
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).replace(/,/g, ' ');
};

/**
 * Decode a hex string back to the original string
 * @param hexString - The hex string to decode (with or without 0x prefix)
 * @returns The decoded string
 */
export const decodeHexToString = (hexString: string): string => {
  try {
    // Remove 0x prefix if present
    const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    
    // Convert hex to buffer and then to string
    const buffer = Buffer.from(cleanHex, 'hex');
    const decoded = buffer.toString('utf8');
    
    // Remove null bytes and trim
    const cleaned = decoded.replace(/\0/g, '').trim();
    
    // Check if the decoded string contains only printable ASCII characters
    // If it contains non-printable characters, it's likely not a proper UTF-8 string
    const isPrintable = /^[\x20-\x7E]*$/.test(cleaned);
    
    if (!isPrintable || cleaned.length === 0) {
      // If not printable or empty, return a shortened version of the hash
      return `Hash: ${hexString.slice(0, 10)}...`;
    }
    
    return cleaned;
  } catch (error) {
    console.error('Error decoding hex string:', error);
    return `Hash: ${hexString.slice(0, 10)}...`;
  }
};

/**
 * Format USDC amount with proper thousand separators
 * @param amount - The USDC amount (in wei/smallest unit)
 * @param decimals - Number of decimals for USDC (default: 6)
 * @returns Formatted USDC string
 */
export const formatUSDC = (amount: bigint | string, decimals: number = 6): string => {
  const amountStr = typeof amount === 'string' ? amount : amount.toString();
  const numValue = parseFloat(amountStr) / Math.pow(10, decimals);
  return formatNumberWithSpaces(numValue, 2) + ' USDC';
};
