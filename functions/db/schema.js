export async function ensureSchema(env) {
  const db = env?.DB
  if (!db || typeof db.exec !== 'function') {
    throw new Error('D1 数据库未绑定：请在 wrangler/pages 环境中绑定 env.DB')
  }

  // 证据元数据（不存 IP、不存个人信息；status 仅用于隐藏/恢复）
  // original_key: R2 原图对象 key
  // preview_key/thumb_key: R2 预览/缩略对象 key（非原图，可重建）
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'normal',
      upload_time TEXT NOT NULL,
      hash_sha256 TEXT NOT NULL,
      gps_lat REAL NULL,
      gps_lon REAL NULL,
      exif_json TEXT NOT NULL,
      make TEXT NULL,
      model TEXT NULL,
      datetime_original TEXT NULL,
      image_width INTEGER NULL,
      image_height INTEGER NULL,
      original_key TEXT NOT NULL,
      original_mime TEXT NOT NULL,
      original_size INTEGER NOT NULL,
      preview_key TEXT NULL,
      thumb_key TEXT NULL
    )`
  ).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_evidence_upload_time ON evidence(upload_time)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_evidence_category ON evidence(category)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence(status)').run()

  // 管理员操作日志（不可删除）
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS admin_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      evidence_id TEXT NOT NULL,
      from_status TEXT NULL,
      to_status TEXT NULL,
      created_at TEXT NOT NULL
    )`
  ).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_admin_logs_evidence_id ON admin_logs(evidence_id)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at)').run()

  // 管理员会话（替代 KV）
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`
  ).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at)').run()
}

