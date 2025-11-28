const VERSION_REGEX = /^(?<version>[\d.]+)(?:-(?:beta\.)?(?<beta>[\d\.]+|[a-zA-Z]+[\w]*))?$/

interface ParsedVersion {
	string: string
	version: number[]
	beta?: number[]
	custom?: string
}

type Operator = '<=' | '==' | '>=' | '>' | '<'

function parse(versionString: string): ParsedVersion {
	const match = versionString.match(VERSION_REGEX)

	if (!match) {
		// 对于无法解析的版本号，尝试提取数字部分
		const numbersOnly = versionString.match(/^([\d.]+)/)
		if (numbersOnly) {
			return {
				string: versionString,
				version: numbersOnly[1].split('.').map(v => parseInt(v)),
				custom: versionString.replace(numbersOnly[1], '')
			}
		}
		throw new Error(
			`Invalid version format '${versionString}'.` +
				"Expected a list of dot-separated numbers, optionally followed by '-beta.' " +
				"and another list of dot-separated numbers. E.g. '1.2.3' or '1.2.3-beta.4'"
		)
	}

	const { version, beta } = match.groups
	const betaPart = beta ? beta.split('.') : undefined
	const isBetaNumeric = betaPart && betaPart.every(v => /^\d+$/.test(v))
	
	return {
		string: versionString,
		version: version.split('.').map(v => parseInt(v)),
		beta: isBetaNumeric ? betaPart.map(v => parseInt(v)) : undefined,
		custom: !isBetaNumeric && beta ? beta : undefined
	}
}

/**
 * Compare two version strings.
 * @returns 0 if equal, -1 if versionA < versionB, 1 if versionA > versionB
 */
function compare(versionA: string, versionB: string): number
/**
 * Compare two version strings with an operator.
 * @returns true if the comparison is true, false otherwise
 */
function compare(versionA: string, operator: Operator, versionB: string): boolean
function compare(versionA: string, operator?: Operator, versionB?: string): boolean | number {
	// If only two arguments are provided, treat the second as versionB and return the comparison result.
	if (versionB === undefined) {
		versionB = operator
		operator = undefined
	}

	let result = 0

	if (versionA !== versionB) {
		const parsedA = parse(versionA)
		const parsedB = parse(versionB)

		const maxLength = Math.max(parsedA.version.length, parsedB.version.length)
		for (let i = 0; i < maxLength; i++) {
			const a = parsedA.version.at(i) ?? 0
			const b = parsedB.version.at(i) ?? 0

			if (a > b) {
				result = 1
				break
			}

			if (a < b) {
				result = -1
				break
			}
		}

		// If the main versions are equal, compare beta versions.
		if (result === 0) {
			if (parsedA.beta && !parsedB.beta) {
				result = 1
			} else if (!parsedA.beta && parsedB.beta) {
				result = -1
			} else if (parsedA.beta && parsedB.beta) {
				result = compare(parsedA.beta.join('.'), parsedB.beta.join('.'))
			}
		}
	}

	switch (operator) {
		case '==':
			return result === 0
		case '<=':
			return result <= 0
		case '>=':
			return result >= 0
		case '<':
			return result === -1
		case '>':
			return result === 1
		// No comparison argument was provided, just return the comparison result
		case undefined:
			return result
		default:
			throw new Error(
				`Invalid version comparison operator '${operator}'. Expected one of '<=', '==', '>=', '>', '<'.`
			)
	}
}

function format(version: string): string {
	return version.replace('-beta.', ' Beta ')
}

// Backwards compatability
window.compareVersions = (versionA: string, versionB: string) => compare(versionA, '>', versionB)

const VersionUtil = {
	compare,
	parse,
	format,
}

declare global {
	interface Window {
		VersionUtil: typeof VersionUtil
	}
}
window.VersionUtil = VersionUtil

export default VersionUtil
