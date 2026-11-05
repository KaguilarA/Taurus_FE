import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const configs = {
 'admin/login/login': ['username','password','resetMode','resetState','resetPassword'],
 'admin/pages/accounts':['staff'], 'admin/pages/events':['event'],
 'admin/pages/inventory':['selectedStock','stockQuantity','stockMode','stockReason'],
 'admin/pages/overview':['from','to','voidId','voidReason'], 'admin/pages/products':['product'],
 'admin/pages/profile':['profile','ownPassword'], 'admin/pages/promotions':['promotion'],
 'admin/pages/reports':['from','to'], 'admin/pages/sales':['paymentMethod','label','selectedServing'],
 'admin/pages/service':['billMethods','billReferences'], 'admin/pages/settings':['settings'],
 'admin/pages/tables':['tableName'], 'setup':['name','username','password','passwordConfirmation'],
 'business-setup':['business'], 'account':['notes','tableToken'],
};
for (const [file,names] of Object.entries(configs)) {
 const p='src/app/'+file+'.ts'; let source=fs.readFileSync(p,'utf8');
 const sf=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true);
 const isField=n=>ts.isPropertyAccessExpression(n)&&n.expression.kind===ts.SyntaxKind.ThisKeyword&&names.includes(n.name.text);
 const result=ts.transform(sf,[ctx=>{
 const f=ctx.factory;
 const visit=n=>{
  if(ts.isPropertyDeclaration(n)&&names.includes(n.name.getText(sf))) {
   const init=ts.visitNode(n.initializer,visit);
   return f.updatePropertyDeclaration(n,[f.createModifier(ts.SyntaxKind.ReadonlyKeyword)],n.name,undefined,undefined,f.createCallExpression(f.createIdentifier('signal'),n.type?[n.type]:undefined,[init]));
  }
  if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsToken&&isField(n.left))
   return f.createCallExpression(f.createPropertyAccessExpression(n.left,'set'),undefined,[ts.visitNode(n.right,visit)]);
  if(isField(n)) return f.createCallExpression(n,undefined,[]);
  return ts.visitEachChild(n,visit,ctx);
 };
 return n=>ts.visitNode(n,visit);
 }]);
 source=ts.createPrinter().printFile(result.transformed[0]);
 if(!/import \{[^}]*\bsignal\b[^}]*\} from ['"]@angular\/core/.test(source)) source=source.replace(/import \{/, 'import { signal,');
 fs.writeFileSync(p,source);
 const html=p.replace(/\.ts$/,'.html');
 let template=fs.existsSync(html)?fs.readFileSync(html,'utf8'):null;
 // Rewrite only template expressions, keeping attributes and prose intact.
 const transformTemplate=t=>{
  const aliases={};
  for(const m of t.matchAll(/@if\s*\(\s*(\w+)\s*;\s*as\s+(\w+)\s*\)/g)) if(names.includes(m[1])) aliases[m[2]]=m[1];
  const objects=new Set(['resetPassword','staff','event','product','profile','ownPassword','promotion','settings','business','selectedServing','billMethods','billReferences']);
  // Split two-way object bindings so every edit replaces the signal value.
  t=t.replace(/\[\((ngModel|value)\)\]="([^"]+)"/g,(all,binding,expr)=>{
   const root=expr.match(/^\w+/)?.[0]; const field=aliases[root]??root;
   if(!names.includes(field))return all;
   if(!objects.has(field))return `[${binding}]="${field}()" (${binding}Change)="${field}.set($event)"`;
   const suffix=expr.slice(root.length); const keys=[];
   for(const m of suffix.matchAll(/\.(\w+)|\[([^\]]+)\]/g)) keys.push(m[1]?`'${m[1]}'`:m[2]);
   return `[${binding}]="${expr}" (${binding}Change)="updateField(${field}, [${keys.join(', ')}], $event)"`;
  });
  // Rewrite reads and simple assignments only within Angular expression regions.
  const expr=e=>{
   for(const name of names){
    e=e.replace(new RegExp(`\\b${name}\\s*=\\s*(null|true|false|\\$event|''|\"\")`,'g'),`${name}.set($1)`);
    e=e.replace(new RegExp(`(?<![\\w.'\"])\\b${name}\\b(?![\\w'\"]|\\s*\\(|\\s*\\.(?:set|update)\\b)`,'g'),(m,offset,str)=>{
      // updateField takes a signal reference as its first argument.
      if(/updateField\(\s*$/.test(str.slice(0,offset)))return m;
      return name+'()';
    });
   }
   return e;
  };
  t=t.replace(/((?:\[[^\]]+\]|\([^)]+\))\s*=\s*")([^"]*)(")/g,(_,a,e,b)=>a+expr(e)+b)
   .replace(/{{([\s\S]*?)}}/g,(_,e)=>'{{'+expr(e)+'}}')
   .replace(/(@if\s*\()([^;\n]+)(?=;|\)\s*{)/g,(_,a,e)=>a+expr(e));
  // Existing explicit map assignment.
  t=t.replace(/billMethods\(\)\[bill\._id\] = \$event/g,"updateField(billMethods, [bill._id], $event)");
  return t;
 };
 if(template!==null){template=transformTemplate(template);fs.writeFileSync(html,template);}
 else source=source.replace(/template: `([\s\S]*?)`/,(_,t)=>'template: `'+transformTemplate(t)+'`');
 if((template??source).includes('updateField(')) {
  const relative=path.relative(path.dirname(p),'src/app/shared/update-field').replaceAll('\\','/');
  source=`import { updateField } from '${relative.startsWith('.')?relative:'./'+relative}';\n`+source;
  source=source.replace(/(export class \w+[^\{]*\{)/,'$1\n readonly updateField = updateField;');
 }
 fs.writeFileSync(p,source);
}
