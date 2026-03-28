# Service Layer

该目录用于承载业务规则（校验、权限组合、日志拼装）。
当前重构阶段先完成 Hono 路由网关接入，后续逐步将 `routes` 内逻辑下沉到 `services` 与 `repos`。
