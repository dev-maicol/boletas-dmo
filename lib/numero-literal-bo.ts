/**
 * Literal en mayúsculas para montos en bolivianos (boletas de pago).
 * Ej.: 3928.05 → "SON: TRES MIL NOVECIENTOS VEINTIOCHO 05/100 BOLIVIANOS"
 */

const UNIDADES = [
  "",
  "UNO",
  "DOS",
  "TRES",
  "CUATRO",
  "CINCO",
  "SEIS",
  "SIETE",
  "OCHO",
  "NUEVE",
] as const

const ESPECIALES = [
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISEIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
] as const

const DECENAS = [
  "",
  "",
  "VEINTE",
  "TREINTA",
  "CUARENTA",
  "CINCUENTA",
  "SESENTA",
  "SETENTA",
  "OCHENTA",
  "NOVENTA",
] as const

const CIENTOS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
] as const

function veinti(n: number): string {
  const m: Record<number, string> = {
    1: "VEINTIUNO",
    2: "VEINTIDOS",
    3: "VEINTITRES",
    4: "VEINTICUATRO",
    5: "VEINTICINCO",
    6: "VEINTISEIS",
    7: "VEINTISIETE",
    8: "VEINTIOCHO",
    9: "VEINTINUEVE",
  }
  return m[n] ?? ""
}

/** 0–99 */
function hasta99(n: number): string {
  if (n < 10) return UNIDADES[n]
  if (n < 20) return ESPECIALES[n - 10]
  const d = Math.floor(n / 10)
  const u = n % 10
  if (d === 2) return u === 0 ? "VEINTE" : veinti(u)
  const base = DECENAS[d]
  if (u === 0) return base
  return `${base} Y ${UNIDADES[u]}`
}

/** 0–999 */
function hasta999(n: number): string {
  if (n === 0) return ""
  if (n < 100) return hasta99(n)
  const c = Math.floor(n / 100)
  const r = n % 100
  if (c === 1 && r === 0) return "CIEN"
  if (c === 1) return `CIENTO ${hasta99(r)}`.trim()
  const cab = CIENTOS[c]
  return r ? `${cab} ${hasta99(r)}`.trim() : cab
}

/** 1.000 – 999.999 (sin millones). */
function milesYResto(n: number): string {
  const m = Math.floor(n / 1000)
  const r = n % 1000
  const parteMiles = m === 1 ? "MIL" : `${hasta999(m)} MIL`.trim()
  if (r === 0) return parteMiles
  return `${parteMiles} ${hasta999(r)}`.trim()
}

/** Entero ≥ 0 a palabras (mayúsculas). */
export function enteroBolivianoATexto(n: number): string {
  if (!Number.isFinite(n) || n < 0) n = 0
  n = Math.floor(n)
  if (n === 0) return "CERO"
  if (n < 1000) return hasta999(n)
  if (n < 1_000_000) return milesYResto(n)
  if (n < 1_000_000_000) {
    const mill = Math.floor(n / 1_000_000)
    const r = n % 1_000_000
    const cabeza =
      mill === 1 ? "UN MILLON" : `${hasta999(mill)} MILLONES`.trim()
    if (r === 0) return cabeza
    return r < 1000
      ? `${cabeza} ${hasta999(r)}`.trim()
      : `${cabeza} ${milesYResto(r)}`.trim()
  }
  return "MONTO MUY ELEVADO"
}

/** Línea tipo boleta: SON: … XX/100 BOLIVIANOS */
export function literalLiquidoPagable(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) amount = 0
  const totalCent = Math.round(amount * 100)
  const entero = Math.floor(totalCent / 100)
  const centavos = totalCent % 100
  const texto = enteroBolivianoATexto(entero)
  const c = String(centavos).padStart(2, "0")
  return `SON: ${texto} ${c}/100 BOLIVIANOS`
}
