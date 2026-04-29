import rawWards from './wards.json'
import type { Ward } from '../types'

const base = import.meta.env.BASE_URL

const wards: Ward[] = (rawWards as Ward[]).map(w => ({
  ...w,
  flag_url: base + w.flag_url,
  seal_url: base + w.seal_url,
}))

export default wards
