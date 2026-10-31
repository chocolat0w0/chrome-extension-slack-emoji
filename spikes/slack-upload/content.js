// Throwaway feasibility spike. No network requests or automatic save.
(() => {
  if (!/^\/customize\/emoji\/?$/.test(location.pathname)) return;
  const qa = (name) => `[data-qa="customize_emoji_add_dialog_${name}"]`;
  const panelId = 'slack-emoji-upload-spike';
  function findForm() {
    const bodies = document.querySelectorAll(qa('body'));
    if (bodies.length !== 1) return null;
    const body = bodies[0];
    const dialog = body.closest('[role="dialog"]');
    const files = body.querySelectorAll(`input[type="file"]${qa('file_input')}`);
    const names = body.querySelectorAll(`input[type="text"]${qa('input')}`);
    if (!dialog || dialog.getAttribute('aria-hidden') === 'true' || !dialog.getClientRects().length || files.length !== 1 || names.length !== 1) return null;
    const file = files[0], name = names[0];
    if (!file.form || file.form !== name.form) return null;
    return { body, dialog, file, name };
  }
  async function generate() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    await document.fonts.ready;
    ctx.fillStyle = '#147d52';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TEST', 64, 64);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob || blob.size >= 128000) throw new Error('PNG generation failed or size exceeded');
    return blob;
  }
  function mount() {
    const form = findForm();
    if (!form || document.getElementById(panelId)) return;
    const host = document.createElement('div');
    host.id = panelId;
    const root = host.attachShadow({mode:'open'});
    root.innerHTML = '<style>:host{display:block;margin:12px 0}section{padding:12px;border:2px solid #147d52;border-radius:8px;background:white;color:#172b24;font:14px sans-serif}button{padding:8px;cursor:pointer}output{display:block;margin-top:8px;overflow-wrap:anywhere}img{width:64px;height:64px;display:none;margin-top:8px}</style><section><strong>Step 2：画像受け渡し検証</strong><p>緑地にTESTのPNGを生成し、画像と一意の名前を登録欄へ渡します。</p><button type="button">テスト画像と名前を反映</button><img alt="生成した検証画像"><output aria-live="polite">保存はSlackの「保存する」で行います。</output></section>';
    const button = root.querySelector('button');
    const output = root.querySelector('output');
    const preview = root.querySelector('img');
    let objectUrl;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const current = findForm();
        if (!current || current.body !== form.body) throw new Error('Form changed; reopen dialog');
        const blob = await generate();
        if (!current.body.isConnected) throw new Error('Dialog closed');
        const name = `codex_spike_${Date.now()}`;
        const transfer = new DataTransfer();
        transfer.items.add(new File([blob], `${name}.png`, {type:'image/png'}));
        current.file.files = transfer.files;
        current.file.dispatchEvent(new Event('change', {bubbles:true}));
        // Use the native setter so React observes a changed value on input.
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(current.name, name);
        current.name.dispatchEvent(new Event('input', {bubbles:true}));
        current.name.dispatchEvent(new Event('change', {bubbles:true}));
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(blob);
        preview.src = objectUrl;
        preview.style.display = 'block';
        output.textContent = `入力イベント送信済み：${name} / ${blob.size} bytes / 128×128 PNG。Slack側のプレビュー・名前を確認してください。`;
        // This reports event dispatch only, never claims Slack accepted or saved.
      } catch (error) {
        output.textContent = `反映失敗：${error.message}`;
      } finally { button.disabled = false; }
    });
    form.body.prepend(host);
  }
  new MutationObserver(mount).observe(document.body, {childList:true, subtree:true});
  mount();
})();
