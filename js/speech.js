import {showToast} from './shell.js';
const $=id=>document.getElementById(id);
let recognizer=null,active=false;
export function initSpeechRecognition(){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 const label=$('modal-speech-label'),btn=$('voice-input-btn');
 if(!Speech){if(label)label.textContent='此瀏覽器不支援語音辨識';if(btn){btn.disabled=true;btn.title='此瀏覽器不支援語音辨識';btn.style.opacity='.45'}return}
 if(label)label.textContent='支援繁體中文語音輸入（依瀏覽器權限）';
 recognizer=new Speech();recognizer.lang='zh-TW';recognizer.continuous=false;recognizer.interimResults=true;
 recognizer.onstart=()=>updateVoiceUi(true);
 recognizer.onresult=e=>{let text='';for(let i=e.resultIndex;i<e.results.length;i++)text+=e.results[i][0].transcript;$('chat-input').value=text};
 recognizer.onerror=()=>{updateVoiceUi(false);showToast('語音辨識失敗，請確認麥克風與瀏覽器權限')};
 recognizer.onend=()=>updateVoiceUi(false);
}
function updateVoiceUi(on){active=on;$('voice-status-banner')?.classList.toggle('hidden',!on);$('voice-input-btn')?.classList.toggle('voice-active-ring',on);if($('voice-icon'))$('voice-icon').className=on?'fa-solid fa-microphone-lines animate-pulse':'fa-solid fa-microphone'}
export function toggleVoiceRecognition(){if(!recognizer){showToast('目前瀏覽器不支援語音輸入');return}if(active){stopVoiceRecognition();return}try{recognizer.start()}catch{showToast('無法啟動麥克風')}}
export function stopVoiceRecognition(){if(recognizer&&active){try{recognizer.stop()}catch{}}updateVoiceUi(false)}
export function simulateVoiceInput(){const input=$('chat-input');if(input){input.value='我想休學要去哪裡申請？';input.focus();showToast('已填入文字範例（非語音辨識結果）')}stopVoiceRecognition()}
