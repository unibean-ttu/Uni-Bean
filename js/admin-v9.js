/** v9 management navigation only: does not alter login, sessions or API. */
const tabs = [...document.querySelectorAll('[data-admin-tab]')];
const panels = [...document.querySelectorAll('[data-admin-panel]')];
function showSection(name) {
  if (!tabs.some(tab => tab.dataset.adminTab === name)) return;
  tabs.forEach(tab => {
    const selected = tab.dataset.adminTab === name;
    tab.classList.toggle('active',selected);
    tab.setAttribute('aria-current',selected?'page':'false');
  });
  panels.forEach(section => {section.hidden = section.dataset.adminPanel !== name;});
  const title = tabs.find(tab=>tab.dataset.adminTab === name)?.textContent?.trim();
  document.title = `${title || '工作台'}｜Uni-Bean 管理中心`;
  document.querySelector('.page')?.scrollTo({top:0,behavior:'instant'});
}
for (const tab of tabs) tab.addEventListener('click',()=>showSection(tab.dataset.adminTab));
if (tabs.length) showSection(tabs[0].dataset.adminTab);
