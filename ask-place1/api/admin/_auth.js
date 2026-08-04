// 管理者用エンドポイント共通の合言葉チェック。
// ADMIN_PASSCODE はVercelの環境変数で設定してください(コードには書かない)。
export function checkAdminAuth(request) {
  const provided = request.headers['x-admin-passcode']
  const expected = process.env.ADMIN_PASSCODE

  if (!expected) {
    // 環境変数が未設定の場合は誰も管理操作できないようにする(安全側)
    return false
  }
  return provided === expected
}
