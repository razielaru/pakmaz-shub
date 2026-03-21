import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { BASE_BARCODES, BASE_COORDINATES } from '../utils/constants'
import { setRuntimeBaseRegistry } from '../utils/baseRegistry'

function rowPriority(row, preferredUnit) {
  if (row.unit === preferredUnit) return 3
  if (!row.unit) return 2
  return 1
}

function mergeRegistryRows(rows, preferredUnit) {
  const coordinates = { ...BASE_COORDINATES }
  const barcodes = { ...BASE_BARCODES }
  const notes = {}

  const sortedRows = [...(rows || [])].sort((a, b) => {
    const priorityGap = rowPriority(a, preferredUnit) - rowPriority(b, preferredUnit)
    if (priorityGap !== 0) return priorityGap
    return new Date(a.updated_at || 0) - new Date(b.updated_at || 0)
  })

  sortedRows.forEach((row) => {
    if (!row.base) return

    if (row.barcode) {
      barcodes[row.base] = row.barcode
    }

    if (Number.isFinite(row.latitude) && Number.isFinite(row.longitude)) {
      coordinates[row.base] = [Number(row.latitude), Number(row.longitude)]
    }

    if (row.notes) {
      notes[row.base] = row.notes
    }
  })

  const baseNames = Array.from(new Set([
    ...Object.keys(coordinates),
    ...Object.keys(barcodes),
  ])).sort((a, b) => a.localeCompare(b, 'he'))

  return { coordinates, barcodes, notes, baseNames }
}

export function useBaseRegistry(preferredUnit) {
  const query = useQuery({
    queryKey: ['base-registry', preferredUnit || 'all'],
    queryFn: async () => {
      const fullQuery = await supabase
        .from('base_barcodes')
        .select('id, unit, base, barcode, latitude, longitude, notes, updated_at')

      if (!fullQuery.error) {
        return fullQuery.data || []
      }

      const fallbackQuery = await supabase
        .from('base_barcodes')
        .select('id, unit, base, barcode')

      if (fallbackQuery.error) throw fallbackQuery.error
      return fallbackQuery.data || []
    },
    staleTime: 1000 * 60 * 5,
  })

  const registry = useMemo(
    () => mergeRegistryRows(query.data || [], preferredUnit),
    [query.data, preferredUnit]
  )

  useEffect(() => {
    setRuntimeBaseRegistry({
      coordinates: registry.coordinates,
      barcodes: registry.barcodes,
    })
  }, [registry])

  return {
    ...query,
    ...registry,
  }
}
