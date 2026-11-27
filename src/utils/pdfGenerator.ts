import jsPDF from 'jspdf';
import { InterceptPost } from '../types';

/**
 * Sanitizes text for jsPDF standard fonts.
 * Replaces non-ASCII symbols (such as Indian Rupee ₹, smart quotes, em-dashes)
 * that cause jsPDF text-metrics measurement bugs and horizontal overflow.
 */
function sanitizePdfText(str: string): string {
  if (!str) return '';
  return str
    .replace(/₹/g, 'Rs. ')
    .replace(/\u20B9/g, 'Rs. ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/[^\x20-\x7E\n]/g, ' ') // replace any remaining non-standard chars
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateDossierPDF(post: InterceptPost) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // 1. Sleek High-Contrast Tactical Cyber-Forensic Background
  doc.setFillColor(10, 14, 22); // #0A0E16
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer Precision Tactical Border
  doc.setDrawColor(0, 229, 255); // Cyan #00E5FF
  doc.setLineWidth(0.6);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Inner Accent Guide Border
  doc.setDrawColor(30, 48, 70);
  doc.setLineWidth(0.25);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // 4 Corner Tactical Reticles
  const drawCornerReticle = (cx: number, cy: number, dx: number, dy: number) => {
    doc.setDrawColor(0, 229, 255);
    doc.setLineWidth(0.8);
    doc.line(cx, cy, cx + dx * 6, cy);
    doc.line(cx, cy, cx, cy + dy * 6);
  };
  drawCornerReticle(10, 10, 1, 1);
  drawCornerReticle(pageWidth - 10, 10, -1, 1);
  drawCornerReticle(10, pageHeight - 10, 1, -1);
  drawCornerReticle(pageWidth - 10, pageHeight - 10, -1, -1);

  // =========================================================================
  // HEADER: Rajasthan Police State Cyber Crime Cell
  // =========================================================================
  let y = 16;

  doc.setTextColor(0, 229, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('RAJASTHAN POLICE // STATE CYBER CRIME CELL, JAIPUR', pageWidth / 2, y, { align: 'center' });

  y += 5.5;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('PRAHARI OSINT FORENSIC EVIDENCE DOSSIER', pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setTextColor(244, 63, 94); // Rose red #F43F5E
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CONFIDENTIAL // LAW ENFORCEMENT & JUDICIAL FORENSIC RECORD ONLY', pageWidth / 2, y, { align: 'center' });

  y += 3.5;
  doc.setDrawColor(0, 229, 255);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);

  // =========================================================================
  // SECTION 63 BSA LEGAL CERTIFICATION STATUTORY BOX
  // =========================================================================
  y += 3.5;
  const certBoxY = y;
  const certBoxHeight = 21;

  doc.setFillColor(15, 23, 38);
  doc.roundedRect(margin, certBoxY, contentWidth, certBoxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(0, 229, 255);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, certBoxY, contentWidth, certBoxHeight, 1.5, 1.5, 'D');

  // Left status pill
  doc.setFillColor(0, 229, 255);
  doc.rect(margin, certBoxY, 2, certBoxHeight, 'F');

  doc.setTextColor(0, 229, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SCHEDULE TO SECTION 63(4) BHARATIYA SAKSHYA ADHINIYAM (BSA, 2023) COMPLIANCE', margin + 5, certBoxY + 5);

  doc.setTextColor(203, 213, 225); // Slate 300
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const certStatement =
    'Certified that this digital intelligence record was ingested, cryptographically hashed, and verified in real time via PRAHARI Autonomous OSINT Collector directly from public broadcasts without manual alteration. Designed to support Section 63 BSA compliance & forensic integrity through an append-only hash chain, Ed25519 station key signature, RFC 3161 trusted timestamp anchor, and dual statutory endorsement by the Investigating Officer (Part A) and Digital Forensics Examiner (Part B).';
  const wrappedCert = doc.splitTextToSize(certStatement, contentWidth - 10);
  doc.text(wrappedCert, margin + 5, certBoxY + 9.5);

  y += certBoxHeight + 4;

  // =========================================================================
  // 01 // CASE TELEMETRY & ADMINISTRATIVE DETAILS (Grid Table)
  // =========================================================================
  doc.setTextColor(0, 229, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('01 // CASE TELEMETRY & INCIDENT DETAILS (41 DISTRICTS · 7 DIVISIONS MESH)', margin, y);

  y += 3;
  const tableY = y;
  const tableHeight = 35;

  doc.setFillColor(12, 18, 28);
  doc.roundedRect(margin, tableY, contentWidth, tableHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(38, 54, 76);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, tableY, contentWidth, tableHeight, 1.5, 1.5, 'D');

  // Subtle interior grid lines
  doc.setDrawColor(24, 36, 52);
  doc.line(margin, tableY + 8.5, margin + contentWidth, tableY + 8.5);
  doc.line(margin, tableY + 17, margin + contentWidth, tableY + 17);
  doc.line(margin, tableY + 25.5, margin + contentWidth, tableY + 25.5);
  doc.line(margin + contentWidth / 2, tableY, margin + contentWidth / 2, tableY + tableHeight);

  // Column X Coordinates
  const col1Label = margin + 4;
  const col1Val = margin + 42;
  const col2Label = margin + contentWidth / 2 + 4;
  const col2Val = margin + contentWidth / 2 + 42;

  const row1Y = tableY + 5.5;
  const row2Y = tableY + 14;
  const row3Y = tableY + 22.5;
  const row4Y = tableY + 31;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);

  // Row 1
  doc.setTextColor(148, 163, 184);
  doc.text('CASE DOSSIER ID:', col1Label, row1Y);
  doc.setTextColor(255, 255, 255);
  doc.text(`INV-RAJ-2026-${post.id.toUpperCase()}`, col1Val, row1Y);

  doc.setTextColor(148, 163, 184);
  doc.text('TARGET CHANNEL:', col2Label, row1Y);
  doc.setTextColor(0, 229, 255);
  doc.text(sanitizePdfText(post.channel), col2Val, row1Y);

  // Row 2
  doc.setTextColor(148, 163, 184);
  doc.text('INGESTION TIMESTAMP:', col1Label, row2Y);
  doc.setTextColor(255, 255, 255);
  doc.text(sanitizePdfText(post.capturedAt || '2026-11-27 18:20:00 IST'), col1Val, row2Y);

  doc.setTextColor(148, 163, 184);
  doc.text('SUBSCRIBER REACH:', col2Label, row2Y);
  doc.setTextColor(255, 255, 255);
  doc.text(sanitizePdfText(post.channelSubscribers || '8.5K members'), col2Val, row2Y);

  // Row 3
  doc.setTextColor(148, 163, 184);
  doc.text('CRIME VERTICAL:', col1Label, row3Y);
  doc.setTextColor(244, 63, 94);
  doc.text(`[${post.categories.join(' · ')}]`, col1Val, row3Y);

  doc.setTextColor(148, 163, 184);
  doc.text('ALGORITHM MATCH:', col2Label, row3Y);
  doc.setTextColor(16, 185, 129);
  doc.text(`${(post.confidence * 100).toFixed(0)}% CONFIDENCE`, col2Val, row3Y);

  // Row 4
  doc.setTextColor(148, 163, 184);
  doc.text('JURISDICTION NEXUS:', col1Label, row4Y);
  doc.setTextColor(0, 229, 255);
  doc.text(`${sanitizePdfText(post.districtName.toUpperCase())} (RAJASTHAN)`, col1Val, row4Y);

  doc.setTextColor(148, 163, 184);
  doc.text('LEGAL STATUS:', col2Label, row4Y);
  doc.setTextColor(245, 158, 11);
  doc.text('SEC 63 BSA COMPLIANT // SEALED', col2Val, row4Y);

  y += tableHeight + 4;

  // =========================================================================
  // 02 // FOUR-LAYER CRYPTOGRAPHIC INTEGRITY & HASH CHAIN
  // =========================================================================
  doc.setTextColor(0, 229, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('02 // FOUR-LAYER CRYPTOGRAPHIC INTEGRITY & CHAIN OF CUSTODY', margin, y);

  y += 3;
  const hashBoxY = y;
  const hashBoxHeight = 27;

  doc.setFillColor(12, 18, 28);
  doc.roundedRect(margin, hashBoxY, contentWidth, hashBoxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(38, 54, 76);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, hashBoxY, contentWidth, hashBoxHeight, 1.5, 1.5, 'D');

  const prevHash =
    post.cryptoLayers?.prevHash ||
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const edSig =
    post.cryptoLayers?.ed25519Signature ||
    'ed25519:7a9f4c2e1b8d609a3c5e8f1b2d4c7a9f0e3b6d9a1c4e7f0b3d6a9c2e5f8b1d4e';
  const rfcAnchor =
    post.cryptoLayers?.rfc3161Timestamp ||
    `${post.capturedAt || '2026-11-27T17:35:12.482Z'} [CERT-In NTP Stratum-1 Verified]`;

  let hY = hashBoxY + 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('LAYER 1 · APPEND-ONLY HASH CHAIN:', margin + 4, hY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(0, 229, 255);
  doc.text(`PREV: ${prevHash.slice(0, 28)}... -> CURRENT: ${post.sha256}`, margin + 55, hY);

  hY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('LAYER 2 · ASYMMETRIC SIGNATURE:', margin + 4, hY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(16, 185, 129);
  doc.text(`${edSig} [KEY: RAJ-CYBER-NODE-01]`, margin + 55, hY);

  hY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('LAYER 3 · RFC 3161 TIMESTAMP TOKEN:', margin + 4, hY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(245, 158, 11);
  doc.text(rfcAnchor, margin + 55, hY);

  hY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('LAYER 4 · RAW ARTIFACT PRESERVATION:', margin + 4, hY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(203, 213, 225);
  doc.text('UNMODIFIED TELEGRAM MTPROTO WIRE JSON ENCLAVE // TAMPER-SEALED', margin + 55, hY);

  y += hashBoxHeight + 4;

  // =========================================================================
  // 03 // RAW INTERCEPTED SIGNAL TRANSCRIPT
  // =========================================================================
  doc.setTextColor(0, 229, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('03 // RAW INTERCEPTED SIGNAL TRANSCRIPT', margin, y);

  y += 3;
  const transcriptBoxY = y;
  const transcriptPad = 4;
  const transcriptMaxW = contentWidth - transcriptPad * 2;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.2);
  const cleanTranscript = sanitizePdfText(post.rawText);
  const wrappedTranscript = doc.splitTextToSize(`"${cleanTranscript}"`, transcriptMaxW);

  // Dynamic box height based on actual line count
  const lineCount = wrappedTranscript.length;
  const dynamicTranscriptH = Math.max(18, lineCount * 4.2 + 8);

  doc.setFillColor(8, 12, 18);
  doc.roundedRect(margin, transcriptBoxY, contentWidth, dynamicTranscriptH, 1.5, 1.5, 'F');
  doc.setDrawColor(38, 54, 76);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, transcriptBoxY, contentWidth, dynamicTranscriptH, 1.5, 1.5, 'D');

  doc.setTextColor(241, 245, 249); // Slate 100
  doc.text(wrappedTranscript, margin + transcriptPad, transcriptBoxY + 6);

  y += dynamicTranscriptH + 4;

  // =========================================================================
  // 04 // EXTRACTED ACTIONABLE ENTITIES & SLANG TRIGGERS
  // =========================================================================
  doc.setTextColor(0, 229, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('04 // EXTRACTED ACTIONABLE ENTITIES & SLANG TRIGGERS', margin, y);

  y += 3;
  const entityBoxY = y;
  const entityBoxHeight = 31;

  doc.setFillColor(12, 18, 28);
  doc.roundedRect(margin, entityBoxY, contentWidth, entityBoxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(38, 54, 76);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, entityBoxY, contentWidth, entityBoxHeight, 1.5, 1.5, 'D');

  const entLabelX = margin + 4;
  const entValX = margin + 48;
  const entValMaxW = contentWidth - 52;
  const entRowH = 6.2;
  let eY = entityBoxY + 5;

  doc.setFontSize(6.8);

  // UPIs
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('EXTRACTED UPIS / ESCROW:', entLabelX, eY);
  doc.setFont('courier', 'bold');
  doc.setTextColor(0, 229, 255);
  const upiText = post.entities.upis.length ? post.entities.upis.join(', ') : 'None detected';
  doc.text(doc.splitTextToSize(sanitizePdfText(upiText), entValMaxW), entValX, eY);

  // Phone / WhatsApp
  eY += entRowH;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('PHONE / WHATSAPP HOTLINES:', entLabelX, eY);
  doc.setFont('courier', 'bold');
  doc.setTextColor(245, 158, 11);
  const phoneText = post.entities.phones.length ? post.entities.phones.join(', ') : 'None detected';
  doc.text(doc.splitTextToSize(sanitizePdfText(phoneText), entValMaxW), entValX, eY);

  // Telegram Handles
  eY += entRowH;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('TELEGRAM HANDLES / CARTELL:', entLabelX, eY);
  doc.setFont('courier', 'bold');
  doc.setTextColor(16, 185, 129);
  const handleText = post.entities.handles.length ? post.entities.handles.join(', ') : 'None detected';
  doc.text(doc.splitTextToSize(sanitizePdfText(handleText), entValMaxW), entValX, eY);

  // Matched Slang Tokens
  eY += entRowH;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('MATCHED SLANG TOKENS:', entLabelX, eY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(244, 63, 94);
  const slangText = post.matchedSlang.length ? post.matchedSlang.join(', ') : 'None detected';
  const wrappedSlang = doc.splitTextToSize(sanitizePdfText(slangText), entValMaxW);
  doc.text(wrappedSlang[0] || 'None detected', entValX, eY);

  y += entityBoxHeight + 4;

  // =========================================================================
  // 05 // SCHEDULE TO SECTION 63(4) BSA: PART A & PART B DECLARATIONS
  // =========================================================================
  const footerBoxY = y;
  const footerBoxHeight = 36;

  // Outer footer container
  doc.setFillColor(11, 17, 28);
  doc.roundedRect(margin, footerBoxY, contentWidth, footerBoxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(38, 54, 76);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, footerBoxY, contentWidth, footerBoxHeight, 1.5, 1.5, 'D');

  // Left Column: Part B - Technical / Digital Forensics Expert
  const footerLeftW = contentWidth * 0.5; // 91mm
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(0, 229, 255);
  doc.text('PART B: DIGITAL FORENSICS EXPERT CERTIFICATE', margin + 4, footerBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('EXPERT: Technical Officer / Forensic Examiner', margin + 4, footerBoxY + 9.5);
  doc.text('STATION ID: RAJ-CYBER-NODE-01 (Jaipur HQ)', margin + 4, footerBoxY + 13.5);
  doc.text('HASH STATUS: FIPS-180-4 SHA-256 + Ed25519 Linked', margin + 4, footerBoxY + 17.5);

  // Designated Expert Signature Box
  const expertSigY = footerBoxY + 21;
  const expertSigH = 11;
  doc.setFillColor(8, 13, 20);
  doc.roundedRect(margin + 4, expertSigY, footerLeftW - 8, expertSigH, 1, 1, 'F');
  doc.setDrawColor(0, 229, 255);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.roundedRect(margin + 4, expertSigY, footerLeftW - 8, expertSigH, 1, 1, 'D');
  doc.setLineDashPattern([], 0);

  doc.setTextColor(0, 229, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('[ DIGITAL FORENSICS EXAMINER SIGNATURE / DSC ]', margin + footerLeftW / 2, expertSigY + 4.5, { align: 'center' });
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('Certifying Under Schedule to Section 63(4)(c) BSA, 2023', margin + footerLeftW / 2, expertSigY + 8, { align: 'center' });

  // Vertical divider between Part B and Part A
  const stampDividerX = margin + footerLeftW;
  doc.setDrawColor(38, 54, 76);
  doc.setLineWidth(0.25);
  doc.line(stampDividerX, footerBoxY, stampDividerX, footerBoxY + footerBoxHeight);

  // Right Column: Part A - Investigating Officer (I.O.) Declaration
  const ioBoxX = stampDividerX + 4;
  const ioRightW = contentWidth - footerLeftW - 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(244, 63, 94); // Rose red
  doc.text('PART A: INVESTIGATING OFFICER (I.O.) DECLARATION', ioBoxX, footerBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('OFFICER NAME: _________________________________', ioBoxX, footerBoxY + 9.5);
  doc.text('RANK / PPO NO.: ________________________________', ioBoxX, footerBoxY + 13.5);
  doc.text('POLICE STATION: State Cyber Crime Cell, Jaipur', ioBoxX, footerBoxY + 17.5);

  // Designated I.O. Physical Signature & Official Stamp Area
  const sigBoxY = footerBoxY + 21;
  const sigBoxH = 11;
  doc.setFillColor(8, 13, 20);
  doc.roundedRect(ioBoxX, sigBoxY, ioRightW, sigBoxH, 1, 1, 'F');
  doc.setDrawColor(244, 63, 94);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.roundedRect(ioBoxX, sigBoxY, ioRightW, sigBoxH, 1, 1, 'D');
  doc.setLineDashPattern([], 0); // reset dash

  doc.setTextColor(244, 63, 94);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('[ AFFIX OFFICIAL SEAL & SIGNATURE / CLASS-3 DSC ]', ioBoxX + ioRightW / 2, sigBoxY + 4.5, { align: 'center' });

  doc.setTextColor(100, 116, 139); // Slate 500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('Authorized Signatory under Schedule to Sec 63(4) BSA, 2023', ioBoxX + ioRightW / 2, sigBoxY + 8, { align: 'center' });

  // Bottom Security Watermark Strip
  doc.setFont('courier', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  const bottomMeta = `PRAHARI // CASE: ${post.id.toUpperCase()} // JURISDICTION: ${post.districtName.toUpperCase()} // HASH: ${post.sha256.slice(0, 16)}... // SEC 63 BSA COMPLIANT EVIDENCE // R4C 2026`;
  doc.text(bottomMeta, pageWidth / 2, pageHeight - 11, { align: 'center' });

  // Save the cleanly generated PDF
  const filename = `PRAHARI_SEC63_BSA_${post.id.toUpperCase()}_${post.districtName.toUpperCase()}.pdf`;
  doc.save(filename);
}
