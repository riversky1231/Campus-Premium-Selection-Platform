const { get, post, put } = require('../../utils/api')
const { adminToken } = require('../../utils/session')

Page({
  data: {
    id: null,
    isEdit: false,
    categories: [],
    index: 0,
    categoryLabel: '请选择分类',
    name: '',
    description: '',
    descriptionLength: 0,
    price: '',
    stock: 0,
    onSale: true,
    loading: true,
    categoriesError: false,
    busy: false
  },

  onLoad() {
    if (!adminToken()) {
      wx.redirectTo({ url: '/pages/admin/index' })
      return
    }
    const channel = this.getOpenerEventChannel()
    if (channel && channel.on) {
      channel.on('product', product => {
        this.product = product
        this.applyProduct(product)
      })
    }
    this.loadCategories()
  },

  async loadCategories() {
    this.setData({ loading: true, categoriesError: false })
    try {
      const categories = await get('/api/categories', { silent: true })
      const list = categories || []
      let index = 0
      if (this.product && list.length) {
        const found = list.findIndex(item => item.id === this.product.categoryId)
        index = found >= 0 ? found : 0
      }
      this.setData({
        categories: list,
        index: index,
        categoryLabel: list[index] ? list[index].name : '请选择分类',
        loading: false
      })
      if (this.product) this.applyProduct(this.product)
    } catch (error) {
      this.setData({ loading: false, categoriesError: true })
    }
  },

  retryCategories() {
    this.loadCategories()
  },

  applyProduct(product) {
    if (!product) return
    const categories = this.data.categories
    let index = 0
    if (categories.length) {
      const found = categories.findIndex(item => item.id === product.categoryId)
      index = found >= 0 ? found : 0
    }
    const description = product.description || ''
    this.setData({
      id: product.id,
      isEdit: true,
      name: product.name || '',
      description: description,
      descriptionLength: description.length,
      price: product.price === undefined ? '' : String(product.price),
      stock: product.stock || 0,
      onSale: product.onSale !== false,
      index: index,
      categoryLabel: categories[index] ? categories[index].name : '请选择分类'
    })
  },

  field(event) {
    const key = event.currentTarget.dataset.field
    const value = event.detail.value
    const update = { [key]: value }
    if (key === 'description') update.descriptionLength = value.length
    this.setData(update)
  },

  category(event) {
    const index = Number(event.detail.value)
    const selected = this.data.categories[index]
    this.setData({
      index: index,
      categoryLabel: selected ? selected.name : '请选择分类'
    })
  },

  sale(event) {
    this.setData({ onSale: event.detail.value })
  },

  validate() {
    const data = this.data
    const name = (data.name || '').trim()
    if (!name) return '请输入商品名称'
    if (name.length > 100) return '商品名称最多 100 个字符'
    if (!data.categories.length || !data.categories[data.index]) {
      return '请先选择商品分类'
    }
    const priceText = String(data.price || '').trim()
    if (!priceText) return '请输入价格'
    if (!/^\d+(\.\d{1,2})?$/.test(priceText)) {
      return '价格最多两位小数'
    }
    const price = Number(priceText)
    if (!(price >= 0.01 && price <= 99999999.99)) {
      return '价格需在 0.01-99999999.99 之间'
    }
    if (!data.isEdit) {
      const stock = Number(data.stock)
      if (!Number.isInteger(stock) || stock < 0) {
        return '初始库存需为非负整数'
      }
    }
    if ((data.description || '').length > 1000) {
      return '商品说明最多 1000 个字符'
    }
    return ''
  },

  async save() {
    if (this.data.busy || this.data.loading) return
    const message = this.validate()
    if (message) {
      wx.showToast({ title: message, icon: 'none' })
      return
    }

    const data = this.data
    const selected = data.categories[data.index]
    const payload = {
      categoryId: selected.id,
      name: data.name.trim(),
      description: data.description || '',
      price: Number(data.price),
      onSale: data.onSale
    }
    if (!data.isEdit) payload.stock = Number(data.stock)

    this.setData({ busy: true })
    try {
      await (data.id
        ? put('/api/admin/products/' + data.id, payload, { admin: true })
        : post('/api/admin/products', payload, { admin: true }))
      wx.showToast({
        title: data.isEdit ? '商品已更新' : '商品已创建',
        icon: 'success'
      })
      setTimeout(() => this.back(), 500)
    } catch (error) {
      // 请求层已提示。
    } finally {
      this.setData({ busy: false })
    }
  },

  back() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/admin/index' })
    })
  },

  goAdmin() {
    wx.reLaunch({ url: '/pages/admin/index' })
  }
})
