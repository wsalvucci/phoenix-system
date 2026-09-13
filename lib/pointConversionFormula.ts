export type FormulaValidationResult = { valid: true } | { valid: false; error: string }

type FormulaNode =
  | { type: "number"; value: number }
  | { type: "variable" }
  | { type: "unary"; operator: "+" | "-"; operand: FormulaNode }
  | { type: "binary"; operator: "+" | "-" | "*" | "/" | "%" | "^"; left: FormulaNode; right: FormulaNode }

class FormulaParser {
  private position = 0
  constructor(private readonly formula: string) {}

  parse(): FormulaNode {
    const node = this.parseExpression()
    this.skipWhitespace()
    if (this.position !== this.formula.length) {
      throw new Error(`Unexpected "${this.formula[this.position]}" at position ${this.position + 1}`)
    }
    return node
  }

  private parseExpression(): FormulaNode {
    let node = this.parseTerm()
    while (true) {
      this.skipWhitespace()
      if (this.consume("+")) node = { type: "binary", operator: "+", left: node, right: this.parseTerm() }
      else if (this.consume("-")) node = { type: "binary", operator: "-", left: node, right: this.parseTerm() }
      else return node
    }
  }

  private parseTerm(): FormulaNode {
    let node = this.parsePower()
    while (true) {
      this.skipWhitespace()
      if (this.consume("*")) node = { type: "binary", operator: "*", left: node, right: this.parsePower() }
      else if (this.consume("/")) node = { type: "binary", operator: "/", left: node, right: this.parsePower() }
      else if (this.consume("%")) node = { type: "binary", operator: "%", left: node, right: this.parsePower() }
      else return node
    }
  }

  private parsePower(): FormulaNode {
    const left = this.parseUnary()
    this.skipWhitespace()
    return this.consume("^") ? { type: "binary", operator: "^", left, right: this.parsePower() } : left
  }

  private parseUnary(): FormulaNode {
    this.skipWhitespace()
    if (this.consume("+")) return { type: "unary", operator: "+", operand: this.parseUnary() }
    if (this.consume("-")) return { type: "unary", operator: "-", operand: this.parseUnary() }
    return this.parsePrimary()
  }

  private parsePrimary(): FormulaNode {
    this.skipWhitespace()
    if (this.consume("(")) {
      const node = this.parseExpression()
      this.skipWhitespace()
      if (!this.consume(")")) throw new Error(`Expected ")" at position ${this.position + 1}`)
      return node
    }
    if (this.formula[this.position]?.toLowerCase() === "x") {
      this.position += 1
      return { type: "variable" }
    }
    const match = this.formula.slice(this.position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)
    if (!match) throw new Error(`Expected a number, x, or "(" at position ${this.position + 1}`)
    this.position += match[0].length
    return { type: "number", value: Number(match[0]) }
  }

  private skipWhitespace() {
    while (/\s/.test(this.formula[this.position] ?? "")) this.position += 1
  }

  private consume(character: string) {
    if (this.formula[this.position] !== character) return false
    this.position += 1
    return true
  }
}

function evaluateNode(node: FormulaNode, input: number): number {
  if (node.type === "number") return node.value
  if (node.type === "variable") return input
  if (node.type === "unary") {
    const value = evaluateNode(node.operand, input)
    return node.operator === "-" ? -value : value
  }
  const left = evaluateNode(node.left, input)
  const right = evaluateNode(node.right, input)
  if ((node.operator === "/" || node.operator === "%") && right === 0) throw new Error("Division by zero")
  switch (node.operator) {
    case "+": return left + right
    case "-": return left - right
    case "*": return left * right
    case "/": return left / right
    case "%": return left % right
    case "^": return Math.pow(left, right)
  }
}

function parseFormula(formula: string): FormulaNode {
  return new FormulaParser(formula).parse()
}

export function evaluatePointConversionFormula(formula: string | null | undefined, input: number): number {
  if (!Number.isFinite(input)) throw new Error("Point input must be a finite number")
  if (!Number.isInteger(input)) throw new Error("Point input must be a whole number")
  const normalized = formula?.trim()
  const result = normalized ? evaluateNode(parseFormula(normalized), input) : input
  if (!Number.isFinite(result)) throw new Error("Formula result must be finite")
  const rounded = Math.round(result)
  if (!Number.isSafeInteger(rounded)) throw new Error("Formula result is outside the supported range")
  return rounded
}

export function validatePointConversionFormula(formula: string | null | undefined): FormulaValidationResult {
  if (!formula?.trim()) return { valid: true }
  if (formula.length > 200) return { valid: false, error: "Formula must be 200 characters or fewer" }
  if (!/[xX]/.test(formula)) return { valid: false, error: "Formula must contain x" }
  try {
    parseFormula(formula.trim())
    return { valid: true }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Invalid formula" }
  }
}
