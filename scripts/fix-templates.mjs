import fs from 'node:fs';
for(const [file,field] of [['profile','profile'],['settings','settings']]) {
 const p=`src/app/admin/pages/${file}.html`; let s=fs.readFileSync(p,'utf8').replace(`@if (${field}())`,`@if (${field}(); as draft)`).replaceAll(`${field}().`,'draft.');fs.writeFileSync(p,s);
}
let p='src/app/admin/pages/events.html',s=fs.readFileSync(p,'utf8');s=s.replaceAll('event().','event.').replace('editEvent(event())','editEvent(event)');fs.writeFileSync(p,s);
p='src/app/admin/login/login.html';s=fs.readFileSync(p,'utf8').replace('resetState ===','resetState() ===').replace('resetMode() = !resetMode()','resetMode.set(!resetMode())');fs.writeFileSync(p,s);
p='src/app/admin/pages/overview.html';s=fs.readFileSync(p,'utf8').replace('voidId() = sale._id','voidId.set(sale._id)');fs.writeFileSync(p,s);
