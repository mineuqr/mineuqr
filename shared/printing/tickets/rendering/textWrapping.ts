/**
 * PRINTING-RENDERING-1B — width-aware text wrapping for ticket layout.
 */

export function wrapTextToWidth(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) {
    return [text];
  }

  const normalized = text.trim();
  if (normalized.length <= maxWidth) {
    return [normalized];
  }

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxWidth) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let offset = 0; offset < word.length; offset += maxWidth) {
        lines.push(word.slice(offset, offset + maxWidth));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

export function padColumn(value: string, width: number): string {
  if (value.length >= width) {
    return value.slice(0, width);
  }
  return `${value}${" ".repeat(width - value.length)}`;
}

export function indentText(text: string, columns: number): string {
  if (columns <= 0) {
    return text;
  }
  return `${" ".repeat(columns)}${text}`;
}
