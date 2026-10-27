const { get, put } = require('../../utils/api')
const {
  money,
  categoryEmoji,
  debounce
} = require('../../utils/format')
const { isLoggedIn, requireLogin } = require('../../utils/session')

const PAGE_SIZE = 12

Page({
  data: {
    categories: [],
    items: [],
    skeletons: [1, 2, 3, 4],
    categoryId: '',
    keyword: '',
    page: 1,
    total: 0,
    loading: false,
    loadingMore: false,
    error: false,
    hasMore: false,
    loggedIn: false,
    cartCount: 0
  },

  onLoad() {
    this.searchDebounced = debounce(() => {
      this.load(true)
    }, 380)
    this.loadCategories()
    this.load(true)
  },

  onShow() {
    const loggedIn = isLoggedIn()
    this.setData({ loggedIn })
    if (loggedIn && this.pendingAddId) {
      const id = this.pendingAddId
      this.pendingAddId = null
      this.addToCart(id)
    } else if (loggedIn) {
      this.loadCartCount()
    } else {
      this.pendingAddId = null
      this.setData({ cartCount: 0 })
    }
  },

  onPullDownRefresh() {
    Promise.all([this.loadCategories(), this.load(true)]).then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh()
    )
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) this.load(false)
  },

  onUnload() {
    if (this.searchDebounced) this.searchDebounced.cancel()
  },

  decorateProduct(item) {
    const category = this.categoryMap ? this.categoryMap[item.categoryId] : null
    return Object.assign({}, item, {
      priceText: money(item.price),
      emoji: category ? category.emoji : categoryEmoji(''),
      categoryName: category ? category.name : '',
      lowStock: item.stock > 0 && item.stock < 10,
      soldOut: item.stock <= 0
    })
  },

  async loadCategories() {
    try {
      const categories = await get('/api/categories', { silent: true })
      const map = {}
      const decorated = (categories || []).map(item => {
        const view = Object.assign({}, item, { emoji: categoryEmoji(item.name) })
        map[view.id] = view
        return view
      })
      this.categoryMap = map
      this.setData({
        categories: decorated,
        items: this.data.items.map(item => this.decorateProduct(item))
      })
    } catch (error) {
      // 分类加载失败不阻塞商品列表，保留原有分类。
    }
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

    const query = [
      'page=' + page,
      'size=' + PAGE_SIZE,
      'keyword=' + encodeURIComponent(this.data.keyword || '')
    ]
    if (this.data.categoryId !== '' && this.data.categoryId !== null) {
      query.push('categoryId=' + this.data.categoryId)
    }

    try {
      const result = await get('/api/products?' + query.join('&'))
      if (seq !== this.seq) return
      const list = (result.items || []).map(item => this.decorateProduct(item))
      const items = reset ? list : this.data.items.concat(list)
      this.setData({
        items: items,
        page: page,
        total: result.total || 0,
        hasMore: items.length < (result.total || 0)
      })
    } catch (error) {
      if (seq !== this.seq) return
      if (!this.data.items.length) this.setData({ error: true })
    } finally {
      if (seq === this.seq) {
        this.setData({ loading: false, loadingMore: false })
      }
    }
  },

  async loadCartCount() {
    try {
      const items = await get('/api/cart', { silent: true })
      const count = (items || []).reduce((sum, item) => sum + item.quantity, 0)
      this.setData({ cartCount: count })
    } catch (error) {
      this.setData({ cartCount: 0 })
    }
  },

  onKeyword(event) {
    this.setData({ keyword: event.detail.value })
    if (this.searchDebounced) this.searchDebounced()
  },

  onSearch(event) {
    if (this.searchDebounced) this.searchDebounced.cancel()
    const value =
      event.detail && typeof event.detail.value === 'string'
        ? event.detail.value
        : this.data.keyword
    this.setData({ keyword: value })
    this.load(true)
  },

  clearKeyword() {
    if (this.searchDebounced) this.searchDebounced.cancel()
    this.setData({ keyword: '' })
    this.load(true)
  },

  selectCategory(event) {
    const id = event.currentTarget.dataset.id
    if (String(id) === String(this.data.categoryId)) return
    this.setData({ categoryId: id })
    this.load(true)
  },

  loadMore() {
    this.load(false)
  },

  retry() {
    this.loadCategories()
    this.load(true)
  },

  openDetail(event) {
    wx.navigateTo({
      url: '/pages/detail/index?id=' + event.currentTarget.dataset.id
    })
  },

  quickAdd(event) {
    const id = Number(event.currentTarget.dataset.id)
    const product = this.data.items.find(item => item.id === id)
    if (!product) return
    if (product.stock <= 0) {
      wx.showToast({ title: '这件好物正在补货', icon: 'none' })
      return
    }
    if (!isLoggedIn()) {
      // 登录成功后回到首页自动完成这次加购。
      this.pendingAddId = id
      requireLogin('/pages/home/index')
      return
    }
    this.addToCart(id)
  },

  async addToCart(id) {
    if (this.adding) return
    const product = this.data.items.find(item => item.id === id)
    if (!product) return
    this.adding = true
    try {
      const cart = await get('/api/cart', { silent: true })
      const existing = (cart || []).find(item => item.product.id === id)
      const limit = Math.min(99, product.stock)
      const quantity = (existing ? existing.quantity : 0) + 1
      if (quantity > limit) {
        wx.showToast({ title: '已达到可购买上限', icon: 'none' })
        return
      }
      await put('/api/cart/' + id, { quantity: quantity })
      this.setData({ cartCount: this.data.cartCount + 1 })
      wx.showToast({ title: '已加入购物车', icon: 'none' })
    } catch (error) {
      // 请求层已提示错误。
    } finally {
      this.adding = false
    }
  },

  openCart() {
    if (!requireLogin('/pages/cart/index')) return
    wx.navigateTo({ url: '/pages/cart/index' })
  },

  openOrders() {
    if (!requireLogin('/pages/orders/index')) return
    wx.navigateTo({ url: '/pages/orders/index' })
  },

  openAdmin() {
    wx.navigateTo({ url: '/pages/admin/index' })
  }
})
