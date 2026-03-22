export const DRILL_CATEGORIES: Record<string, string[]> = {
  Technical: ['first-touch', 'passing', 'finishing', 'heading', 'dribbling'],
  Tactical: ['positioning', 'decision-making', 'pressing', 'transition', 'set-pieces'],
  Physical: ['speed', 'endurance', 'strength', 'agility'],
  Mental: ['communication', 'composure', 'concentration'],
}

export const ALL_CATEGORIES = Object.values(DRILL_CATEGORIES).flat()

export const categoryLabel = (cat: string) =>
  cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
