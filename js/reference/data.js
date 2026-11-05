/** Public user roles are navigation personas, never authentication roles. */
export const ROLES = [
  {id:'student', icon:'🎓',label:'在校學生',hint:'選課・獎學金', intro:'選課、獎學金、畢業門檻、請假及校務資訊',prompts:['獎學金申請資訊在哪裡查？','休學與復學規章去哪裡找？','成績單要向哪個單位申請？']},
  {id:'freshman',icon:'🌱',label:'新生',hint:'註冊・住宿',intro:'入學流程、註冊、住宿及新生導引',prompts:['新生入學註冊要查哪些事項？','宿舍申請資訊在哪個處室？','新生選課要查哪個網站？']},
  {id:'parent',icon:'🏡',label:'家長',hint:'學費・聯絡',intro:'學費、獎助學金、學校聯絡資訊與交通',prompts:['大同大學學雜費資訊在哪裡查？','有哪些獎助學金官方來源？','教務處及學務處的官方網站？']},
  {id:'alumni',icon:'⭐',label:'畢業校友',hint:'證明・校友服務',intro:'歷年成績單、畢業文件及校友服務',prompts:['畢業校友如何查申請成績單的規定？','畢業證書補發要找誰？','校友服務資訊在哪裡查？']},
  {id:'staff',icon:'📚',label:'教職員工',hint:'行政・規章',intro:'行政規章、人事與會計及會議資訊',prompts:['人事差勤相關規定的官方來源？','校務會議紀錄去哪裡查？','會計經費核銷相關公告在哪裡？']},
  {id:'visitor',icon:'🧭',label:'訪客',hint:'交通・校園',intro:'校園地圖、交通路線與各處室公開資訊',prompts:['怎麼從台北車站到大同大學？','大同大學校園在哪裡？','學校有什麼公開的服務入口？']},
];
export const SCENARIOS = [
  {icon:'📘',label:'選課與成績',hint:'註冊、加退選、抵免、成績單',question:'大同大學選課、成績與學分抵免規定在哪裡查詢？'},
  {icon:'🎓',label:'獎助學金',hint:'申請窗口與官方公告',question:'大同大學的獎助學金申請有哪些官方資料來源？'},
  {icon:'🏠',label:'宿舍與住宿',hint:'新生住宿、宿舍管理',question:'大同大學宿舍與新生住宿申請資訊在哪裡？'},
  {icon:'🧾',label:'請假與生活',hint:'請假、生活輔導',question:'大同大學學生請假辦理流程在哪裡查詢？'},
  {icon:'📄',label:'學籍文件',hint:'在學證明、成績單、補發',question:'在學證明與畢業證書申請程序去哪裡查？'},
  {icon:'🌍',label:'國際交流',hint:'交換、出國與國際學生',question:'大同大學交換學生與國際交流資訊在哪裡查？'},
  {icon:'🏢',label:'處室與系所',hint:'窗口、業務與官方網站',question:'大同大學各行政處室有哪些官方服務？'},
  {icon:'📍',label:'校園交通',hint:'大眾運輸與校園路線',question:'前往大同大學有哪些交通方式？'},
];
export const ROLE_STORAGE = 'unibean_reference_role_v1';
export const HISTORY_STORAGE = 'unibean_reference_history_v1';
export const FAVORITES_STORAGE = 'unibean_reference_favorites_v1';
