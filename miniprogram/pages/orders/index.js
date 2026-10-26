const { get, post } = require('../../utils/api')
const {
  money,
  dateTime,
  countdownText,
  isExpired,
  statusMeta,
  shortId
} = require('../../utils/format')
const {
  isLoggedIn,
  redirectToLogin,
  currentUser,
  clearSession
} = require('../../utils/session')

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'PENDING', label: '待支付' },
  { key: 'PAID', label: '待提货' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'CANCELLED', label: '已取消' }
]

Page({
  data: {
    filters: FILTERS,
    status: '',
    orders: [],
    balance: '0.00',
    balanceLoaded: false,
    nickname: '',
    loading: true,
    loadingMore: false,
    error: false,
    hasMore: false,
    page: 1,
    busyId: '',
    skeletons: [1, 2]
  },

  onShow() {
    if (!isLoggedIn()) {
      redirectToLogin('/pages/orders/index')
      return
    }
    const user = currentUser()
    this.setData({ nickname: (user && user.nickname) || '同学' })
    this.load(true)
    this.startTimer()
  },

  onHide() {
    this.stopTimer()
  },

  onUnload() {
    this.stopTimer()
  },

  onPullDownRefresh() {
    if (!isLoggedIn()) {
      wx.stopPullDownRefresh()
      return
    }
    this.load(true).then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh()
    )
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) this.load(false)
  },

  startTimer() {
    this.stopTimer()
    this.timer = setInterval(() => this.tick(), 1000)
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  tick() {
    let changed = false
    const orders = this.data.orders.map(order => {
      if (order.status !== 'PENDING') return order
      const expired = isExpired(order.expiresAt)
      const countdown = expired
        ? '已超时'
        : countdownText(order.expiresAt, Date.now())
      if (expired === order.expired && countdown === order.countdown) return order
      changed = true
      return Object.assign({}, order, {
        expired: expired,
        canPay: !expired,
        countdown: countdown
      })
    })
    if (changed) this.setData({ orders: orders })
  },

  decorateOrder(order) {
    const meta = statusMeta(order.status)
    const expired =
      order.status === 'PENDING' ? isExpired(order.expiresAt) : false
    const lines = (order.items || []).map(line =>
      Object.assign({}, line, {
        lineTotal: money(Number(line.price) * line.quantity)
      })
    )
    return Object.assign({}, order, {
      statusText: meta.text,
      tone: meta.tone,
      amountText: money(order.amount),
      timeText: dateTime(order.createdAt),
      orderNo: shortId(order.id),
      items: lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      expired: expired,
      canPay: order.status === 'PENDING' && !expired,
      canCancel: order.status === 'PENDING',
      countdown:
        order.status === 'PENDING'
          ? expired
            ? '已超时'
            : countdownText(order.expiresAt, Date.now())
          : ''
    })
  },

  async load(reset) {
    if (!reset && (this.data.loading || this.data.loadingMore)) return
    const seq = (this.seq || 0) + 1
    this.seq = seq
    const page = reset ? 1 : this.data.page + 1

    this.setData({
      loading: !!reset,
      loadingMore: !reset,
      error: false
    })

    const query =
      'page=' +
      page +
      (this.data.status ? '&status=' + this.data.status : '')

    try {
      const results = await Promise.all([
        get('/api/orders?' + query),
        get('/api/users/wallet', { silent: true }).catch(() => null)
      ])
      if (seq !== this.seq) return
      const list = (results[0] || []).map(order => this.decorateOrder(order))
      const orders = reset ? list : this.data.orders.concat(list)
      const wallet = results[1]
      const update = {
        orders: orders,
        page: page,
        hasMore: list.length >= 20
      }
      if (wallet) {
        update.balance = money(wallet.balance)
        update.balanceLoaded = true
      }
      this.setData(update)
    } catch (error) {
      if (seq !== this.seq) return
      if (!this.data.orders.length) this.setData({ error: true })
    } finally {
      if (seq === this.seq) {
        this.setData({ loading: false, loadingMore: false })
      }
    }
  },

  selectFilter(event) {
    const key = event.currentTarget.dataset.key
    if (key === this.data.status) return
    this.setData({ status: key })
    this.load(true)
  },

  loadMore() {
    this.load(false)
  },

  retry() {
    this.load(true)
  },

  pay(event) {
    const id = event.currentTarget.dataset.id
    const order = this.data.orders.find(entry => entry.id === id)
    if (!order) return
    if (order.expired) {
      wx.showToast({ title: '订单已超时，请取消后重新下单', icon: 'none' })
      return
    }
    if (
      this.data.balanceLoaded &&
      Number(this.data.balance) < Number(order.amount)
    ) {
      wx.showToast({ title: '余额不足，请联系管理员充值', icon: 'none' })
      return
    }
    wx.showModal({
      title: '余额支付',
      content:
        '使用账户余额支付 ¥' +
        order.amountText +
        '？支付成功后会生成提货码。',
      confirmText: '确认支付',
      confirmColor: '#204c39',
      success: res => {
        if (res.confirm) this.doPay(order)
      }
    })
  },

  async doPay(order) {
    if (this.data.busyId) return
    this.setData({ busyId: order.id })
    try {
      await post('/api/orders/' + order.id + '/pay', null, { silent: false })
      wx.showToast({ title: '支付成功', icon: 'success' })
      await this.load(true)
    } catch (error) {
      if (error.statusCode === 409) this.load(true)
    } finally {
      this.setData({ busyId: '' })
    }
  },

  cancel(event) {
    const id = event.currentTarget.dataset.id
    const order = this.data.orders.find(entry => entry.id === id)
    if (!order) return
    wx.showModal({
      title: '取消订单',
      content: '取消后订单占用的库存会恢复，确定取消吗？',
      confirmText: '取消订单',
      confirmColor: '#b34a2d',
      success: async res => {
        if (!res.confirm) return
        if (this.data.busyId) return
        this.setData({ busyId: id })
        try {
          await post('/api/orders/' + id + '/cancel', null)
          wx.showToast({ title: '订单已取消', icon: 'none' })
          await this.load(true)
        } catch (error) {
          // 请求层已提示。
        } finally {
          this.setData({ busyId: '' })
        }
      }
    })
  },

  copyCode(event) {
    const code = event.currentTarget.dataset.code
    if (!code) return
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '提货码已复制', icon: 'none' })
    })
  },

  openCart() {
    wx.navigateTo({ url: '/pages/cart/index' })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/index' })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新登录才能查看订单，确定退出吗？',
      confirmText: '退出',
      confirmColor: '#b34a2d',
      success: async res => {
        if (!res.confirm) return
        try {
          await post('/api/auth/logout', null, { silent: true })
        } catch (error) {
          // 即使服务端退出失败，本地也清除会话。
        }
        clearSession()
        wx.reLaunch({ url: '/pages/home/index' })
      }
    })
  }
})
