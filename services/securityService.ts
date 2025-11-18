export const sanitizeHTML = (dirtyHTML: string): string => {
  // Use the browser's built-in parser for safety.
  // This avoids complex regex and potential bypasses.
  const parser = new DOMParser();
  const doc = parser.parseFromString(dirtyHTML, 'text/html');

  // Iterate over all elements in the parsed document body
  const allElements = doc.body.querySelectorAll('*');
  
  for (const element of allElements) {
    // Remove potentially dangerous tags
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(element.tagName)) {
      element.remove();
      continue; // Skip to the next element
    }

    // Remove all 'on*' event handler attributes (e.g., onclick, onerror)
    for (const attr of [...element.attributes]) {
      if (attr.name.toLowerCase().startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    }
    
    // Specifically check href/src attributes for javascript: pseudo-protocol
    const href = element.getAttribute('href');
    const src = element.getAttribute('src');

    if (href && href.trim().toLowerCase().startsWith('javascript:')) {
        element.removeAttribute('href');
    }
    if (src && src.trim().toLowerCase().startsWith('javascript:')) {
        element.removeAttribute('src');
    }
  }

  // Return the sanitized HTML from the body
  return doc.body.innerHTML;
};
