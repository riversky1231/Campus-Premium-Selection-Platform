const { BASE_URL } = require('./utils/config')
const { currentUser } = require('./utils/session')

App({
  globalData: {
    baseUrl: BASE_URL,
    user: null
  },

  onLaunch() {
    this.globalData.user = currentUser()
  }
})
