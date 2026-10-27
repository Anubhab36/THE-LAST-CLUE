
import type { Case, Difficulty, AccusationResult } from "../types/case";

const API = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export interface SessionProgress {
  discovered_evidence: string[];
  completed_actions: string[];
  evidence_connections: [string, string][];
  important_events: string[];
  interrogation_hits: number;
  asked_questions: string[];
  elapsed_seconds: number;
  time_penalty_seconds: number;
}

export interface CaseCatalogItem {
  case_id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  target_minutes: number;
}

export interface DailyMysteryResponse {
  daily_date: string;
  case: Case;
}

export async function getDailyMystery(): Promise<DailyMysteryResponse> {
  return request<DailyMysteryResponse>("/api/cases/daily");
}

export async function getCaseCatalog(): Promise<CaseCatalogItem[]> {
  return request<CaseCatalogItem[]>("/api/cases/catalog");
}

export interface GameSession {
  session_id: string;
  case_id: string;
  status: string;
  progress: SessionProgress;
}

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const maxAttempts = method === "GET" ? 2 : 1;
  let response: Response | undefined;
  let networkFailure = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    networkFailure = false;

    try {
      response = await fetch(`${API}${url}`, init);
    } catch {
      networkFailure = true;
      response = undefined;
    }

    if (
      response &&
      (response.status < 500 || attempt === maxAttempts)
    ) {
      break;
    }

    if (attempt < maxAttempts) {
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, 700 * attempt),
      );
    }
  }

  if (!response) {
    throw new Error(
      networkFailure
        ? "Cannot connect to the game server. Check your connection and try again."
        : "The server did not return a response. Please try again.",
    );
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    let detail: string | undefined;

    if (
      body !== null &&
      typeof body === "object" &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      detail = body.detail;
    }

    if (response.status === 429) {
      throw new Error(
        detail ??
          "AI Cases are not available right now. Please try again later. Sorry for the inconvenience.",
      );
    }

    if (response.status >= 500) {
      throw new Error(
        detail ??
          "The game server is temporarily unavailable. Please try again shortly.",
      );
    }

    throw new Error(
      detail ?? `Request failed (${response.status}). Please try again.`,
    );
  }

  return response.json() as Promise<T>;
}

function post(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function getCase(
  difficulty: Difficulty,
): Promise<Case> {
  return request<Case>(`/api/cases/${difficulty}`);
}

export async function generateCase(
  difficulty: Difficulty,
  theme?: string,
): Promise<Case> {
  return request<Case>(
    "/api/cases/generate",
    post({ difficulty, theme: theme?.trim() || null }),
  );
}

export async function createSession(
  caseId: string,
): Promise<{ session_id: string; case_id: string; status: string }> {
  return request<{ session_id: string; case_id: string; status: string }>(
    "/api/sessions",
    post({ case_id: caseId }),
  );
}

export async function getCaseById(caseId: string): Promise<Case> {
  return request<Case>(`/api/cases/by-id/${encodeURIComponent(caseId)}`);
}

export async function getSession(
  sessionId: string,
): Promise<GameSession> {
  return request<GameSession>(`/api/sessions/${sessionId}`);
}

export async function discoverEvidence(
  sessionId: string,
  evidenceId: string,
): Promise<GameSession> {
  return request<GameSession>(
    `/api/sessions/${sessionId}/evidence`,
    post({ evidence_id: evidenceId }),
  );
}

export async function completeAction(
  sessionId: string,
  actionId: string,
): Promise<GameSession> {
  return request<GameSession>(
    `/api/sessions/${sessionId}/actions`,
    post({ action_id: actionId }),
  );
}

export async function interrogateSession(
  sessionId: string,
  suspectId: string,
  questionId: string,
): Promise<{
  answer: string;
  reveals_evidence_id: string | null;
  hit: boolean;
}> {
  return request<{
    answer: string;
    reveals_evidence_id: string | null;
    hit: boolean;
  }>(
    `/api/sessions/${sessionId}/interrogation`,
    post({ suspect_id: suspectId, question_id: questionId }),
  );
}

export interface FreeformInterrogationResponse {
  suspect_id: string;
  question: string;
  answer: string;
  presented_evidence_ids: string[];
  created_at: string;
}

export async function askSuspectFreeform(
  sessionId: string,
  suspectId: string,
  question: string,
  presentedEvidenceIds: string[] = [],
): Promise<FreeformInterrogationResponse> {
  return request<FreeformInterrogationResponse>(
    `/api/sessions/${sessionId}/interrogation/freeform`,
    post({
      suspect_id: suspectId,
      question,
      presented_evidence_ids: presentedEvidenceIds,
    }),
  );
}

export async function recordAnalysis(
  sessionId: string,
  evidenceConnections: [string, string][],
  importantEvents: string[],
  elapsedSeconds: number,
): Promise<GameSession> {
  return request<GameSession>(
    `/api/sessions/${sessionId}/analysis`,
    post({
      evidence_connections: evidenceConnections,
      important_events: importantEvents,
      elapsed_seconds: elapsedSeconds,
    }),
  );
}

export async function accuseSession(
  sessionId: string,
  payload: {
    killer_id: string;
    motive: string;
    method: string;
  },
): Promise<AccusationResult> {
  return request<AccusationResult>(
    `/api/sessions/${sessionId}/accuse`,
    post(payload),
  );
}



export async function refineSessionScore(
  sessionId: string,
  payload: {
    motive: string;
    method: string;
  },
): Promise<AccusationResult> {
  // The backend uses the answers saved at accusation time and returns the
  // complete authoritative result, including total and grade.
  return request<AccusationResult>(
    `/api/sessions/${sessionId}/score-refinement`,
    post(payload),
  );
}
