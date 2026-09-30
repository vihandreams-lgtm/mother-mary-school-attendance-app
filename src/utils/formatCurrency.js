/**
 * Global currency formatting helper for the school portal.
 * Formats numbers as Ugandan Shillings (UGX) with comma separators.
 *
 * Examples:
 *   formatUGX(500000)        → "500,000 UGX"
 *   formatUGX("1200000")     → "1,200,000 UGX"
 *   formatUGX(0)             → "0 UGX"
 *   formatUGX(null)          → "0 UGX"
 *   formatUGX(1500, false)   → "1,500"           (no suffix)
 *   formatUGX(1500, true, "UGX ") → "UGX 1,500"  (prefix)
 */
export const formatUGX = (value, includeSuffix = true, customSuffix = ' UGX') => {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      return includeSuffix ? `0${customSuffix.trim().startsWith('UGX') ? ' UGX' : customSuffix}` : '0';
    }
    const formatted = Math.round(num).toLocaleString('en-UG');
    if (!includeSuffix) return formatted;
    // If the caller passed "UGX " as suffix, treat it as prefix
    if (customSuffix.trim().endsWith('UGX')) {
      return `UGX ${formatted}`;
    }
    return `${formatted}${customSuffix}`;
  };
  
  /**
   * Short-form UGX (e.g. 1.2M, 500K) — useful for dashboard cards
   */
  export const formatUGXShort = (value) => {
    const num = Number(value) || 0;
    if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B UGX`;
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M UGX`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}K UGX`;
    return `${num.toLocaleString('en-UG')} UGX`;
  };
  
  /**
   * Parse a UGX string back to a number
   *   parseUGX("500,000 UGX") → 500000
   */
  export const parseUGX = (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const cleaned = String(str).replace(/[^0-9.-]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  };
  
  export default formatUGX;