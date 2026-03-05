export interface ReferralProgramData {
  address: string;
  creator: string;
  name: string;
  referrerCommissionBps: number;
  platformFeeBps: number;
  platformWallet: string;
  totalPayments: number;
  totalReferrers: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ReferralLinkData {
  address: string;
  program: string;
  referrer: string;
  totalReceived: number;
  referrerClaimed: number;
  ownerClaimed: number;
  platformClaimed: number;
  paymentCount: number;
  createdAt: number;
  balance: number;
}

export interface AppState {
  wallet: {
    connected: boolean;
    publicKey: string | null;
    walletName: string | null;
    balance: number | null;
  };
  createProgram: {
    name: string;
    commissionPercent: number;
  };
  programs: {
    list: ReferralProgramData[];
    loading: boolean;
  };
  programDashboard: {
    program: ReferralProgramData | null;
    links: ReferralLinkData[];
    loading: boolean;
  };
  referrerDashboard: {
    links: ReferralLinkData[];
    loading: boolean;
  };
}
