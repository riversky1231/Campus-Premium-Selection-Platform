const USER_TOKEN_KEY = 'userToken'
const ADMIN_TOKEN_KEY = 'adminToken'
const USER_KEY = 'user'

function isLoggedIn() {
  return !!wx.getStorageSync(USER_TOKEN_KEY)
}

function currentUser() {
  return wx.getStorageSync(USER_KEY) || null
}

function saveSession(credentials) {
  if (!credentials || !credentials.token) return
  wx.setStorageSync(USER_TOKEN_KEY, credentials.token)
  if (credentials.user) {
    wx.setStorageSync(USER_KEY, credentials.user)
    const app = getApp()
    if (app && app.globalData) app.globalData.user = credentials.user
  }
}

function clearSession() {
  wx.removeStorageSync(USER_TOKEN_KEY)
  wx.removeStorageSync(USER_KEY)
  const app = getApp()
  if (app && app.globalData) app.globalData.user = null
}

function adminToken() {
  return wx.getStorageSync(ADMIN_TOKEN_KEY) || ''
}

function saveAdminSession(token, user) {
  wx.setStorageSync(ADMIN_TOKEN_KEY, token)
  if (user) wx.setStorageSync('adminUser', user)
}

function currentAdmin() {
  return wx.getStorageSync('adminUser') || null
}

function clearAdminSession() {
  wx.removeStorageSync(ADMIN_TOKEN_KEY)
  wx.removeStorageSync('adminUser')
}

function loginPath(redirect) {
  return (
    '/pages/login/index' +
    (redirect ? '?redirect=' + encodeURIComponent(redirect) : '')
  )
}

/** 已登录返回 true；未登录时跳转登录页并返回 false。 */
function requireLogin(redirect) {
  if (isLoggedIn()) return true
  wx.navigateTo({ url: loginPath(redirect) })
  return false
}

/** 用登录页替换当前页，适合购物车/订单这类必须登录的页面。 */
function redirectToLogin(redirect) {
  wx.redirectTo({ url: loginPath(redirect) })
}

module.exports = {
  isLoggedIn,
  currentUser,
  saveSession,
  clearSession,
  adminToken,
  saveAdminSession,
  currentAdmin,
  clearAdminSession,
  loginPath,
  requireLogin,
  redirectToLogin
}
