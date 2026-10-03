import "server-only";

import type { DocumentType } from "@/types";

/**
 * Python detector нь optional байсан хуучин integration-ийн compatibility stub.
 * Browser FaceLandmarker + admin review нь одоогийн цорын ганц verification flow.
 */
export interface PythonVerificationResult {
  schemaVersion: "1";
  documentType: DocumentType;
  decision: "review";
}

export class PythonVerificationUnavailable extends Error {
  constructor(message = "Python detector is disabled") {
    super(message);
    this.name = "PythonVerificationUnavailable";
  }
}

export async function analyzeWithPython(_input: {
  documentType: DocumentType;
  bytes: Uint8Array;
  contentType: string;
}): Promise<null> {
  return null;
}
