/** A genuine in-app error reporting card. No browser prompt/confirm. */
const $ = id=>document.getElementById(id);
let pending = null;
const dialog=$('report-feedback-dialog'), form=$('report-feedback-form');
function finish(value){if(!pending)return;const resolve=pending;pending=null;dialog?.close();resolve(value)}
$('report-feedback-close')?.addEventListener('click',()=>finish(null));
$('report-feedback-cancel')?.addEventListener('click',()=>finish(null));
dialog?.addEventListener('cancel',e=>{e.preventDefault();finish(null)});
form?.addEventListener('submit',e=>{
 e.preventDefault();finish({reason:$('report-feedback-reason').value,
   comment:$('report-feedback-comment').value.trim().slice(0,300),
   shareContext:$('report-feedback-share').checked});
});
window.unibeanFeedbackReport=()=>new Promise(resolve=>{
 if(!dialog){resolve(null);return}
 if(pending){resolve(null);return}
 form.reset();pending=resolve;dialog.showModal();$('report-feedback-reason').focus();
});
