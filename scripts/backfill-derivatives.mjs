/**
 * 历史证据补全：从 R2 读取 original，本地用 sharp 生成 small/thumb2/preview（≤200KB JPEG），
 * 写回 R2 并通过 D1 HTTP API 更新 small_key / thumb_key / preview_key。
 *
 * 需在本机 Node 运行（非 Worker）。不修改 original 对象。
 *
 * 环境变量（必填）：
 *   CLOUDFLARE_ACCOUNT_ID   — 账户 ID
 *   CLOUDFLARE_API_TOKEN      — 需含 D1 写权限
 *   D1_DATABASE_ID            — 默认可省略，默认读 wrangler.toml 中 database_id
 *   R2_ACCESS_KEY_ID          — R2 S3 API 访问密钥
 *   R2_SECRET_ACCESS_KEY
 *
 * 可选：
 *   R2_BUCKET_NAME            — 默认 commenv-r2（与 wrangler.toml 一致）
 *
 * 用法：
 *   node scripts/backfill-derivatives.mjs
 *   node scripts/backfill-derivatives.mjs --dry-run
 *   node scripts/backfill-derivatives.mjs --limit 5
 *   node scripts/backfill-derivatives.mjs --id <uuid>
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import sharp from 'sharp'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const MAX_BYTES = 200 * 1024

/** 与 functions/api/upload.js DERIVATIVE_SPECS 一致 */
const SPECS = [
  {
    dbColumn: 'small_key',
    r2Key: (id) => `small/${id}.jpg`,
    preset: { maxW: 400, maxH: 400, startQuality: 0.7, minQuality: 0.35, minEdge: 40 },
  },
  {
    dbColumn: 'thumb_key',
    r2Key: (id) => `thumb2/${id}.jpg`,
    preset: { maxW: 720, maxH: 720, startQuality: 0.86, minQuality: 0.35, minEdge: 44 },
  },
  {
    dbColumn: 'preview_key',
    r2Key: (id) => `preview/${id}.jpg`,
    preset: { maxW: 1600, maxH: 1600, startQuality: 0.82, minQuality: 0.35, minEdge: 48 },
  },
]

function calcFitSize(srcW, srcH, maxW, maxH) {
  if (!srcW || !srcH) return { width: maxW, height: maxH }
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1)
  return {
    width: Math.max(1, Math.round(srcW * ratio)),
    height: Math.max(1, Math.round(srcH * ratio)),
  }
}

/**
 * 行为对齐 functions/lib/imageBudget.js buildJpegVariantUnderBudget（sharp 实现）
 */
async function buildJpegVariantUnderBudgetSharp(inputBuffer, options) {
  const {
    maxW,
    maxH,
    maxBytes = MAX_BYTES,
    startQuality = 0.82,
    minQuality = 0.35,
    minEdge = 48,
  } = options

  const meta = await sharp(inputBuffer).metadata()
  const sw = meta.width || 1
  const sh = meta.height || 1
  let { width: w, height: h } = calcFitSize(sw, sh, maxW, maxH)
  const floor = Math.max(32, minEdge)

  const tryEncode = async (tw, th, q) => {
    return sharp(inputBuffer)
      .resize(tw, th, { fit: 'fill' })
      .jpeg({ quality: Math.round(q * 100), mozjpeg: true })
      .toBuffer()
  }

  for (let round = 0; round < 18; round++) {
    let q = startQuality
    while (q >= minQuality - 1e-6) {
      const buf = await tryEncode(w, h, q)
      if (buf.length <= maxBytes) return buf
      q -= 0.055
    }
    const nw = Math.max(floor, Math.round(w * 0.87))
    const nh = Math.max(floor, Math.round(h * 0.87))
    if (nw >= w && nh >= h) break
    w = nw
    h = nh
  }

  let fw = Math.max(floor, w)
  let fh = Math.max(floor, h)
  for (let i = 0; i < 14; i++) {
    const buf = await tryEncode(fw, fh, minQuality)
    if (buf.length <= maxBytes) return buf
    fw = Math.max(32, Math.round(fw * 0.72))
    fh = Math.max(32, Math.round(fh * 0.72))
  }

  return sharp(inputBuffer).resize(32, 32, { fit: 'fill' }).jpeg({ quality: Math.round(minQuality * 100), mozjpeg: true }).toBuffer()
}

function parseArgs(argv) {
  let dryRun = false
  let limit = null
  let id = null
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') dryRun = true
    else if (a === '--limit' && argv[i + 1]) {
      limit = Math.max(1, parseInt(argv[++i], 10) || 0)
    } else if (a === '--id' && argv[i + 1]) {
      id = String(argv[++i])
    }
  }
  return { dryRun, limit, id }
}

