// Shared NPC schedule — used by GameCanvas (movement) and game page (indoor/outdoor logic)

export type ScheduleEntry = {
  hour:     number
  tx:       number
  ty:       number
  activity: string
  inside?:  string   // building id the NPC is inside (hide from town, show in interior)
}

export const NPC_SCHEDULE: Record<string, ScheduleEntry[]> = {
  eleanor: [
    { hour:  5, tx:  5, ty:  5, activity: 'Opening the bakery',    inside: 'bakery'   },
    { hour: 13, tx:  9, ty:  9, activity: 'Afternoon walk'                            },
    { hour: 15, tx: 11, ty:  9, activity: 'By the well'                               },
    { hour: 17, tx:  5, ty:  5, activity: 'Evening baking',         inside: 'bakery'  },
    { hour: 20, tx:  5, ty:  5, activity: 'Closing up',             inside: 'bakery'  },
  ],
  silas: [
    { hour:  6, tx: 18, ty:  5, activity: 'At the forge',           inside: 'shop'    },
    { hour: 12, tx: 17, ty:  8, activity: 'Lunch break'                               },
    { hour: 14, tx: 18, ty:  5, activity: 'Back at the forge',      inside: 'shop'    },
    { hour: 19, tx: 12, ty: 16, activity: 'Evening at tavern',      inside: 'tavern'  },
    { hour: 22, tx: 18, ty:  5, activity: 'Retired for the night',  inside: 'shop'    },
  ],
  maeve: [
    { hour:  6, tx:  2, ty: 16, activity: 'Tending garden',         inside: 'cottage' },
    { hour: 10, tx:  4, ty: 14, activity: 'Gathering herbs'                           },
    { hour: 14, tx: 18, ty: 16, activity: 'Visiting library',       inside: 'library' },
    { hour: 17, tx: 11, ty:  9, activity: 'Evening walk'                              },
    { hour: 20, tx:  2, ty: 16, activity: 'Home at dusk',           inside: 'cottage' },
  ],
  caleb: [
    { hour:  8, tx: 12, ty:  5, activity: 'Morning at Town Hall',   inside: 'townhall'},
    { hour: 11, tx:  9, ty:  9, activity: 'Walking the town'                          },
    { hour: 13, tx:  5, ty:  8, activity: 'Lunch near bakery'                         },
    { hour: 15, tx: 14, ty: 12, activity: 'Afternoon round'                           },
    { hour: 19, tx: 12, ty: 16, activity: 'Evening at tavern',      inside: 'tavern'  },
  ],
  ruth: [
    { hour:  8, tx: 18, ty: 16, activity: 'Library open',           inside: 'library' },
    { hour: 17, tx: 11, ty:  9, activity: 'Evening observation'                       },
    { hour: 19, tx: 18, ty: 16, activity: 'Closing library',        inside: 'library' },
  ],
}

/** Returns the current schedule entry for an NPC given the hour */
export function getCurrentEntry(npcId: string, hour: number): ScheduleEntry | null {
  const sched = NPC_SCHEDULE[npcId]
  if (!sched) return null
  let current = sched[0]
  for (const e of sched) { if (hour >= e.hour) current = e }
  return current
}

/** Returns whether an NPC is currently inside a building */
export function isNpcInside(npcId: string, hour: number): boolean {
  return !!getCurrentEntry(npcId, hour)?.inside
}

/** Returns the building an NPC is currently inside, or null */
export function getNpcInsideBuilding(npcId: string, hour: number): string | null {
  return getCurrentEntry(npcId, hour)?.inside ?? null
}
