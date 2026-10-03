export interface CriterionScore {
  score: number;
  reason: string;
}

export interface SubScores {
  task_achievement: CriterionScore;
  coherence_and_cohesion: CriterionScore;
  lexical_resource: CriterionScore;
  grammatical_range_and_accuracy: CriterionScore;
}

export interface LineCorrection {
  original: string;
  corrected: string;
  explanation: string;
  category: 'grammar' | 'vocabulary' | 'coherence' | 'task_achievement';
}

export interface GradingResult {
  overall_band: number;
  sub_scores: SubScores;
  line_by_line_corrections: LineCorrection[];
  examiner_summary: string;
  is_mock: boolean;
  model_answer: string;
}

export type GradingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: GradingResult }
  | { status: 'error'; message: string };

export interface ChartSeries {
  name: string;
  data: number[];
}

export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'process' | 'map';

export interface ChartData {
  chart_type: ChartType;
  title: string;
  x_axis_label?: string;
  y_axis_label?: string;
  categories: string[];
  series: ChartSeries[];
}

export interface Task1Question {
  prompt: string;
  chart_data: ChartData;
  is_mock: boolean;
}

export interface ValidateQuestionResponse {
  is_valid: boolean;
  formatted_question: string;
  feedback: string;
}
