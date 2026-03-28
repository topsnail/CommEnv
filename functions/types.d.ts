export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  /** 仅用于 JWT 模式下首个管理员账号 bootstrap。 */
  ADMIN_PASSWORD?: string;
  /** JWT 鉴权密钥（Bearer Token）。 */
  JWT_SECRET?: string;
  /** 可选：系统设置二次解锁口令；未设置时回退为 ADMIN_PASSWORD。 */
  SETTINGS_UNLOCK_PASSWORD?: string;
}