function readDefaultDatabaseId() {
  try {
    const toml = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8')
    const m = toml.match(/database_id\s*=\s*"([^"]+)"/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

async function d1Query(accountId, databaseId, token, sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  })
  const json = await res.json()
  if (!json.success) {
    const err = json.errors?.map((e) => e.message).join('; ') || JSON.stringify(json)
    throw new Error(`D1: ${err}`)
  }
  const meta = json.result?.[0]
  if (meta?.results && Array.isArray(meta.results)) return meta.results
  return []
}

function makeS3Client(accountId, accessKeyId, secretAccessKey) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

async function getObjectBuffer(client, bucket, key) {
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const body = out.Body
  if (!body) throw new Error(`R2 空响应: ${key}`)
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray())
  }
  const chunks = []
  for await (const chunk of body) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function putObjectJpeg(client, bucket, key, buf, dryRun) {
  if (dryRun) {
    console.log(`  [dry-run] PUT ${key} (${buf.length} bytes)`)
    return
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: 'image/jpeg',
    })
  )
}

async function main() {
  const { dryRun, limit, id: onlyId } = parseArgs(process.argv)

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const databaseId = process.env.D1_DATABASE_ID || readDefaultDatabaseId()
  const bucket = process.env.R2_BUCKET_NAME || 'commenv-r2'
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !apiToken || !databaseId) {
    console.error('缺少环境变量：CLOUDFLARE_ACCOUNT_ID、CLOUDFLARE_API_TOKEN，以及 D1_DATABASE_ID（或确保 wrangler.toml 含 database_id）')
    process.exit(1)
  }
  if (!accessKeyId || !secretAccessKey) {
    console.error('缺少 R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY（R2 仪表板 → 管理 R2 API 令牌）')
    process.exit(1)
  }

  const s3 = makeS3Client(accountId, accessKeyId, secretAccessKey)

  let sql = `
    SELECT id, original_key, small_key, thumb_key, preview_key
    FROM evidence
    WHERE original_key IS NOT NULL
      AND (small_key IS NULL OR thumb_key IS NULL OR preview_key IS NULL)
  `
  const params = []
  if (onlyId) {
    sql += ' AND id = ?'
    params.push(onlyId)
  }
  sql += ' ORDER BY upload_time ASC'

  console.log('查询待补全记录…')
  let rows = await d1Query(accountId, databaseId, apiToken, sql.trim(), params)
  if (limit) rows = rows.slice(0, limit)

  if (rows.length === 0) {
    console.log('没有需要补全的记录（或 --id 未命中）。')
    return
  }

  console.log(`共 ${rows.length} 条${dryRun ? '（dry-run）' : ''}\n`)

  for (const row of rows) {
    const evidenceId = row.id
    const originalKey = row.original_key

    console.log(`[${evidenceId}] original=${originalKey}`)

    let originalBuf
    try {
      originalBuf = await getObjectBuffer(s3, bucket, originalKey)
    } catch (e) {
      console.error(`  跳过：无法读取原图 ${e.message}`)
      continue
    }

    const updates = {}

    for (const spec of SPECS) {
      if (row[spec.dbColumn]) {
        console.log(`  已有 ${spec.dbColumn}，跳过`)
        continue
      }

      const key = spec.r2Key(evidenceId)
      try {
        const jpeg = await buildJpegVariantUnderBudgetSharp(originalBuf, {
          ...spec.preset,
          maxBytes: MAX_BYTES,
        })
        await putObjectJpeg(s3, bucket, key, jpeg, dryRun)
        updates[spec.dbColumn] = key
        console.log(`  OK ${spec.dbColumn} -> ${key} (${jpeg.length} B)`)
      } catch (e) {
        console.error(`  失败 ${spec.dbColumn}: ${e.message}`)
      }
    }

    const cols = Object.keys(updates)
    if (cols.length === 0) continue

    if (dryRun) {
      console.log(`  [dry-run] UPDATE evidence SET ${cols.map((c) => `${c}=?`).join(', ')} WHERE id=?`)
      continue
    }

    const setSql = cols.map((c) => `${c} = ?`).join(', ')
    const bind = [...cols.map((c) => updates[c]), evidenceId]
    await d1Query(accountId, databaseId, apiToken, `UPDATE evidence SET ${setSql} WHERE id = ?`, bind)
    console.log('  D1 已更新')
  }

  console.log('\n完成。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
