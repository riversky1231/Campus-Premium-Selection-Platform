const { BASE_URL } = require('./config')
const {
  isLoggedIn,
  clearSession,
  clearAdminSession,
  loginPath
} = require('./session')

const STATUS_MESSAGE = {
  400: '提交的信息不完整',
  401: '登录已过期，请重新登录',
  403: '没有访问权限',
  404: '内容不存在或已下架',
  409: '操作冲突，请刷新后重试',
  429: '操作太频繁，请稍后再试',
  500: '服务开小差了，请稍后再试',
  503: '服务暂时不可用'
}

let redirecting = false

function currentRoute() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return page && page.route ? '/' + page.route : '/pages/home/index'
}

function redirectToLogin() {
  if (redirecting) return
  const route = currentRoute()
  if (route.indexOf('/pages/login/index') === 0) return
  redirecting = true
  wx.navigateTo({
    url: loginPath(route),
    complete: function () {
      setTimeout(function () {
        redirecting = false
      }, 1200)
    }
  })
}

function notify(message) {
  wx.showToast({ title: message, icon: 'none', duration: 2200 })
}

/**
 * 统一请求封装。
 * @param {string} path 以 / 开头的接口路径
 * @param {object} options method/data/admin/silent/timeout
 */
function request(path, options) {
  const opts = options || {}
  const method = opts.method || 'GET'
  const admin = !!opts.admin
  const silent = !!opts.silent
  const isAuthPath =
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/auth/wx-login'
  const token = isAuthPath
    ? ''
    : wx.getStorageSync(admin ? 'adminToken' : 'userToken')

  return new Promise(function (resolve, reject) {
    wx.request({
      url: BASE_URL + path,
      method: method,
      data: opts.data === null ? undefined : opts.data,
      timeout: opts.timeout || 15000,
      header: Object.assign(
        { 'Content-Type': 'application/json' },
        token ? { Authorization: 'Bearer ' + token } : {}
      ),
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }

        const payload = res.data || {}
        let message =
          payload.message || payload.error || STATUS_MESSAGE[res.statusCode]
        if (res.statusCode === 401 && token) message = '登录已过期，请重新登录'
        if (!message) message = '请求失败（' + res.statusCode + '）'

        const error = new Error(message)
        error.statusCode = res.statusCode
        error.data = res.data

        if (res.statusCode === 401 && !isAuthPath) {
          if (admin) {
            clearAdminSession()
          } else if (isLoggedIn()) {
            clearSession()
            if (!silent) redirectToLogin()
          }
        }

        if (!silent) notify(message)
        reject(error)
      },
      fail: function (err) {
        const text = (err && err.errMsg) || ''
        const message =
          text.indexOf('timeout') >= 0
            ? '请求超时，请稍后重试'
            : '网络连接失败，请检查后端地址'
        const error = new Error(message)
        error.cause = err
        if (!silent) notify(message)
        reject(error)
      }
    })
  })
}

function get(path, options) {
  return request(path, Object.assign({}, options, { method: 'GET' }))
}

function post(path, data, options) {
  return request(
    path,
    Object.assign({}, options, { method: 'POST', data: data })
  )
}

function put(path, data, options) {
  return request(path, Object.assign({}, options, { method: 'PUT', data: data }))
}

function remove(path, options) {
  return request(path, Object.assign({}, options, { method: 'DELETE' }))
}

module.exports = {
  BASE_URL,
  request,
  get,
  post,
  put,
  remove
}
