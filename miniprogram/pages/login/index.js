const { post } = require('../../utils/api')
const {
  saveSession,
  isLoggedIn,
  currentUser
} = require('../../utils/session')

Page({
  data: {
    mode: 'login',
    username: '',
    password: '',
    nickname: '',
    showPassword: false,
    busy: false,
    redirect: '',
    existingUser: ''
  },

  onLoad(options) {
    const raw = options && options.redirect
    let redirect = ''
    if (raw) {
      try {
        redirect = decodeURIComponent(raw)
      } catch (error) {
        redirect = raw
      }
    }
    this.setData({ redirect: redirect })
    if (isLoggedIn()) {
      const user = currentUser()
      if (user) this.setData({ existingUser: user.nickname || user.username })
    }
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode
    if (mode === this.data.mode) return
    this.setData({ mode: mode })
  },

  field(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value })
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  validate() {
    const data = this.data
    const username = (data.username || '').trim()
    const password = data.password || ''
    const nickname = (data.nickname || '').trim()

    if (!username) return '请输入账号'
    if (!password) return '请输入密码'

    if (data.mode === 'register') {
      if (!/^[A-Za-z0-9_]{4,32}$/.test(username)) {
        return '账号需为 4-32 位字母、数字或下划线'
      }
      if (password.length < 8 || password.length > 64) {
        return '密码长度需为 8-64 位'
      }
      if (!nickname) return '请输入昵称'
      if (nickname.length > 60) return '昵称最多 60 个字符'
    }
    return ''
  },

  async submit() {
    if (this.data.busy) return
    const message = this.validate()
    if (message) {
      wx.showToast({ title: message, icon: 'none' })
      return
    }

    const data = this.data
    const register = data.mode === 'register'
    const payload = register
      ? {
          username: data.username.trim(),
          password: data.password,
          nickname: data.nickname.trim()
        }
      : {
          username: data.username.trim(),
          password: data.password
        }

    this.setData({ busy: true })
    try {
      const credentials = await post(
        register ? '/api/auth/register' : '/api/auth/login',
        payload
      )
      saveSession(credentials)
      wx.showToast({
        title: register ? '注册成功' : '登录成功',
        icon: 'success'
      })
      setTimeout(() => this.finish(), 450)
    } catch (error) {
      // 请求层已提示具体原因。
    } finally {
      this.setData({ busy: false })
    }
  },

  finish() {
    const pages = getCurrentPages()
    if (this.data.redirect) {
      const target = this.data.redirect.split('?')[0]
      // 登录页可能是在目标页之上打开的：直接返回，避免压入重复页面。
      for (let i = pages.length - 2; i >= 0; i--) {
        if ('/' + pages[i].route === target) {
          wx.navigateBack({ delta: pages.length - 1 - i })
          return
        }
      }
      wx.redirectTo({
        url: this.data.redirect,
        fail: () => wx.reLaunch({ url: '/pages/home/index' })
      })
      return
    }
    if (pages.length > 1) {
      wx.navigateBack({
        fail: () => wx.reLaunch({ url: '/pages/home/index' })
      })
    } else {
      wx.reLaunch({ url: '/pages/home/index' })
    }
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/index' })
  }
})
