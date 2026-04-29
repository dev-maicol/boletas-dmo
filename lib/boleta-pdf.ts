import { readFile } from "fs/promises"
import path from "path"
import type { PDFImage, PDFPage } from "pdf-lib"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import { literalLiquidoPagable } from "@/lib/numero-literal-bo"

/** Carta vertical (puntos), US Letter — plantilla de cada boleta */
export const LETTER_WIDTH = 612
export const LETTER_HEIGHT = 792

/** Carta horizontal: dos boletas lado a lado */
export const LETTER_LANDSCAPE_WIDTH = 792
export const LETTER_LANDSCAPE_HEIGHT = 612

const EMPRESA_NOMBRE = "DMO S.R.L."
const EMPRESA_NIT = "307410029"

const VERDE_OSCURO = rgb(0.11, 0.45, 0.26)
const VERDE_CLARO = rgb(0.88, 0.95, 0.9)
const GRID = rgb(0.55, 0.6, 0.55)
const NEGRO = rgb(0.1, 0.1, 0.1)
const GRIS = rgb(0.35, 0.35, 0.35)

export type SucursalHeader = {
  nombre?: string | null
  direccion?: string | null
  numero_empleador?: string | null
}

export type DetalleRow = {
  id: string
  email: string | null
  nombre: string | null
  ci: string | null
  cargo: string | null
  fecha_ingreso: string | null
  haber_basico: number | null
  dias_trabajados: number | null
  haber_mensual: number | null
  bono_antiguedad: number | null
  total_ganado: number | null
  afp: number | null
  otros_descuentos: number | null
  total_descuentos: number | null
  liquido_pagable: number | null
  planillas?: { mes: number | null; anio: number | null } | null
  trabajadores?: {
    sucursales?: SucursalHeader | null
  } | null
}

function fmtMoney(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "0,00"
  return Number(n).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function mesNombre(m: number | null | undefined): string {
  if (m == null || m < 1 || m > 12) return "—"
  return new Date(2000, m - 1, 1)
    .toLocaleString("es-BO", { month: "long" })
    .toUpperCase()
}

function fechaDMY(iso: string | null | undefined): string {
  if (!iso) return "—"
  const s = String(iso).trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const m2 = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s)
  if (m2) return `${m2[1]}/${m2[2]}/${m2[3]}`
  return s.slice(0, 10)
}

function wrapLines(
  text: string,
  maxW: number,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(trial, size) <= maxW) line = trial
    else {
      if (line) lines.push(line)
      if (font.widthOfTextAtSize(w, size) <= maxW) line = w
      else {
        let chunk = ""
        for (const ch of w) {
          const t2 = chunk + ch
          if (font.widthOfTextAtSize(t2, size) <= maxW) chunk = t2
          else {
            if (chunk) lines.push(chunk)
            chunk = ch
          }
        }
        line = chunk
      }
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : [""]
}

async function tryLoadRaster(
  pdfDoc: PDFDocument,
  basename: string
): Promise<{ image: PDFImage; w: number; h: number } | null> {
  const baseDir = path.join(process.cwd(), "public", "boleta")
  const tryOne = async (name: string) => {
    const filePath = path.join(baseDir, name)
    const buf = await readFile(filePath)
    const lower = name.toLowerCase()
    if (lower.endsWith(".png")) {
      const image = await pdfDoc.embedPng(buf)
      return { image, w: image.width, h: image.height }
    }
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
      const image = await pdfDoc.embedJpg(buf)
      return { image, w: image.width, h: image.height }
    }
    return null
  }
  for (const name of [
    `${basename}.png`,
    `${basename}.jpg`,
    `${basename}.jpeg`,
  ]) {
    try {
      const r = await tryOne(name)
      if (r) return r
    } catch {
      /* siguiente extensión */
    }
  }
  return null
}

const STROKE = 0.35

function fillRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: ReturnType<typeof rgb> | undefined
) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: fill,
    borderWidth: 0,
  })
}

function strokeRectOutline(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number
) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: GRID,
    borderWidth: STROKE,
    color: undefined,
  })
}

