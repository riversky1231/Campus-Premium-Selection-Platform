const { get, post, put, remove } = require('../../utils/api')
const {
  money,
  categoryEmoji,
  randomId
} = require('../../utils/format')
const {
  isLoggedIn,
  redirectToLogin
} = require('../../utils/session')

Page({
  data: {
    items: [],
    addresses: [],
    addressId: 0,
    total: '0.00',
    count: 0,
    balance: '0.00',
    balanceEnough: true,
    walletLoaded: false,
    walletHint: '余额信息加载失败，提交订单后由服务端校验',
    loading: true,
    error: false,
    updatingId: 0,
    busy: false,
    formOpen: false,
    editingId: null,
    formBusy: false,
    form: { recipient: '', phone: '', detail: '' },
    skeletons: [1, 2]
  },

  onShow() {
    if (!isLoggedIn()) {
      redirectToLogin('/pages/cart/index')
      return
    }
    this.load()
  },

  onPullDownRefresh() {
    if (!isLoggedIn()) {
      wx.stopPullDownRefresh()
      return
    }
    this.load().then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh()
    )
  },

  async load(preferredAddressId) {
    if (this.data.loading && this.firstLoaded) return
    this.firstLoaded = true
    this.setData({ loading: true, error: false })

    try {
      const results = await Promise.all([
        get('/api/cart'),
        get('/api/users/addresses'),
        get('/api/users/wallet', { silent: true }).catch(() => null),
        get('/api/categories', { silent: true }).catch(() => [])
      ])
      const rawItems = results[0] || []
      const addresses = results[1] || []
      const wallet = results[2]
      const categories = results[3] || []

      const emojiMap = {}
      categories.forEach(category => {
        emojiMap[category.id] = categoryEmoji(category.name)
      })

      const items = rawItems.map(raw => {
        const product = raw.product
        const price = Number(product.price)
        return {
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          price: price,
          priceText: money(price),
          stock: product.stock,
          quantity: raw.quantity,
          emoji: emojiMap[product.categoryId] || categoryEmoji(''),
          lineTotal: money(price * raw.quantity),
          maxQuantity: Math.max(1, Math.min(99, product.stock)),
          overStock: raw.quantity > product.stock,
          soldOut: product.stock <= 0
        }
      })

      let addressId = this.data.addressId
      if (preferredAddressId) addressId = preferredAddressId
      if (!addresses.some(address => address.id === addressId)) {
        addressId = addresses.length ? addresses[0].id : 0
      }

      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
      const count = items.reduce((sum, item) => sum + item.quantity, 0)
      const balance = wallet
        ? Number(wallet.balance || 0)
        : Number(this.data.balance || 0)

      this.setData({
        items: items,
        addresses: addresses,
        addressId: addressId,
        total: money(total),
        count: count,
        balance: wallet ? money(balance) : this.data.balance,
        balanceEnough: wallet ? balance >= total : this.data.balanceEnough,
        walletLoaded: !!wallet,
        walletHint: wallet
          ? balance >= total
            ? '余额充足，提交后可直接支付'
            : '余额不足，可先提交订单再联系管理员充值'
          : '余额信息加载失败，提交订单后由服务端校验',
        loading: false
      })
    } catch (error) {
      this.setData({
        loading: false,
        error: !this.data.items.length
      })
    }
  },

  recalc(items) {
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const enough = this.data.walletLoaded
      ? Number(this.data.balance) >= total
      : this.data.balanceEnough
    this.setData({
      items: items,
      total: money(total),
      count: count,
      balanceEnough: enough,
      walletHint: this.data.walletLoaded
        ? enough
          ? '余额充足，提交后可直接支付'
          : '余额不足，可先提交订单再联系管理员充值'
        : this.data.walletHint
    })
  },

  async changeQuantity(event) {
    const id = Number(event.currentTarget.dataset.id)
    const delta = Number(event.currentTarget.dataset.delta)
    if (this.data.updatingId) return
    const item = this.data.items.find(entry => entry.id === id)
    if (!item) return

    const next = item.quantity + delta
    if (next < 1) return
    if (next > item.maxQuantity) {
      const message =
        item.maxQuantity >= 99 && item.stock > 99
          ? '单件最多购买 99 件'
          : '库存仅剩 ' + item.stock + ' 件'
      wx.showToast({ title: message, icon: 'none' })
      return
    }

    this.setData({ updatingId: id })
    try {
      await put('/api/cart/' + id, { quantity: next })
      this.requestId = null
      const items = this.data.items.map(entry => {
        if (entry.id !== id) return entry
        return Object.assign({}, entry, {
          quantity: next,
          lineTotal: money(entry.price * next),
          overStock: next > entry.stock
        })
      })
      this.recalc(items)
    } catch (error) {
      // 请求层已提示。
    } finally {
      this.setData({ updatingId: 0 })
    }
  },

  removeItem(event) {
    const id = Number(event.currentTarget.dataset.id)
    const item = this.data.items.find(entry => entry.id === id)
    if (!item) return
    wx.showModal({
      title: '移出购物车',
      content: '确定不再购买「' + item.name + '」吗？',
      confirmText: '移出',
      confirmColor: '#b34a2d',
      success: async res => {
        if (!res.confirm) return
        try {
          await put('/api/cart/' + id, { quantity: 0 })
          this.requestId = null
          this.recalc(this.data.items.filter(entry => entry.id !== id))
        } catch (error) {
          // 请求层已提示。
        }
      }
    })
  },

  pickAddress(event) {
    this.setData({ addressId: Number(event.currentTarget.dataset.id) })
    this.requestId = null
  },

  openAddressForm() {
    this.setData({
      formOpen: true,
      editingId: null,
      form: { recipient: '', phone: '', detail: '' }
    })
  },

  editAddress(event) {
    const id = Number(event.currentTarget.dataset.id)
    const address = this.data.addresses.find(entry => entry.id === id)
    if (!address) return
    this.setData({
      formOpen: true,
      editingId: id,
      form: {
        recipient: address.recipient,
        phone: address.phone,
        detail: address.detail
      }
    })
  },

  closeAddressForm() {
    this.setData({
      formOpen: false,
      editingId: null,
      form: { recipient: '', phone: '', detail: '' }
    })
  },

  field(event) {
    const key = event.currentTarget.dataset.field
    this.setData({ ['form.' + key]: event.detail.value })
  },

  async saveAddress() {
    if (this.data.formBusy) return
    const form = this.data.form
    const recipient = (form.recipient || '').trim()
    const phone = (form.phone || '').trim()
    const detail = (form.detail || '').trim()

    if (!recipient) {
      wx.showToast({ title: '请填写自提人', icon: 'none' })
      return
    }
    if (!/^[0-9+ -]{6,20}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }
    if (!detail) {
      wx.showToast({ title: '请填写自提点', icon: 'none' })
      return
    }

    this.setData({ formBusy: true })
    try {
      const payload = { recipient: recipient, phone: phone, detail: detail }
      let saved
      if (this.data.editingId) {
        saved = await put(
          '/api/users/addresses/' + this.data.editingId,
          payload
        )
      } else {
        saved = await post('/api/users/addresses', payload)
      }
      this.requestId = null
      this.closeAddressForm()
      await this.load(saved && saved.id ? saved.id : this.data.addressId)
      wx.showToast({ title: '地址已保存', icon: 'none' })
    } catch (error) {
      // 请求层已提示。
    } finally {
      this.setData({ formBusy: false })
    }
  },

  deleteAddress(event) {
    const id = Number(event.currentTarget.dataset.id)
    const address = this.data.addresses.find(entry => entry.id === id)
    if (!address) return
    wx.showModal({
      title: '删除地址',
      content: '删除「' + address.recipient + ' · ' + address.detail + '」？',
      confirmText: '删除',
      confirmColor: '#b34a2d',
      success: async res => {
        if (!res.confirm) return
        try {
          await remove('/api/users/addresses/' + id)
          this.requestId = null
          const addresses = await get('/api/users/addresses', {
            silent: true
          })
          let addressId = this.data.addressId
          if (!addresses.some(entry => entry.id === addressId)) {
            addressId = addresses.length ? addresses[0].id : 0
          }
          this.setData({ addresses: addresses, addressId: addressId })
        } catch (error) {
          // 请求层已提示。
        }
      }
    })
  },

  openProduct(event) {
    wx.navigateTo({
      url: '/pages/detail/index?id=' + event.currentTarget.dataset.id
    })
  },

  openOrders() {
    wx.navigateTo({ url: '/pages/orders/index' })
  },

  goShopping() {
    wx.reLaunch({ url: '/pages/home/index' })
  },

  retry() {
    this.load()
  },

  checkout() {
    if (this.data.busy) return
    if (this.data.updatingId) {
      wx.showToast({ title: '正在更新数量，请稍候', icon: 'none' })
      return
    }
    if (!this.data.items.length) {
      wx.showToast({ title: '购物车是空的', icon: 'none' })
      return
    }
    if (!this.data.addressId) {
      wx.showToast({ title: '请先选择自提地址', icon: 'none' })
      return
    }
    if (this.data.items.some(item => item.soldOut || item.overStock)) {
      wx.showToast({ title: '部分商品库存不足，请调整数量', icon: 'none' })
      return
    }

    const address = this.data.addresses.find(
      entry => entry.id === this.data.addressId
    )
    if (!address) {
      wx.showToast({ title: '请先选择自提地址', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认下单',
      content:
        '共 ' +
        this.data.count +
        ' 件，合计 ¥' +
        this.data.total +
        '\n自提人：' +
        address.recipient +
        '\n自提点：' +
        address.detail,
      confirmText: '提交订单',
      confirmColor: '#204c39',
      success: res => {
        if (res.confirm) this.submitOrder()
      }
    })
  },

  async submitOrder() {
    if (this.data.busy) return
    this.requestId = this.requestId || randomId('order')
    this.setData({ busy: true })
    try {
      await post('/api/orders', {
        requestId: this.requestId,
        addressId: this.data.addressId,
        items: this.data.items.map(item => ({
          productId: item.id,
          quantity: item.quantity
        }))
      })
      this.requestId = null
      remove('/api/cart', { silent: true }).catch(() => {})
      wx.showToast({ title: '下单成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/orders/index' })
      }, 500)
    } catch (error) {
      // 保留 requestId，网络恢复后重试不会重复下单。
    } finally {
      this.setData({ busy: false })
    }
  }
})
