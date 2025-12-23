# API Overview & Design Principles

* **目标**：统一 API 的命名规范、响应结构、错误码设计、幂等性等。

1. **API 设计原则**：

   * 所有 API 返回的结构统一为：

     ```json
     {
       "ok": true,
       "data": { /* 返回的数据 */ }
     }
     ```
   * 错误响应结构：

     ```json
     {
       "ok": false,
       "error": {
         "code": "ERROR_CODE",
         "message": "详细错误信息",
         "details": "更多细节"
       }
     }
     ```

2. **幂等性**：

   * 所有写操作支持 `Idempotency-Key`，用于防止重复请求。

3. **错误码设计**：

   * 统一使用语义化错误码，例如：

     * `WO_NOT_RELEASED`：工单未释放
     * `RUN_NOT_AUTHORIZED`：运行未授权
     * `STEP_MISMATCH`：工序不匹配