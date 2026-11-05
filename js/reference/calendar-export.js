/** 安全匯出已核實的官方日期為 iCalendar；只使用後端資料，不生成校務期限。 */
function escapeIcs(text){return String(text).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
export function exportEvent(ev){
 const day=new Date(`${ev.date}T00:00:00Z`);if(Number.isNaN(day.getTime()))return;
 const last=new Date(`${ev.end_date||ev.date}T00:00:00Z`);const next=new Date((Number.isNaN(last.getTime())?day:last).getTime()+86400000);
 if(next<=day)return;
 const date=d=>d.toISOString().slice(0,10).replaceAll('-','');
 const uid=`unibean-${date(day)}-${btoa(unescape(encodeURIComponent(ev.title))).replace(/[^a-zA-Z0-9]/g,'').slice(0,24)}@localhost`;
 const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Uni-Bean//Verified Calendar Export//ZH-TW',
  'BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,
  `DTSTART;VALUE=DATE:${date(day)}`,`DTEND;VALUE=DATE:${date(next)}`,`SUMMARY:${escapeIcs(ev.title)}`,
  `DESCRIPTION:${escapeIcs('來源：'+ev.source_url)}`,`URL:${ev.source_url}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
 const file=new Blob([content],{type:'text/calendar;charset=utf-8'});const url=URL.createObjectURL(file);
 const a=document.createElement('a');a.href=url;a.download=`UniBean_${date(day)}.ics`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
