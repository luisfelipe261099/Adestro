import { useCallback, useState } from "react";

interface SessionData {
  session_id: string;
  trainer_notes: string;
  video_tags?: string[];
  dog_id: string;
  duration_minutes?: number;
  techniques_used?: string[];
}

interface AIAnalysis {
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  estimated_progress: number;
  recommended_exercises: string[];
  summary_for_tutor: string;
}

interface UseAIAnalysisResult {
  analysis: AIAnalysis | null;
  loading: boolean;
  error: string | null;
  analyzeSession: (data: SessionData) => Promise<void>;
}

export function useAIAnalysis(): UseAIAnalysisResult {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeSession = useCallback(async (data: SessionData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ia/analyze-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Falha ao analisar sessão");
      }

      const result = await response.json();
      setAnalysis(result.analysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      console.error("AI Analysis error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analysis,
    loading,
    error,
    analyzeSession,
  };
}
