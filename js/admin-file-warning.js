/** Kept separate from HTML. Prevents file:// admin previews from looking authenticated. */
if (location.protocol === 'file:') {
  const warning = document.createElement('div');
  warning.className = 'admin-file-warning';
  warning.setAttribute('role','alert');
  warning.textContent = '管理功能不能直接雙擊 HTML。請在 VS Code PowerShell 執行 python .\\run.py，再開啟 http://127.0.0.1:8765/login.html 登入。';
  document.body.prepend(warning);
}
