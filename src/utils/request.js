import Vue from 'vue'
import axios from 'axios'
import router from '../router'

import store from '@/store'
import notification from 'ant-design-vue/es/notification'
import message from 'ant-design-vue/es/message'
import modal from 'ant-design-vue/es/modal'
import { VueAxios } from './axios'
import { ACCESS_TOKEN } from '@/store/mutation-types'

const codeMessage = {
  200: '服务器成功返回请求的数据。',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）。',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  401: '用户没有权限（令牌、用户名、密码错误）。',
  403: '用户得到授权，但是访问是被禁止的。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器。',
  502: '网关错误。',
  503: '服务不可用，服务器暂时过载或维护。',
  504: '网关超时。'
}

// 创建 axios 实例
const service = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL, // api base_url
  timeout: 6000 // 请求超时时间
})

const err = (error) => {
  const { response } = error

  if (response && response.status) {
    const { status, config } = response
    const { url } = config
    const errorText = codeMessage[response.status] || response.statusText
    console.log(errorText)
    console.log(response)

    if (status === 401) {
      const { code } = response.data
      if (error.response) {
        // const data = error.response.data
        // const token = Vue.ls.get(ACCESS_TOKEN)
        switch (code) {
          // Token 已在其它终端登录
          case 50401: {
            modal.confirm({
              title: 'Notification',
              content: '已在其它终端登录，请重新登录',
              onOk () {
                const hide = message.loading('正在退出登录..', 0)
                store.dispatch('Logout').then(() => {
                  hide()
                  router.push({ path: '/user/login', query: { redirect: router.history.current.fullPath } })
                })
              }
            })
            break
          }

          // Token 已过期
          case 50402: {
            modal.confirm({
              title: 'Notification',
              content: 'Token已过期，你暂不能操作任何操作，是否续期(10秒后需重新登录)？',
              onOk () {
                store.dispatch('RefreshToken').then(() => {
                  message.success('登录已续期')
                  setTimeout(() => {
                    window.location.reload()
                  }, 1500)
                })
              }
            })
            break
          }
        }
      }
    } else {
      notification.error({
        message: `请求错误 ${status}: ${url}`,
        description: errorText
      })

      if ([403, 404, 500].indexOf(status) !== -1) {
        router.push({ path: `/exception/${status}` })
      }
      // store
    }
  } else if (!response) {
    notification.error({
      message: '网络异常',
      description: '您的网络发生异常，无法连接服务器'
    })
  }
  return Promise.reject(error)
}

// request interceptor
service.interceptors.request.use(config => {
  const token = Vue.ls.get(ACCESS_TOKEN)
  if (token) {
    config.headers['Authorization'] = 'Bearer ' + token // 让每个请求携带自定义 token 请根据实际情况自行修改
  }
  return config
}, err)

// response interceptor
service.interceptors.response.use((response) => {
  const res = response.data
  if (res.code !== 20000) {
    message.warning(res.message)
    return Promise.reject(new Error('error'))
  } else {
    return response.data
  }
}, err)

const installer = {
  vm: {},
  install (Vue) {
    Vue.use(VueAxios, service)
  }
}

export {
  installer as VueAxios,
  service as axios
}
