/** 金额：统一显示两位小数。 */
function money(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}

function pad(value) {
  return value < 10 ? '0' + value : String(value)
}

/**
 * 后端 LocalDateTime 按 UTC 生成且不带时区后缀，这里补齐后按本地时区展示。
 * 同时兼容带 Z / +08:00 的标准时间字符串和 MySQL 的空格分隔时间。
 */
function parseDate(value) {
  if (!value) return null
  let text = String(value).trim()
  if (!text) return null
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(text)) {
    text += 'Z'
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(text)) {
    text = text.replace(' ', 'T') + 'Z'
  }
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateTime(value) {
  const date = parseDate(value)
  if (!date) return ''
  const now = new Date()
  const datePrefix =
    date.getFullYear() === now.getFullYear()
      ? ''
      : date.getFullYear() + '-'
  return (
    datePrefix +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  )
}

function countdownText(expiresAt, now) {
  const date = parseDate(expiresAt)
  if (!date) return ''
  const remain = date.getTime() - (now || Date.now())
  if (remain <= 0) return '已超时'
  const total = Math.floor(remain / 1000)
  return pad(Math.floor(total / 60)) + ':' + pad(total % 60)
}

function isExpired(expiresAt, now) {
  const date = parseDate(expiresAt)
  return !!date && date.getTime() <= (now || Date.now())
}

const STATUS_META = {
  PENDING: { text: '待支付', tone: 'warn' },
  PAID: { text: '待提货', tone: 'ok' },
  COMPLETED: { text: '已完成', tone: 'muted' },
  CANCELLED: { text: '已取消', tone: 'muted' }
}

function statusMeta(status) {
  return STATUS_META[status] || { text: status || '未知状态', tone: 'muted' }
}

const CATEGORY_EMOJI = [
  { keys: ['水果', '鲜果'], emoji: '🍋' },
  { keys: ['零食', '休闲'], emoji: '🥨' },
  { keys: ['饮品', '饮料', '奶茶', '咖啡'], emoji: '🥤' },
  { keys: ['日用', '生活', '洗护'], emoji: '🧺' },
  { keys: ['早餐', '烘焙', '面包'], emoji: '🥐' },
  { keys: ['乳品', '牛奶', '酸奶'], emoji: '🥛' },
  { keys: ['速食', '泡面', '自热'], emoji: '🍜' },
  { keys: ['文具', '学习'], emoji: '✏️' },
  { keys: ['生鲜', '蔬菜'], emoji: '🥬' }
]

function categoryEmoji(name) {
  const text = String(name || '')
  const found = CATEGORY_EMOJI.find(item =>
    item.keys.some(key => text.indexOf(key) >= 0)
  )
  return found ? found.emoji : '🧺'
}

function shortId(id) {
  const text = String(id || '')
  return (text.split('-')[0] || text).slice(0, 8).toUpperCase()
}

function debounce(fn, wait) {
  let timer = null
  const wrapped = function () {
    const args = arguments
    if (timer) clearTimeout(timer)
    timer = setTimeout(function () {
      timer = null
      fn.apply(null, args)
    }, wait)
  }
  wrapped.cancel = function () {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return wrapped
}

function randomId(prefix) {
  return (
    (prefix || 'req') +
    '_' +
    Date.now() +
    '_' +
    Math.random().toString(36).slice(2, 10)
  )
}

module.exports = {
  money,
  pad,
  parseDate,
  dateTime,
  countdownText,
  isExpired,
  statusMeta,
  categoryEmoji,
  shortId,
  debounce,
  randomId
}
