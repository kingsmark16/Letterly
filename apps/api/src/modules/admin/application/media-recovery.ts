export interface RecoveryOperator {
  id: string;
  sessionId: string;
}
export interface ProcessorEvidence {
  schemaVersion: 1;
  jobId: string;
  mediaType: 'IMAGE' | 'AUDIO';
  mediaId: string;
  attemptToken: string;
  processingInstanceId: string;
  manifestSha256: string;
  termination: {
    platform: 'AZURE_CONTAINER_APPS' | 'LOCAL';
    hostIdentitySha256: string;
    observedAt: string;
    evidenceReference: string;
  };
  storageSettlement: {
    basis: 'NO_UNRESOLVED_WRITE' | 'PROVIDER_CONFIRMED';
    observedAt: string;
    evidenceReference: string;
  };
  evidenceRecords: {
    id: string;
    kind: 'TERMINATION' | 'STORAGE_SETTLEMENT';
    text: string;
  }[];
}
export interface UploadSettlementEvidence {
  schemaVersion: 1;
  jobId: string;
  uploadManifestSha256: string;
  observedAt: string;
  evidenceReference: string;
  evidenceText: string;
}
export interface ProcessorRecoveryInput {
  jobId: string;
  mediaType: 'IMAGE' | 'AUDIO';
  mediaId: string;
  attemptToken: string;
  processingInstanceId: string;
  evidence: ProcessorEvidence;
}
export interface ProcessorRecoveryResult {
  jobId: string;
  mediaType: 'IMAGE' | 'AUDIO';
  mediaId: string;
  attemptToken: string;
  recoveryId: string;
  recordedAt: string;
}
