export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandom<T>(arr: T[], n: number, exclude?: T): T[] {
  const filtered = exclude ? arr.filter(x => x !== exclude) : [...arr]
  return shuffle(filtered).slice(0, n)
}
