const MIN_LENGTH = 120;
const MAX_LENGTH = 160;
const PADDING = " Book online with DarshanEase.";

// Keeps a meta description between 120 and 160 characters: short text gets a generic closing, long text is cut at a word
export function fitDescription(text) {
  let result = text.trim();
  if (result.length < MIN_LENGTH) result += PADDING;
  if (result.length > MAX_LENGTH) {
    result = result.slice(0, MAX_LENGTH - 1);
    result = result.slice(0, result.lastIndexOf(" ")).replace(/[.,;:\s]+$/, "") + "…";
  }
  return result;
}
