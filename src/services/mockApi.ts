export function createMockId(prefix: string, count: number) {
  return `${prefix}-${String(count).padStart(5, "0")}`
}

const nextIds: Record<string, number> = {}

export function nextMockId(prefix: string, initialValue: number) {
  nextIds[prefix] = (nextIds[prefix] ?? initialValue - 1) + 1
  return createMockId(prefix, nextIds[prefix])
}

export function nowLabel() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}
