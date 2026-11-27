import React from 'react';

const UPI_REGEX = /[\w.-]+@[a-zA-Z]{2,}/;
const CRYPTO_REGEX = /\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{16,39}\b|0x[a-fA-F0-9]{40}|\bT[A-Za-z1-9]{33}\b/;
const PHONE_REGEX = /(?:\+91[\s-]?)?[6-9]\d{9}\b/;
const BANK_IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b|\b\d{9,18}\b/;
const HANDLE_REGEX = /(?<![\w.-])@[a-zA-Z0-9_]{4,}/;

/**
 * Renders post text with inline color-coded monospace badges for extracted identifiers
 * (UPI, Phone, Bank/IFSC, Crypto, Telegram @handle) alongside red threat keywords.
 */
export function renderHighlightedText(text: string, matchedSlang: string[] = []): React.ReactNode {
  if (!text) return text;

  const escapedSlang = (matchedSlang || [])
    .filter((t) => t && t.trim().length > 0)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const patternParts = [
    // Order matters: UPI before @handle, Phone before generic digits, Crypto before generic alphanumeric
    `(${UPI_REGEX.source})`,
    `(${CRYPTO_REGEX.source})`,
    `(${PHONE_REGEX.source})`,
    `(${BANK_IFSC_REGEX.source})`,
    `(${HANDLE_REGEX.source})`,
  ];

  if (escapedSlang.length > 0) {
    patternParts.push(`(${escapedSlang.join('|')})`);
  }

  const masterRegex = new RegExp(patternParts.join('|'), 'gi');
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = masterRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    // Classify exact token type
    if (new RegExp(`^${UPI_REGEX.source}$`, 'i').test(token)) {
      nodes.push(
        <span
          key={`id-${keyIdx++}`}
          className="inline-block px-1.5 py-0.5 mx-0.5 rounded font-mono text-xs border bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
        >
          {token}
        </span>
      );
    } else if (new RegExp(`^(${CRYPTO_REGEX.source})$`).test(token)) {
      nodes.push(
        <span
          key={`id-${keyIdx++}`}
          className="inline-block max-w-full break-all px-1.5 py-0.5 mx-0.5 rounded font-mono text-xs border bg-purple-500/15 text-purple-300 border-purple-500/40"
        >
          {token}
        </span>
      );
    } else if (new RegExp(`^${PHONE_REGEX.source}$`).test(token)) {
      nodes.push(
        <span
          key={`id-${keyIdx++}`}
          className="inline-block px-1.5 py-0.5 mx-0.5 rounded font-mono text-xs border bg-amber-500/15 text-amber-300 border-amber-500/40"
        >
          {token}
        </span>
      );
    } else if (new RegExp(`^(${BANK_IFSC_REGEX.source})$`).test(token)) {
      nodes.push(
        <span
          key={`id-${keyIdx++}`}
          className="inline-block px-1.5 py-0.5 mx-0.5 rounded font-mono text-xs border bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
        >
          {token}
        </span>
      );
    } else if (new RegExp(`^@[a-zA-Z0-9_]{4,}$`).test(token)) {
      nodes.push(
        <span
          key={`id-${keyIdx++}`}
          className="inline-block px-1.5 py-0.5 mx-0.5 rounded font-mono text-xs border bg-sky-500/15 text-sky-300 border-sky-500/40"
        >
          {token}
        </span>
      );
    } else {
      // Matched threat slang keyword
      nodes.push(
        <span key={`slang-${keyIdx++}`} className="text-rose-400 font-medium tracking-tight">
          {token}
        </span>
      );
    }

    lastIndex = masterRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
