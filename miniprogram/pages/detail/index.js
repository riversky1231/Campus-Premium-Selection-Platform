const { get, put } = require('../../utils/api')
const { money, categoryEmoji } = require('../../utils/format')
const { isLoggedIn, loginPath, requireLogin } = require('../../utils/session')

Page({
  data: {
    loading: true,
    error: false,
    product: null,
    quantity: 1,
    maxQuantity: 1,
    adding: false
  },

  onLoad(options) {
    this.productId = options.id
    this.load()
  },

  onShow() {
    if (!this.pendingAdd) return
    if (isLoggedIn()) {
      this.pendingAdd = false
      this.add()
    } else {
      this.pendingAdd = false
    }
  },

  async load() {
    if (!this.productId) {
      this.setData({ loading: false, error: true })
      return
    }
    this.setData({ loading: true, error: false })
    try {
      const results = await Promise.all([
        get('/api/products/' + this.productId),
        get('/api/categories', { silent: true }).catch(() => [])
      ])
      const product = results[0]
      const categories = results[1] || []
      const category = categories.find(item => item.id === product.categoryId)
      const maxQuantity = Math.max(1, Math.min(99, product.stock))

      this.setData({
        product: Object.assign({}, product, {
          priceText: money(product.price),
          emoji: category ? categoryEmoji(category.name) : categoryEmoji(''),
          categoryName: category ? category.name : '校园好物'
        }),
        quantity: 1,
        maxQuantity: maxQuantity,
        loading: false
      })
    } catch (error) {
      this.setData({ loading: false, error: true })
    }
  },

  step(event) {
    const product = this.data.product
    if (!product || product.stock <= 0) return
    const delta = Number(event.currentTarget.dataset.delta)
    const next = Math.max(
      1,
      Math.min(this.data.maxQuantity, this.data.quantity + delta)
    )
    if (next === this.data.quantity) return
    this.setData({ quantity: next })
  },

  async add() {
    const product = this.data.product
    if (!product) return
    if (product.stock <= 0) {
      wx.showToast({ title: '这件好物正在补货', icon: 'none' })
      return
    }
    if (!isLoggedIn()) {
      this.pendingAdd = true
      wx.navigateTo({
        url: loginPath('/pages/detail/index?id=' + this.productId)
      })
      return
    }
    if (this.data.adding) return

    this.setData({ adding: true })
    try {
      const cart = await get('/api/cart', { silent: true })
      const existing = (cart || []).find(item => item.product.id === product.id)
      const limit = Math.min(99, product.stock)
      const quantity = (existing ? existing.quantity : 0) + this.data.quantity
      if (quantity > limit) {
        wx.showToast({
          title: existing ? '购物车数量已达上限' : '库存不足',
          icon: 'none'
        })
        return
      }
      await put('/api/cart/' + product.id, { quantity: quantity })
      wx.showToast({ title: '已加入购物车', icon: 'none' })
    } catch (error) {
      // 请求层已提示。
    } finally {
      this.setData({ adding: false })
    }
  },

  openCart() {
    if (!requireLogin('/pages/cart/index')) return
    wx.navigateTo({ url: '/pages/cart/index' })
  },

  retry() {
    this.load()
  },

  backHome() {
    wx.reLaunch({ url: '/pages/home/index' })
  }
})
