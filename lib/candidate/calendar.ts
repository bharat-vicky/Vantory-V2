export function calendarEvent({id,title,company,at}:{id:string;title:string;company:string;at:Date}){
 const date=(d:Date)=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
 const esc=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
 const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Vantory//Candidate reminders//EN","BEGIN:VEVENT",`UID:${id}@vantory`,`DTSTAMP:${date(new Date())}`,`DTSTART:${date(at)}`,`DTEND:${date(new Date(at.getTime()+3600000))}`,`SUMMARY:${esc(title+" - "+company)}`,"BEGIN:VALARM","TRIGGER:-PT30M","ACTION:DISPLAY","DESCRIPTION:Opportunity reminder","END:VALARM","END:VEVENT","END:VCALENDAR"];
 return lines.map(line=>{const chars=[...line];let folded="",width=0;for(const char of chars){const bytes=new TextEncoder().encode(char).length;if(width+bytes>73){folded+="\r\n ";width=1;}folded+=char;width+=bytes;}return folded;}).join("\r\n")+"\r\n";
}
