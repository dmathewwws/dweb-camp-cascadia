/** Film-edge date stamp, e.g. `'26·8·06` */
export function formatStamp(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `'${yy}·${d.getMonth() + 1}·${dd}`
}

/** 24h clock stamp, e.g. `10:14` */
export function formatTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
