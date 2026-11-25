export interface WcSessionSummary {
  topic: string;
  peerName: string;
  peerUrl: string;
  peerIcon: string | null;
  peerDescription: string;
  expiry: number;
}

export interface PendingSignRequest {
  id: number;
  topic: string;
  dappName: string;
  dappUrl: string;
  method: 'solana_signMessage' | 'solana_signTransaction'; // TODO: | 'solana_signAndSendTransaction';
  params: unknown;
}

export interface PendingProposal {
  id: number;
  dappName: string;
  dappUrl: string;
}

export interface ServerToClientEvents {
  'wallet:address': (address: string | null) => void;
  'wc:sessions': (sessions: WcSessionSummary[]) => void;
  'wc:session_request': (request: PendingSignRequest) => void;
  'wc:session_proposal': (proposal: PendingProposal) => void;
}

export interface ClientToServerEvents {
  'wc:pair': (uri: string) => void;
  'wc:disconnect': (topic: string) => void;
  'wc:approve_request': (id: number) => void;
  'wc:reject_request': (id: number) => void;
  'wc:approve_proposal': (id: number) => void;
  'wc:reject_proposal': (id: number) => void;
}