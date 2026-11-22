export type VictorySeat = 'one' | 'two'
export type VictoryAction = 'add' | 'subtract' | 'captured' | 'rescued'
export type VictoryScore = { destroyed: number; manual: number; captured: number; rescued: number }
export type Victory = Partial<Record<VictorySeat, Partial<VictoryScore>>>

export function scoreFor(victory: Victory | undefined, seat: VictorySeat): VictoryScore {
  return { destroyed: 0, manual: 0, captured: 0, rescued: 0, ...victory?.[seat] }
}

export function victoryTotal(score: VictoryScore) {
  return score.destroyed + score.manual + 2 * (score.captured + score.rescued)
}
