import type { StressBand } from "@/types";

export interface StressScores {
  fatigueScore: number; // 1-5, higher = worse
  motivationScore: number; // 1-5, higher = better (inverted)
  sleepScore: number; // 1-5, higher = better (inverted)
  conflictPerception: number; // 1-5, higher = worse
  stressLevel: number; // 1-5, higher = worse
}

export function computeStressIndex(scores: StressScores): number {
  const raw =
    scores.fatigueScore +
    (6 - scores.motivationScore) +
    (6 - scores.sleepScore) +
    scores.conflictPerception +
    scores.stressLevel;
  // raw: 5 (best) – 25 (worst)
  return Number((((raw - 5) / 20) * 100).toFixed(1));
}

export function getStressBand(index: number): StressBand {
  if (index <= 33) return "RENDAH";
  if (index <= 66) return "SEDANG";
  return "TINGGI";
}

export function computeTeamStressIndex(responses: StressScores[]): number {
  if (responses.length === 0) return 0;
  const sum = responses.reduce((acc, r) => acc + computeStressIndex(r), 0);
  return Number((sum / responses.length).toFixed(1));
}

export const STRESS_QUESTIONS = [
  {
    key: "fatigueScore" as const,
    label: "Tingkat kelelahan",
    description: "Seberapa lelah Anda merasa minggu ini?",
    labels: ["Tidak lelah", "Sedikit", "Sedang", "Cukup lelah", "Sangat lelah"],
  },
  {
    key: "motivationScore" as const,
    label: "Tingkat motivasi",
    description: "Seberapa termotivasi Anda menjalani program?",
    labels: ["Tidak termotivasi", "Kurang", "Sedang", "Cukup", "Sangat termotivasi"],
  },
  {
    key: "sleepScore" as const,
    label: "Kualitas tidur",
    description: "Seberapa nyenyak tidur Anda minggu ini?",
    labels: ["Sangat buruk", "Buruk", "Sedang", "Baik", "Sangat baik"],
  },
  {
    key: "conflictPerception" as const,
    label: "Persepsi konflik",
    description: "Seberapa Anda merasakan konflik dalam tim?",
    labels: ["Tidak ada", "Sangat sedikit", "Sedang", "Cukup terasa", "Sangat terasa"],
  },
  {
    key: "stressLevel" as const,
    label: "Tingkat stres",
    description: "Seberapa stres Anda secara keseluruhan?",
    labels: ["Tidak stres", "Sedikit", "Sedang", "Cukup stres", "Sangat stres"],
  },
];

export function stressBandLabel(band: StressBand): string {
  switch (band) {
    case "RENDAH":
      return "Rendah";
    case "SEDANG":
      return "Sedang";
    case "TINGGI":
      return "Tinggi";
  }
}