function hLine(
  page: PDFPage,
  x1: number,
  x2: number,
  y: number
) {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness: STROKE,
    color: GRID,
  })
}

function vLine(page: PDFPage, x: number, y1: number, y2: number) {
  page.drawLine({
    start: { x, y: y1 },
    end: { x, y: y2 },
    thickness: STROKE,
    color: GRID,
  })
}

/**
 * Una boleta completa en **una** página carta (612×792).
 * Se usa como donante para duplicar en `buildBoletaPdf`.
 */
export async function addBoletaLetterPage(
  pdfDoc: PDFDocument,
  row: DetalleRow
): Promise<void> {
  const suc = row.trabajadores?.sucursales || {}
  const mes = row.planillas?.mes
  const anio = row.planillas?.anio ?? "—"

  const page = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT])
  const { width, height } = page.getSize()
  const margin = 32
  const contentW = width - 2 * margin
  const padLabel = 6
  const padValRight = 14
  const labW = 86
  /** Sin huecos entre columnas: dos pares etiqueta–valor ocupan todo el ancho */
  const valW = (contentW - 2 * labW) / 2

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let y = height - margin

  const logoMaxH = 50
  /** Sube el logo respecto al bloque de texto del encabezado */
  const logoLift = 12
  const logoImg = await tryLoadRaster(pdfDoc, "logo")
  if (logoImg) {
    const scale = logoMaxH / logoImg.h
    const lw = logoImg.w * scale
    const lh = logoImg.h * scale
    const lx = width - margin - lw
    const ly = y - lh + logoLift
    page.drawImage(logoImg.image, { x: lx, y: ly, width: lw, height: lh })
  }

  const x0 = margin
  const x1 = x0 + labW
  const x2 = x1 + valW
  const x3 = x2 + labW
  const x4 = x3 + valW

  page.drawText(EMPRESA_NOMBRE, {
    x: margin,
    y,
    size: 12,
    font: bold,
    color: NEGRO,
  })
  y -= 14
  page.drawText(String(suc.direccion || "").slice(0, 92), {
    x: margin,
    y,
    size: 8,
    font,
    color: NEGRO,
  })
  y -= 11
  page.drawText(`N° DE EMPLEADOR: ${suc.numero_empleador || "—"}`, {
    x: margin,
    y,
    size: 8,
    font,
    color: NEGRO,
  })
  y -= 11
  page.drawText(`NIT: ${EMPRESA_NIT}`, {
    x: margin,
    y,
    size: 8,
    font: bold,
    color: NEGRO,
  })
  y -= 26

  const titulo = "BOLETA DE PAGO"
  const tw = bold.widthOfTextAtSize(titulo, 15)
  page.drawText(titulo, {
    x: (width - tw) / 2,
    y,
    size: 15,
    font: bold,
    color: NEGRO,
  })
  y -= 16
  const sub = "(Expresado en bolivianos)"
  const sw = font.widthOfTextAtSize(sub, 9)
  page.drawText(sub, {
    x: (width - sw) / 2,
    y,
    size: 9,
    font,
    color: GRIS,
  })
  y -= 20

  const rowH = 20
  const gridRows: [string, string, string, string][] = [
    ["NOMBRE:", String(row.nombre || "—"), "SUELDO BÁSICO:", fmtMoney(row.haber_basico)],
    ["C.I.:", String(row.ci || "—"), "DÍAS TRABAJADOS:", String(row.dias_trabajados ?? "—")],
    ["CARGO:", String(row.cargo || "—"), "MES:", mesNombre(mes ?? null)],
    ["F. INGRESO:", fechaDMY(row.fecha_ingreso), "GESTIÓN:", String(anio)],
  ]

  const gridTop = y
  const gridBottom = gridTop - gridRows.length * rowH

  for (let i = 0; i < gridRows.length; i++) {
    const [l1, v1, l2, v2] = gridRows[i]
    const yy = gridTop - (i + 1) * rowH
    fillRect(page, x0, yy, labW, rowH, undefined)
    fillRect(page, x1, yy, valW, rowH, undefined)
    fillRect(page, x2, yy, labW, rowH, undefined)
    fillRect(page, x3, yy, valW, rowH, undefined)
    const midY = yy + 6
    page.drawText(l1, {
      x: x0 + padLabel,
      y: midY,
      size: 7,
      font: bold,
      color: NEGRO,
    })
    page.drawText(l2, {
      x: x2 + padLabel,
      y: midY,
      size: 7,
      font: bold,
      color: NEGRO,
    })
    const w1 = font.widthOfTextAtSize(v1, 8)
    const w2 = font.widthOfTextAtSize(v2, 8)
    page.drawText(v1, {
      x: x1 + valW - padValRight - w1,
      y: midY,
      size: 8,
      font,
      color: NEGRO,
    })
    page.drawText(v2, {
      x: x3 + valW - padValRight - w2,
      y: midY,
      size: 8,
      font,
      color: NEGRO,
    })
  }

  strokeRectOutline(page, x0, gridBottom, x4 - x0, gridTop - gridBottom)
  for (const vx of [x1, x2, x3]) {
    vLine(page, vx, gridBottom, gridTop)
  }
  for (let i = 1; i < gridRows.length; i++) {
    hLine(page, x0, x4, gridTop - i * rowH)
  }

  y = gridBottom - 4

  const colW = contentW / 2
  const xIng = margin
  const xEgr = xIng + colW
  const headerH = 18
  const lineH = 16
  const ingRows = [
    ["SALARIO GANADO", fmtMoney(row.haber_mensual ?? row.total_ganado)],
    ["BONO DE ANTIGÜEDAD", fmtMoney(row.bono_antiguedad)],
    ["COMISIONES", fmtMoney(0)],
    ["OTROS", fmtMoney(0)],
    ["TOTAL GANADO", fmtMoney(row.total_ganado)],
    ["LÍQUIDO PAGABLE", fmtMoney(row.liquido_pagable)],
  ]
  const egrRows = [
    ["AFP-12,71 %", fmtMoney(row.afp)],
    ["RC IVA 13%", fmtMoney(0)],
    ["ANTICIPOS", fmtMoney(0)],
    ["OTROS", fmtMoney(row.otros_descuentos)],
    ["TOTAL DESCUENTOS", fmtMoney(row.total_descuentos)],
  ]
  const bodyRows = Math.max(ingRows.length, egrRows.length)

  const yBlockTop = y
  fillRect(page, xIng, y - headerH, colW, headerH, VERDE_OSCURO)
  const labIng = "INGRESOS"
  const twIng = bold.widthOfTextAtSize(labIng, 9)
  page.drawText(labIng, {
    x: xIng + (colW - twIng) / 2,
    y: y - headerH + 5,
    size: 9,
    font: bold,
    color: rgb(1, 1, 1),
  })

  fillRect(page, xEgr, y - headerH, colW, headerH, VERDE_OSCURO)
  const labEgr = "EGRESOS"
  const twEgr = bold.widthOfTextAtSize(labEgr, 9)
  page.drawText(labEgr, {
    x: xEgr + (colW - twEgr) / 2,
    y: y - headerH + 5,
    size: 9,
    font: bold,
    color: rgb(1, 1, 1),
  })

  let ry = y - headerH
  for (let i = 0; i < bodyRows; i++) {
    ry -= lineH
    const stripe = i % 2 === 0 ? rgb(0.97, 0.99, 0.98) : undefined
    fillRect(page, xIng, ry, colW, lineH, stripe)
    fillRect(page, xEgr, ry, colW, lineH, stripe)
    const cy = ry + 4
    const ing = ingRows[i]
    const egr = egrRows[i]
    if (ing) {
      const boldRow = i >= ingRows.length - 2
      const f = boldRow ? bold : font
      page.drawText(ing[0], { x: xIng + 4, y: cy, size: 7.5, font: f, color: NEGRO })
      const aw = f.widthOfTextAtSize(ing[1], 8)
      page.drawText(ing[1], {
        x: xIng + colW - aw - padValRight,
        y: cy,
        size: 8,
        font: f,
        color: NEGRO,
      })
    }
    if (egr) {
      const boldRow = i >= egrRows.length - 1
      const f = boldRow ? bold : font
      page.drawText(egr[0], { x: xEgr + 4, y: cy, size: 7.5, font: f, color: NEGRO })
      const aw = f.widthOfTextAtSize(egr[1], 8)
      page.drawText(egr[1], {
        x: xEgr + colW - aw - padValRight,
        y: cy,
        size: 8,
        font: f,
        color: NEGRO,
      })
    }
  }

  const blockBottom = ry
  const blockH = yBlockTop - blockBottom
  strokeRectOutline(page, xIng, blockBottom, colW, blockH)
  strokeRectOutline(page, xEgr, blockBottom, colW, blockH)

  for (let i = 1; i < bodyRows; i++) {
    const hy = yBlockTop - headerH - i * lineH
    hLine(page, xIng, xIng + colW, hy)
    hLine(page, xEgr, xEgr + colW, hy)
  }

  y = ry - 10

  const liquido = Number(row.liquido_pagable ?? 0)
  const literal = literalLiquidoPagable(liquido)
  const litLines = wrapLines(literal, contentW, font, 8)
  for (const ln of litLines) {
    page.drawText(ln, { x: margin, y, size: 8, font, color: NEGRO })
    y -= 10
  }
  y -= 22

  const firmaImg = await tryLoadRaster(pdfDoc, "firma-sello")
  const leftW = contentW * 0.42
  /** Bloque firma un poco más arriba */
  const lineY = y - 22
  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: margin + leftW, y: lineY },
    thickness: 0.5,
    color: GRID,
  })
  const rc = "RECIBÍ CONFORME"
  const rw = font.widthOfTextAtSize(rc, 8)
  page.drawText(rc, {
    x: margin + (leftW - rw) / 2,
    y: lineY - 14,
    size: 8,
    font,
    color: NEGRO,
  })

  if (firmaImg) {
    const maxW = contentW * 0.48
    const maxH = 58
    const sc = Math.min(maxW / firmaImg.w, maxH / firmaImg.h)
    const fw = firmaImg.w * sc
    const fh = firmaImg.h * sc
    const fx = width - margin - fw
    const firmaLift = 16
    const fy = lineY - fh + firmaLift
    page.drawImage(firmaImg.image, { x: fx, y: fy, width: fw, height: fh })
  }
}

