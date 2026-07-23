/**
 * IP allowlist matching for the admin area (see src/middleware.ts).
 *
 * Runs in the Edge runtime, so only web-standard APIs may be used here
 * (no `node:net` etc.). Supports IPv4 and IPv6 addresses in CIDR notation;
 * IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) are normalized to IPv4.
 */

export interface IpRange {
  version: 4 | 6
  base: bigint
  prefixLength: number
}

const IPV4_BITS = 32
const IPV6_BITS = 128

function parseIpv4(ip: string): bigint | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null

  let value = 0n
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const octet = Number(part)
    if (octet > 255) return null
    value = (value << 8n) | BigInt(octet)
  }
  return value
}

function parseIpv6(ip: string): bigint | null {
  let address = ip
  const zoneIndex = address.indexOf('%')
  if (zoneIndex !== -1) address = address.slice(0, zoneIndex)

  // Embedded IPv4 tail, e.g. ::ffff:130.60.1.2
  const lastColon = address.lastIndexOf(':')
  if (lastColon !== -1 && address.includes('.', lastColon)) {
    const v4 = parseIpv4(address.slice(lastColon + 1))
    if (v4 === null) return null
    const high = (v4 >> 16n) & 0xffffn
    const low = v4 & 0xffffn
    address = `${address.slice(0, lastColon)}:${high.toString(16)}:${low.toString(16)}`
  }

  const doubleColonSplit = address.split('::')
  if (doubleColonSplit.length > 2) return null

  const head = doubleColonSplit[0] ? doubleColonSplit[0].split(':') : []
  const tail =
    doubleColonSplit.length === 2 && doubleColonSplit[1]
      ? doubleColonSplit[1].split(':')
      : []

  const missing = 8 - head.length - tail.length
  if (doubleColonSplit.length === 2 ? missing < 1 : missing !== 0) return null

  const groups = [...head, ...Array(missing).fill('0'), ...tail]
  let value = 0n
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null
    value = (value << 16n) | BigInt(parseInt(group, 16))
  }
  return value
}

function parseIp(ip: string): { version: 4 | 6; value: bigint } | null {
  const trimmed = ip.trim()
  if (trimmed.includes(':')) {
    // Normalize IPv4-mapped IPv6 addresses to IPv4 so they match v4 ranges
    const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
    if (mapped) {
      const v4 = parseIpv4(mapped[1])
      return v4 === null ? null : { version: 4, value: v4 }
    }
    const v6 = parseIpv6(trimmed)
    return v6 === null ? null : { version: 6, value: v6 }
  }
  const v4 = parseIpv4(trimmed)
  return v4 === null ? null : { version: 4, value: v4 }
}

export function parseIpRange(range: string): IpRange | null {
  const [address, prefix, ...rest] = range.trim().split('/')
  if (rest.length > 0 || !address) return null

  const parsed = parseIp(address)
  if (!parsed) return null

  const maxBits = parsed.version === 4 ? IPV4_BITS : IPV6_BITS
  let prefixLength = maxBits
  if (prefix !== undefined) {
    if (!/^\d{1,3}$/.test(prefix)) return null
    prefixLength = Number(prefix)
    if (prefixLength > maxBits) return null
  }

  const hostBits = BigInt(maxBits - prefixLength)
  return {
    version: parsed.version,
    base: (parsed.value >> hostBits) << hostBits,
    prefixLength,
  }
}

/**
 * Parses a comma-separated list of CIDR ranges (e.g. "130.60.0.0/16,127.0.0.1/32").
 * Invalid entries are skipped.
 */
export function parseIpRanges(raw: string | undefined | null): IpRange[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(parseIpRange)
    .filter((range): range is IpRange => range !== null)
}

export function isIpAllowed(ip: string, ranges: IpRange[]): boolean {
  const parsed = parseIp(ip)
  if (!parsed) return false

  return ranges.some((range) => {
    if (range.version !== parsed.version) return false
    const maxBits = range.version === 4 ? IPV4_BITS : IPV6_BITS
    const hostBits = BigInt(maxBits - range.prefixLength)
    return (parsed.value >> hostBits) << hostBits === range.base
  })
}
