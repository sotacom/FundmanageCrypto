declare module 'papaparse' {
  interface ParseConfig {
    header?: boolean
    skipEmptyLines?: boolean
    encoding?: string
    complete?: (results: ParseResult) => void
    error?: (error: { message: string }) => void
  }

  interface ParseResult {
    data: any[]
    errors: any[]
    meta: {
      delimiter: string
      linebreak: string
      aborted: boolean
      truncated: boolean
      fields?: string[]
    }
  }

  function parse(file: File, config?: ParseConfig): void
  function parse(csvString: string, config?: ParseConfig): ParseResult

  export default { parse }
  export { parse, ParseConfig, ParseResult }
}