/**
 * PDF **carta horizontal** (792×612): misma boleta **dos veces**, una por mitad
 * (columna izquierda y derecha), lista para imprimir.
 */
export async function buildBoletaPdf(row: DetalleRow): Promise<Uint8Array> {
  const donor = await PDFDocument.create()
  await addBoletaLetterPage(donor, row)

  const out = await PDFDocument.create()
  const sheet = out.addPage([
    LETTER_LANDSCAPE_WIDTH,
    LETTER_LANDSCAPE_HEIGHT,
  ])

  const donorBytes = await donor.save()
  const [embedded] = await out.embedPdf(donorBytes)

  const mH = 10
  const mV = 10
  const gutter = 8
  const pageW = LETTER_LANDSCAPE_WIDTH
  const pageH = LETTER_LANDSCAPE_HEIGHT
  const innerW = pageW - 2 * mH
  const innerH = pageH - 2 * mV
  const colW = (innerW - gutter) / 2

  const s = Math.min(colW / LETTER_WIDTH, innerH / LETTER_HEIGHT)
  const dw = LETTER_WIDTH * s
  const dh = LETTER_HEIGHT * s
  const yBottom = mV + (innerH - dh) / 2

  const xLeft = mH + (colW - dw) / 2
  const xRight = mH + colW + gutter + (colW - dw) / 2

  sheet.drawPage(embedded, { x: xLeft, y: yBottom, width: dw, height: dh })
  sheet.drawPage(embedded, { x: xRight, y: yBottom, width: dw, height: dh })

  return out.save()
}
