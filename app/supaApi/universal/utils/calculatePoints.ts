import { convertPointUsingRuleType, stringToRuleType } from '@/app/dataClasses'

export function calculatePoints(
  ruleName: string,
  input: number,
  ruleValue: number,
): number {
  return convertPointUsingRuleType(
    stringToRuleType(ruleName),
    ruleValue,
    input,
  )
}
