/** 路由入口：实现见 impl.js（避免 _worker 动态 import 含 [id] 的路径在打包后失败） */
export { onRequest, onRequestGet } from './impl.js'
