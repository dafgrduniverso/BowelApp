// Generates the PNG app icons (no image dependencies): a teal rounded square with a white ring.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size, { rounded }) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const r = size * 0.22
  const cx = size / 2
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4
      // rounded-corner mask
      let inside = true
      if (rounded) {
        const dx = Math.max(r - x, 0, x - (size - 1 - r))
        const dy = Math.max(r - y, 0, y - (size - 1 - r))
        inside = dx * dx + dy * dy <= r * r
      }
      const d = Math.hypot(x - cx, y - cx)
      const ring = d > size * 0.2 && d < size * 0.3
      const dot = d < size * 0.08
      const [R, G, B] = ring || dot ? [255, 255, 255] : [15, 118, 110]
      raw[o] = R
      raw[o + 1] = G
      raw[o + 2] = B
      raw[o + 3] = inside ? 255 : 0
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', png(192, { rounded: false }))
writeFileSync('public/icon-512.png', png(512, { rounded: false }))
writeFileSync('public/apple-touch-icon.png', png(180, { rounded: false }))
writeFileSync(
  'public/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0f766e"/><circle cx="50" cy="50" r="25" fill="none" stroke="#fff" stroke-width="10"/><circle cx="50" cy="50" r="8" fill="#fff"/></svg>\n`,
)
console.log('icons written')
