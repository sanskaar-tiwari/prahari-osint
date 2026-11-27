export type CrimeCategory = 'DRUGS' | 'ARMS' | 'DOCUMENTS' | 'FINANCIAL';

export interface ExtractedEntities {
  phones: string[];
  upis: string[];
  handles: string[];
  wallets: string[];
  bankAccounts: string[];
}

export interface CryptoIntegrityLayers {
  prevHash: string; // Append-only block linkage
  currentHash: string; // FIPS-180-4 SHA-256 digest
  ed25519Signature: string; // Asymmetric station key signature (Signed by RAJ-CYBER-NODE-01)
  ed25519KeyId: string; // e.g., "RAJ-CYBER-NODE-01 (Jaipur)"
  rfc3161Timestamp: string; // Standardized UTC/IST trusted timestamp anchor
  timestampAuthority: string; // e.g., "CERT-In NTP Stratum-1 Verified"
}

export interface InterceptPost {
  id: string;
  channel: string;
  channelSubscribers?: string;
  timestamp: string;
  capturedAt: string;
  rawText: string;
  categories: CrimeCategory[];
  confidence: number;
  matchedSlang: string[];
  entities: ExtractedEntities;
  districtId: string;
  districtName: string;
  divisionName?: string; // 7 Administrative Divisions of Rajasthan
  sha256: string;
  views: number;
  verified: boolean;
  status: 'PENDING' | 'FLAGGED' | 'INVESTIGATING' | 'SEALED';
  cryptoLayers?: CryptoIntegrityLayers;
  rawPayload?: Record<string, any>;
}

export interface DistrictIntel {
  id: string;
  name: string;
  hindiName: string;
  division?: string; // One of 7 Divisions: Jaipur, Jodhpur, Bikaner, Ajmer, Udaipur, Kota, Bharatpur
  x: number; // centroid SVG coordinate
  y: number;
  path: string; // SVG path
  threatLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MODERATE';
  flaggedCount: number;
  topCategories: CrimeCategory[];
  activeChannels: string[];
  topIdentifiers: string[];
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface DistrictConnection {
  id: string;
  from: string; // district id
  to: string; // district id
  identifier: string; // e.g. raj.pay@oksbi
  type: 'UPI' | 'PHONE' | 'CRYPTO' | 'TELEGRAM' | 'BANK';
  category: CrimeCategory;
}

export interface EntityNode {
  id: string;
  label: string;
  type: 'post' | 'upi' | 'phone' | 'telegram' | 'crypto' | 'district';
  category?: CrimeCategory;
  channels?: string[];
  riskScore: number;
  isHero?: boolean;
}

export interface EntityEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  category?: CrimeCategory;
}

export type ActiveMode = 'ALL' | 'DRUGS' | 'ARMS' | 'DOCUMENTS' | 'FINANCIAL';
