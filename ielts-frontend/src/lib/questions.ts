import type { Task1Question, ValidateQuestionResponse } from '@/types/grading'

export type QuestionType =
  | 'agree_disagree'
  | 'discuss_both'
  | 'problem_solution'
  | 'advantages_disadvantages'
  | 'two_part'

export interface IELTSQuestion {
  question: string
  type: QuestionType
  topic: string
  is_mock: boolean
}

export const TYPE_LABELS: Record<QuestionType, string> = {
  agree_disagree: 'Agree / Disagree',
  discuss_both: 'Discuss Both Views',
  problem_solution: 'Problem & Solution',
  advantages_disadvantages: 'Advantages & Disadvantages',
  two_part: 'Two-Part Question',
}

export async function fetchQuestion(): Promise<IELTSQuestion> {
  const res = await fetch('/api/question')
  if (!res.ok) throw new Error('Failed to generate question')
  return res.json()
}

export async function fetchTask1Question(): Promise<Task1Question> {
  const res = await fetch('/api/question/task1')
  if (!res.ok) throw new Error('Failed to generate Task 1 question')
  return res.json()
}

export async function validateQuestion(
  question: string,
  taskType: 'task1' | 'task2' = 'task2'
): Promise<ValidateQuestionResponse> {
  const res = await fetch('/api/validate-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, task_type: taskType }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Validation request failed' }))
    throw new Error(err.message || 'Validation request failed')
  }
  return res.json()
}
