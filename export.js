import {calculate,parseNumber,ANNUAL_HOURS} from './model.js';

let libraryPromise;
function loadExcelLibrary(){
  if(globalThis.ExcelJS)return Promise.resolve(globalThis.ExcelJS);
  if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL('./exceljs.min.js',import.meta.url).href;
    script.onload=()=>globalThis.ExcelJS?resolve(globalThis.ExcelJS):reject(new Error('Не удалось загрузить экспорт Excel.'));
    script.onerror=()=>{script.remove();libraryPromise=undefined;reject(new Error('Не удалось загрузить экспорт Excel. Попробуйте еще раз.'));};
    document.head.append(script);
  });
  return libraryPromise;
}

// ExcelJS is the browser-side writer. Cached results use the same calculation
// as the page; formulas recalculate from exported inputs when opened in Excel.
export function buildWorkbook(ExcelJS,roles,context){
  const result=calculate(roles);
  if(!result.valid)throw new Error(result.errors[0].message);
  const workbook=new ExcelJS.Workbook();workbook.creator='Штобы што';workbook.title='Расчет эффекта автоматизации';
  workbook.calcProperties.fullCalcOnLoad=true;
  const sheet=workbook.addWorksheet('Расчет',{views:[{showGridLines:false}],properties:{tabColor:{argb:'FF365EE8'}},pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
  const process=workbook.addWorksheet('Процесс',{views:[{showGridLines:false}],pageSetup:{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0}});
  sheet.columns=[{width:38},{width:19},{width:20},{width:22},{width:20},{width:22},{width:22}];
  process.columns=[{width:33},{width:104}];
  const blue='FF365EE8',ink='FF283449',muted='FF647086';
  const num='#,##0.00;[Red]-#,##0.00';
  const formula=(address,expression,value)=>{sheet.getCell(address).value={formula:expression,result:value};};
  const last=10+roles.length,total=last+1;
  sheet.getCell('A2').value='Штобы што — эффект автоматизации';
  sheet.getCell('A3').value='Процесс';formula('B3',"'Процесс'!B3",context['process-name']||'');
  sheet.getCell('A5').value='Высвобожденное время, ч/год';formula('B5',`G${total}`,result.saved);
  sheet.getCell('D5').value='Снижение, %';formula('E5',`IF(D${total}=0,"Не определено",B5/D${total})`,result.percent===null?'Не определено':result.percent/100);
  sheet.getCell('F5').value='Эквивалент, FTE';formula('G5','B5/B7',result.fte);
  sheet.getCell('A7').value='Рабочих часов в год';sheet.getCell('B7').value=ANNUAL_HOURS;
  sheet.getCell('A8').value='Период расчета';sheet.getCell('B8').value='1 год';
  sheet.getRow(10).values=['Роль','Сотрудников','До, ч/чел. в год','До, ч команды в год','После, ч/чел. в год','После, ч команды в год','Экономия, ч/год'];
  roles.forEach((role,i)=>{
    const n=11+i,r=result.rows[i];
    sheet.getRow(n).values=[role.name,parseNumber(role.count,true),parseNumber(role.before),null,parseNumber(role.after),null,null];
    formula(`D${n}`,`B${n}*C${n}`,r.beforeTotal);formula(`F${n}`,`B${n}*E${n}`,r.afterTotal);formula(`G${n}`,`D${n}-F${n}`,r.beforeTotal-r.afterTotal);
    for(const c of ['B','C','E']){
      sheet.getCell(`${c}${n}`).font={name:'Arial',size:11,color:{argb:blue}};
      sheet.getCell(`${c}${n}`).dataValidation={type:c==='B'?'whole':'decimal',operator:'greaterThanOrEqual',formulae:[0],allowBlank:false,showErrorMessage:true,errorTitle:'Проверьте значение',error:c==='B'?'Введите целое число от 0.':'Введите число от 0.'};
    }
    sheet.getRow(n).height=Math.max(32,Math.ceil(role.name.length/35)*16+12);
  });
  sheet.getCell(`A${total}`).value='Итого';
  for(const [col,value] of [['B',result.totalPeople],['D',result.beforeTotal],['F',result.afterTotal],['G',result.saved]])formula(`${col}${total}`,`SUM(${col}11:${col}${last})`,value);
  sheet.getCell(`A${total+2}`).value='Синим выделены исходные значения. Отрицательная экономия означает рост трудозатрат.';
  sheet.getCell(`A${total+3}`).value='FTE — ресурс для других задач, не сокращение штата.';
  sheet.getCell(`A${total+5}`).value={text:'Пример от Штобы Што в google-таблице онлайн',hyperlink:'https://docs.google.com/spreadsheets/d/1fkXjF8HZROKXTCzNd-WwST2oFwC5pKs5PCzyS8MUsi8/edit?gid=0#gid=0'};
  sheet.autoFilter=`A10:G${last}`;
  sheet.pageSetup.printArea=`A1:G${total+5}`;
  sheet.pageSetup.printTitlesRow='10:10';

  process.getCell('A2').value='Что автоматизируем';
  const fields=[['Процесс или действие','process-name'],['Что не устраивает сейчас','pain'],['Предлагаемое решение','solution'],['Иные эффекты и риски текущего процесса','risks'],['Комментарии','comments']];
  let row=3;
  for(const [label,key] of fields){
    const value=String(context[key]??'');
    // Split unusually long descriptions across rows without dropping text.
    const pieces=[];let piece='',lines=1,column=0;
    for(const char of value){piece+=char;column++;if(char==='\n'||column>=95){lines++;column=0;}if(lines>=18){pieces.push(piece);piece='';lines=1;column=0;}}
    if(piece||!pieces.length)pieces.push(piece);
    for(const [i,text] of pieces.entries()){
      process.getCell(`A${row}`).value=i===0?label:'';process.getCell(`B${row}`).value=text;
      const lineCount=text.split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil(line.length/95)),0);
      process.getRow(row).height=Math.max(38,Math.min(350,lineCount*16+14));row++;
    }
  }
  process.pageSetup.printArea=`A1:B${row-1}`;
  for(const ws of [sheet,process])ws.eachRow(r=>r.eachCell(cell=>{
    cell.font={name:'Arial',size:11,color:{argb:ink},...cell.font};
    cell.alignment={vertical:'middle',wrapText:false};
  }));
  for(const address of ['A2']){sheet.getCell(address).font={name:'Arial',size:16,bold:true,color:{argb:ink}};process.getCell(address).font={name:'Arial',size:16,bold:true,color:{argb:ink}};}
  sheet.getRow(2).height=34;process.getRow(2).height=34;
  sheet.getRow(5).height=50;
  for(const cell of ['A5','D5','F5']){sheet.getCell(cell).alignment={vertical:'middle',wrapText:true};sheet.getCell(cell).font={name:'Arial',size:11,bold:true,color:{argb:ink}};}
  for(const cell of ['B5','E5','G5']){sheet.getCell(cell).font={name:'Arial',size:16,bold:true,color:{argb:blue}};sheet.getCell(cell).numFmt=num;}
  sheet.getCell('E5').numFmt='0.0%;[Red]-0.0%';sheet.getCell('E5').alignment={vertical:'middle',wrapText:true};
  sheet.getCell('B7').numFmt='#,##0';sheet.getCell('B7').font={name:'Arial',size:11,color:{argb:blue}};
  sheet.getCell('B7').dataValidation={type:'decimal',operator:'greaterThan',formulae:[0],allowBlank:false,showErrorMessage:true,error:'Введите число больше 0.'};
  sheet.getCell('B3').alignment={vertical:'middle',wrapText:true};sheet.getRow(3).height=Math.max(32,Math.ceil((context['process-name']||'').length/18)*15);
  sheet.getRow(10).height=56;sheet.getRow(10).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:blue}};cell.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};});
  for(let n=11;n<=total;n++){
    sheet.getCell(`A${n}`).alignment={vertical:'middle',wrapText:true};
    for(const col of ['B','C','D','E','F','G'])sheet.getCell(`${col}${n}`).numFmt=col==='B'?'#,##0':num;
  }
  sheet.getRow(total).height=34;sheet.getRow(total).eachCell(cell=>{cell.font={name:'Arial',size:11,bold:true,color:{argb:ink}};cell.border={top:{style:'thin',color:{argb:'FFC5CCD7'}}};});
  for(const n of [total+2,total+3,total+5]){sheet.getRow(n).height=24;sheet.getCell(`A${n}`).font={name:'Arial',size:10,color:{argb:n===total+5?blue:muted},underline:n===total+5};}
  process.eachRow((r,n)=>{if(n>=3)r.eachCell(cell=>{cell.alignment={vertical:'top',wrapText:true};});});
  return workbook;
}

export async function downloadCalculation(roles,context){
  const ExcelJS=await loadExcelLibrary();
  const workbook=buildWorkbook(ExcelJS,roles,context);
  const bytes=await workbook.xlsx.writeBuffer();
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  const title=(context['process-name']||'Автоматизация').replace(/[<>:"/\\|?*\x00-\x1F]/g,'').trim().slice(0,80)||'Автоматизация';
  link.href=url;link.download=`Расчет — ${title}.xlsx`;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
