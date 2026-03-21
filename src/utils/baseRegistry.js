import { BASE_BARCODES, BASE_COORDINATES } from './constants'

let runtimeCoordinates = { ...BASE_COORDINATES }
let runtimeBarcodes = { ...BASE_BARCODES }

export function setRuntimeBaseRegistry({ coordinates, barcodes } = {}) {
  runtimeCoordinates = { ...BASE_COORDINATES, ...(coordinates || {}) }
  runtimeBarcodes = { ...BASE_BARCODES, ...(barcodes || {}) }
}

export function getBaseCoordinatesMap() {
  return runtimeCoordinates
}

export function getBaseBarcodesMap() {
  return runtimeBarcodes
}

export function getBaseCoordinate(base) {
  return base ? runtimeCoordinates[base] || null : null
}

export function getBaseBarcode(base) {
  return base ? runtimeBarcodes[base] || null : null
}

export function getAllBaseNames() {
  return Array.from(new Set([
    ...Object.keys(runtimeCoordinates || {}),
    ...Object.keys(runtimeBarcodes || {}),
  ])).sort((a, b) => a.localeCompare(b, 'he'))
}
