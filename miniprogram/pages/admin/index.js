const { get, post, put, remove } = require('../../utils/api')
const {
  money,
  categoryEmoji,
  randomId,
  dateTime,
  statusMeta,
  shortId
} = require('../../utils/format')
const {
  adminToken,
  saveAdminSession,
  currentAdmin,
  clearAdminSession
} = require('../../utils/session')

const TABS = [
  { key: 'products', label: '商品', icon: '🧺' },
  { key: 'categories', label: '分类', icon: '🏷️' },
  { key: 'redeem', label: '核销', icon: '✅' },
  { key: 'users', label: '用户', icon: '👥' }
]

const EMPTY_MODAL = {
  open: false,
  type: '',
  title: '',
  hint: '',
  label: '',
  placeholder: '',
  inputType: 'text',
  value: '',
  busy: false,
  product: null,
  user: null,
  categoryId: 0,
  requestId: ''
}

Page({
  data: {
    stage: 'login',
    username: '',
    password: '',
    showPassword: false,
    loginBusy: false,
    adminName: '',
    adminId: 0,

    tabs: TABS,
    tab: 'products',

    products: [],
    productKeyword: '',
    productPage: 1,
    productTotal: 0,
    productHasMore: false,
    productLoading: false,
    productLoadingMore: false,
    productError: false,
    productBusyId: 0,
    skeletons: [1, 2, 3],

    categories: [],
    categoryName: '',
    categoryBusy: false,

    redeemCode: '',
    redeemBusy: false,
    redeemResult: null,
    paidOrders: [],
    paidLoading: false,
    paidError: false,

    users: [],
    usersPage: 1,
    usersHasMore: false,
    usersLoading: false,
    usersError: false,
    usersBusyId: 0,

    modal: Object.assign({}, EMPTY_MODAL)
  },

  onShow() {
    const token = adminToken()
    if (!token) {
      this.setData({ stage: 'login' })
      return
    }
    const admin = currentAdmin() || {}
    this.setData({
      stage: 'console',
      adminName: admin.nickname || admin.username || '管理员',
      adminId: admin.id || 0
    })
    this.refreshTab(this.data.tab)
  },

  onPullDownRefresh() {
    if (this.data.stage !== 'console') {
      wx.stopPullDownRefresh()
      return
    }
    Promise.resolve(this.refreshTab(this.data.tab)).then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh()
    )
  },

  onUnload() {
    if (this.productDebounced) {
      clearTimeout(this.productDebounced)
      this.productDebounced = null
    }
  },

  /* ---------- 登录 ---------- */

  field(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value })
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  async submitLogin() {
    if (this.data.loginBusy) return
    const username = (this.data.username || '').trim()
    const password = this.data.password || ''
    if (!username || !password) {
      wx.showToast({ title: '请输入管理员账号和密码', icon: 'none' })
      return
    }

    this.setData({ loginBusy: true })
    try {
      const credentials = await post('/api/auth/login', {
        username: username,
        password: password
      })
      if (!credentials.user || credentials.user.role !== 'ADMIN') {
        wx.showToast({ title: '该账号没有管理员权限', icon: 'none' })
        return
      }
      saveAdminSession(credentials.token, credentials.user)
      this.setData({
        stage: 'console',
        adminName: credentials.user.nickname || credentials.user.username,
        adminId: credentials.user.id,
        password: '',
        tab: 'products',
        products: [],
        productKeyword: '',
        productPage: 1,
        productTotal: 0,
        productHasMore: false,
        productError: false
      })
      wx.showToast({ title: '已进入管理台', icon: 'success' })
      this.refreshTab('products')
    } catch (error) {
      // 请求层已提示。
    } finally {
      this.setData({ loginBusy: false })
    }
  },

  logout() {
    wx.showModal({
      title: '退出管理台',
      content: '退出后需要重新输入管理员账号，确定退出吗？',
      confirmText: '退出',
      confirmColor: '#b34a2d',
      success: async res => {
        if (!res.confirm) return
        try {
          await post('/api/auth/logout', null, { admin: true, silent: true })
        } catch (error) {
          // 即使服务端退出失败，本地也清除管理员会话。
        }
        this.handleAuthLost()
      }
    })
  },

  handleAuthLost() {
    clearAdminSession()
    this.setData({
      stage: 'login',
      adminName: '',
      adminId: 0,
      password: '',
      products: [],
      categories: [],
      paidOrders: [],
      redeemResult: null,
      users: [],
      modal: Object.assign({}, EMPTY_MODAL)
    })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/index' })
  },

  /* ---------- Tab ---------- */

  switchTab(event) {
    const tab = event.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab) return
    this.setData({ tab: tab })
    this.refreshTab(tab)
  },

  refreshTab(tab) {
    if (tab === 'products') return this.loadProducts(true)
    if (tab === 'categories') return this.loadCategories()
    if (tab === 'redeem') return this.loadPaidOrders()
    if (tab === 'users') return this.loadUsers(true)
    return Promise.resolve()
  },

  /* ---------- 商品 ---------- */

  decorateProduct(product) {
    const category = this.categoryMap ? this.categoryMap[product.categoryId] : null
    return Object.assign({}, product, {
      priceText: money(product.price),
      emoji: category ? category.emoji : categoryEmoji(''),
      categoryName: category ? category.name : '未分类',
      onSale: !!product.onSale
    })
  },

  async loadCategories() {
    try {
      const categories = await get('/api/categories', { silent: true })
      const map = {}
      const list = (categories || []).map(category => {
        const view = Object.assign({}, category, {
          emoji: categoryEmoji(category.name)
        })
        map[view.id] = view
        return view
      })
      this.categoryMap = map
      this.setData({
        categories: list,
        products: this.data.products.map(product => this.decorateProduct(product))
      })
      return list
    } catch (error) {
      return this.data.categories
    }
  },

  onProductKeyword(event) {
    this.setData({ productKeyword: event.detail.value })
    if (!this.productDebounced) {
      this.productDebounced = setTimeout(() => {
        this.productDebounced = null
        this.loadProducts(true)
      }, 380)
    } else {
      clearTimeout(this.productDebounced)
      this.productDebounced = setTimeout(() => {
        this.productDebounced = null
        this.loadProducts(true)
      }, 380)
    }
  },

  searchProducts() {
    if (this.productDebounced) {
      clearTimeout(this.productDebounced)
      this.productDebounced = null
    }
    this.loadProducts(true)
  },

  clearProductSearch() {
    if (this.productDebounced) {
      clearTimeout(this.productDebounced)
      this.productDebounced = null
    }
    this.setData({ productKeyword: '' })
    this.loadProducts(true)
  },

  async loadProducts(reset) {
    if (!reset && (this.data.productLoading || this.data.productLoadingMore)) {
      return
    }
    if (!this.data.categories.length) await this.loadCategories()

    const seq = (this.productSeq || 0) + 1
    this.productSeq = seq
    const page = reset ? 1 : this.data.productPage + 1

    this.setData({
      productLoading: !!reset,
      productLoadingMore: !reset,
      productError: false
    })

    try {
      const query =
        '/api/admin/products?page=' +
        page +
        '&size=10&keyword=' +
        encodeURIComponent(this.data.productKeyword || '')
      const result = await get(query, { admin: true })
      if (seq !== this.productSeq) return
      const list = (result.items || []).map(product => this.decorateProduct(product))
      const products = reset ? list : this.data.products.concat(list)
      this.setData({
        products: products,
        productPage: page,
        productTotal: result.total || 0,
        productHasMore: products.length < (result.total || 0)
      })
    } catch (error) {
      if (seq !== this.productSeq) return
      if (error.statusCode === 401 || error.statusCode === 403) {
        this.handleAuthLost()
        return
      }
      if (reset || !this.data.products.length) {
        this.setData({ productError: true })
      }
    } finally {
      if (seq === this.productSeq) {
        this.setData({
          productLoading: false,
          productLoadingMore: false
        })
      }
    }
  },

  loadMoreProducts() {
    this.loadProducts(false)
  },

  openCreate() {
    wx.navigateTo({ url: '/pages/editor/index' })
  },

  openEdit(event) {
    const id = Number(event.currentTarget.dataset.id)
    const product = this.data.products.find(item => item.id === id)
    if (!product) return
    wx.navigateTo({
      url: '/pages/editor/index',
      success: res => {
        if (res.eventChannel) res.eventChannel.emit('product', product)
      }
    })
  },

  async toggleSale(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (this.data.productBusyId) return
    const product = this.data.products.find(item => item.id === id)
    if (!product) return

    this.setData({ productBusyId: id })
    try {
      await put(
        '/api/admin/products/' + id,
        {
          categoryId: product.categoryId,
          name: product.name,
          description: product.description,
          price: product.price,
          onSale: !product.onSale
        },
        { admin: true }
      )
      const products = this.data.products.map(item =>
        item.id === id ? Object.assign({}, item, { onSale: !item.onSale }) : item
      )
      this.setData({ products: products })
      wx.showToast({
        title: product.onSale ? '已下架' : '已上架',
        icon: 'none'
      })
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        this.handleAuthLost()
      }
    } finally {
      this.setData({ productBusyId: 0 })
    }
  },

  openRestock(event) {
    const id = Number(event.currentTarget.dataset.id)
    const product = this.data.products.find(item => item.id === id)
    if (!product) return
    this.setData({
      modal: {
        open: true,
        type: 'restock',
        title: '补充库存',
        hint: '为「' + product.name + '」补充库存，当前 ' + product.stock + ' 件',
        label: '补充数量',
        placeholder: '请输入正整数',
        inputType: 'number',
        value: '',
        busy: false,
        product: product,
        user: null,
        categoryId: 0,
        requestId: randomId('stock')
      }
    })
  },

  retryProducts() {
    this.loadProducts(true)
  },

  /* ---------- 分类 ---------- */

  onCategoryName(event) {
    this.setData({ categoryName: event.detail.value })
  },

  async addCategory() {
    if (this.data.categoryBusy) return
    const name = (this.data.categoryName || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    this.setData({ categoryBusy: true })
    try {
      await post('/api/admin/categories', { name: name }, { admin: true })
      this.setData({ categoryName: '' })
      await this.loadCategories()
      wx.showToast({ title: '分类已添加', icon: 'none' })
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        this.handleAuthLost()
      }
    } finally {
      this.setData({ categoryBusy: false })
    }
  },

  openCategoryRename(event) {
    const id = Number(event.currentTarget.dataset.id)
    const category = this.data.categories.find(item => item.id === id)
    if (!category) return
    this.setData({
      modal: {
        open: true,
        type: 'category',
        title: '修改分类名称',
        hint: '当前名称：' + category.name,
        label: '新名称',
        placeholder: '请输入 1-40 个字符',
        inputType: 'text',
        value: category.name,
        busy: false,
        product: null,
        user: null,
        categoryId: id,
        requestId: ''
      }
    })
  },

  deleteCategory(event) {
    const id = Number(event.currentTarget.dataset.id)
    const category = this.data.categories.find(item => item.id === id)
    if (!category) return
    wx.showModal({
      title: '删除分类',
      content: '仅能删除没有商品引用的分类，确定删除「' + category.name + '」吗？',
      confirmText: '删除',
      confirmColor: '#b34a2d',
      success: async res => {
        if (!res.confirm) return
        try {
          await remove('/api/admin/categories/' + id, { admin: true })
          await this.loadCategories()
          wx.showToast({ title: '分类已删除', icon: 'none' })
        } catch (error) {
          if (error.statusCode === 401 || error.statusCode === 403) {
            this.handleAuthLost()
          }
        }
      }
    })
  },

  /* ---------- 核销 ---------- */

  onRedeemInput(event) {
    const value = String(event.detail.value || '')
      .toUpperCase()
      .replace(/[^A-F0-9]/g, '')
      .slice(0, 16)
    this.setData({ redeemCode: value })
  },

  decorateOrder(order) {
    const meta = statusMeta(order.status)
    const lines = (order.items || []).map(line =>
      Object.assign({}, line, {
        lineTotal: money(Number(line.price) * line.quantity)
      })
    )
    return Object.assign({}, order, {
      statusText: meta.text,
      amountText: money(order.amount),
      timeText: dateTime(order.createdAt),
      orderNo: shortId(order.id),
      items: lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0)
    })
  },

  async loadPaidOrders() {
    this.setData({ paidLoading: true, paidError: false })
    try {
      const orders = await get('/api/admin/orders?status=PAID&page=1', {
        admin: true
      })
      this.setData({
        paidOrders: (orders || []).map(order => this.decorateOrder(order))
      })
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        this.handleAuthLost()
        return
      }
      this.setData({ paidError: true })
    } finally {
      this.setData({ paidLoading: false })
    }
  },

  fillPickup(event) {
    const code = event.currentTarget.dataset.code
    if (!code) return
    this.setData({ redeemCode: code })
    wx.showToast({ title: '已填入提货码', icon: 'none' })
  },

  copyCode(event) {
    const code = event.currentTarget.dataset.code
    if (!code) return
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '提货码已复制', icon: 'none' })
    })
  },

  async redeem() {
    if (this.data.redeemBusy) return
    const code = (this.data.redeemCode || '').trim()
    if (!/^[A-F0-9]{16}$/.test(code)) {
      wx.showToast({ title: '请输入 16 位提货码', icon: 'none' })
      return
    }
    this.setData({ redeemBusy: true })
    try {
      const order = await post(
        '/api/admin/orders/redeem',
        { pickupCode: code },
        { admin: true }
      )
      this.setData({
        redeemResult: this.decorateOrder(order),
        redeemCode: ''
      })
      wx.showToast({ title: '核销成功', icon: 'success' })
      this.loadPaidOrders()
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        this.handleAuthLost()
      }
    } finally {
      this.setData({ redeemBusy: false })
    }
  },

  /* ---------- 用户 ---------- */

  async loadUsers(reset) {
    if (!reset && this.data.usersLoading) return
    const seq = (this.usersSeq || 0) + 1
    this.usersSeq = seq
    const page = reset ? 1 : this.data.usersPage + 1
    this.setData({ usersLoading: true, usersError: false })

    try {
      const list = await get('/api/admin/users?page=' + page, { admin: true })
      if (seq !== this.usersSeq) return
      const adminId = this.data.adminId
      const users = (list || []).map(user =>
        Object.assign({}, user, {
          balanceText: money(user.balance),
          roleText: user.role === 'ADMIN' ? '管理员' : '学生',
          isSelf: user.id === adminId,
          enabled: user.enabled !== false
        })
      )
      this.setData({
        users: reset ? users : this.data.users.concat(users),
        usersPage: page,
        usersHasMore: (list || []).length >= 50
      })
    } catch (error) {
      if (seq !== this.usersSeq) return
      if (error.statusCode === 401 || error.statusCode === 403) {
        this.handleAuthLost()
        return
      }
      this.setData({ usersError: true })
    } finally {
      if (seq === this.usersSeq) this.setData({ usersLoading: false })
    }
  },

  loadMoreUsers() {
    this.loadUsers(false)
  },

  openRecharge(event) {
    const id = Number(event.currentTarget.dataset.id)
    const user = this.data.users.find(item => item.id === id)
    if (!user) return
    this.setData({
      modal: {
        open: true,
        type: 'recharge',
        title: '模拟充值',
        hint:
          '为「' +
          (user.nickname || user.username) +
          '」充值，当前余额 ¥' +
          user.balanceText,
        label: '充值金额（元）',
        placeholder: '0.01 - 100000.00',
        inputType: 'digit',
        value: '',
        busy: false,
        product: null,
        user: user,
        categoryId: 0,
        requestId: randomId('recharge')
      }
    })
  },

  async toggleUser(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (this.data.usersBusyId) return
    const user = this.data.users.find(item => item.id === id)
    if (!user) return
    if (user.isSelf) {
      wx.showToast({ title: '不能停用自己的账号', icon: 'none' })
      return
    }

    this.setData({ usersBusyId: id })
    try {
      const updated = await put(
        '/api/admin/users/' + id + '/enabled',
        { enabled: !user.enabled },
        { admin: true }
      )
      const users = this.data.users.map(item =>
        item.id === id
          ? Object.assign({}, item, { enabled: updated.enabled !== false })
          : item
      )
      this.setData({ users: users })
      wx.showToast({
        title: user.enabled ? '账号已停用' : '账号已启用',
        icon: 'none'
      })
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        this.handleAuthLost()
      }
    } finally {
      this.setData({ usersBusyId: 0 })
    }
  },

  retryUsers() {
    this.loadUsers(true)
  },

  /* ---------- 弹窗 ---------- */

  noop() {},

  modalInput(event) {
    this.setData({ 'modal.value': event.detail.value })
  },

  closeModal() {
    if (this.data.modal.busy) return
    this.setData({ 'modal.open': false })
  },

  async confirmModal() {
    const modal = this.data.modal
    if (modal.busy) return
    const value = (modal.value || '').trim()

    if (modal.type === 'restock') {
      const quantity = Number(value)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) {
        wx.showToast({ title: '请输入 1-1000000 的整数', icon: 'none' })
        return
      }
      this.setData({ 'modal.busy': true })
      try {
        const result = await post(
          '/api/admin/stock/add',
          {
            productId: modal.product.id,
            quantity: quantity,
            requestId: modal.requestId || randomId('stock')
          },
          { admin: true }
        )
        const products = this.data.products.map(item =>
          item.id === modal.product.id
            ? Object.assign({}, item, {
                stock:
                  result.stock !== undefined
                    ? Number(result.stock)
                    : item.stock + quantity
              })
            : item
        )
        this.setData({ products: products, 'modal.open': false })
        wx.showToast({ title: '库存已补充', icon: 'success' })
      } catch (error) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          this.handleAuthLost()
        }
      } finally {
        this.setData({ 'modal.busy': false })
      }
      return
    }

    if (modal.type === 'recharge') {
      if (!value) {
        wx.showToast({ title: '请输入充值金额', icon: 'none' })
        return
      }
      if (!/^\d+(\.\d{1,2})?$/.test(value)) {
        wx.showToast({ title: '金额最多两位小数', icon: 'none' })
        return
      }
      const amount = Number(value)
      if (!(amount >= 0.01 && amount <= 100000)) {
        wx.showToast({ title: '金额需在 0.01-100000 之间', icon: 'none' })
        return
      }
      this.setData({ 'modal.busy': true })
      try {
        const result = await post(
          '/api/admin/wallet/recharge',
          {
            requestId: modal.requestId || randomId('recharge'),
            userId: modal.user.id,
            amount: amount
          },
          { admin: true }
        )
        const users = this.data.users.map(item =>
          item.id === modal.user.id
            ? Object.assign({}, item, {
                balanceText: money(result.balance)
              })
            : item
        )
        this.setData({ users: users, 'modal.open': false })
        wx.showToast({ title: '充值成功', icon: 'success' })
      } catch (error) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          this.handleAuthLost()
        }
      } finally {
        this.setData({ 'modal.busy': false })
      }
      return
    }

    if (modal.type === 'category') {
      if (!value) {
        wx.showToast({ title: '请输入分类名称', icon: 'none' })
        return
      }
      if (value.length > 40) {
        wx.showToast({ title: '分类名称最多 40 个字符', icon: 'none' })
        return
      }
      this.setData({ 'modal.busy': true })
      try {
        await put(
          '/api/admin/categories/' + modal.categoryId,
          { name: value },
          { admin: true }
        )
        this.setData({ 'modal.open': false })
        await this.loadCategories()
        wx.showToast({ title: '分类已更新', icon: 'none' })
      } catch (error) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          this.handleAuthLost()
        }
      } finally {
        this.setData({ 'modal.busy': false })
      }
    }
  }
})
