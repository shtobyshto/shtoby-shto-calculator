import {calculate,EXAMPLE_ROLES,EXAMPLE_CONTEXT} from './model.js';
import {downloadCalculation} from './export.js';
import {initializeReadiness} from './readiness.js';

const $=selector=>document.querySelector(selector);
const numberFormat=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
const percentFormat=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
const format=value=>numberFormat.format(value);
let nextId=0;
let roles=[];
const isCalculatorUnlocked=initializeReadiness(()=>{
  roles=[createRole({name:'Участник процесса',count:'1',before:'0',after:'0'})];
  Object.keys(EXAMPLE_CONTEXT).forEach(id=>{document.getElementById(id).value='';});
  document.getElementById('download-status').textContent='';
  document.querySelector('#method details').open=false;
  document.querySelector('.effect-details').open=false;
  renderRoles();
});

function createRole(data) {return {...data,id:++nextId};}
function createCell(row,field,label,numeric=false) {
  const cell=document.createElement('div');cell.setAttribute('role','cell');
  const mobile=document.createElement('label');mobile.className='mobile-label';mobile.textContent=label;mobile.htmlFor=`${field}-${row.id}`;
  if(field==='name') mobile.classList.add('sr-only');
  const input=document.createElement('input');input.type='text';input.id=`${field}-${row.id}`;input.value=row[field];input.dataset.field=field;input.dataset.id=String(row.id);input.className=numeric?'number-input':'role-name';
  input.setAttribute('aria-label',`${label}, роль ${roles.indexOf(row)+1}`);
  if(numeric){input.inputMode=field==='count'?'numeric':'decimal';input.autocomplete='off';input.spellcheck=false;input.maxLength=30;}else input.maxLength=100;
  cell.append(mobile,input);
  if(field==='before'||field==='after'){const total=document.createElement('span');total.className='cell-total';total.dataset.total=`${row.id}-${field}`;cell.append(total);}
  return cell;
}
function renderRoles() {
  const fragment=document.createDocumentFragment();
  roles.forEach((role,index)=>{
    const row=document.createElement('div');row.className='role-row';row.setAttribute('role','row');
    row.append(createCell(role,'name','Роль'),createCell(role,'count','Всего участников процесса',true),createCell(role,'before','ДО автоматизации, часов / 1 чел',true),createCell(role,'after','ПОСЛЕ автоматизации, часов / 1 чел',true));
    const cell=document.createElement('div');cell.setAttribute('role','cell');
    const remove=document.createElement('button');remove.className='delete-role';remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`Удалить роль ${index+1}`);remove.dataset.remove=String(role.id);remove.disabled=roles.length===1;cell.append(remove);row.append(cell);fragment.append(row);
  });
  $('#roles').replaceChildren(fragment);updateResults();
}
function updateResults() {
  const result=calculate(roles);
  document.querySelectorAll('#roles input').forEach(input=>{input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');});
  const error=$('#input-error');error.hidden=result.valid;
  if(!result.valid){
    const first=result.errors[0];error.textContent=(first.index!==undefined?`Роль ${first.index+1}. `:'')+first.message;
    result.errors.forEach(issue=>{const row=roles[issue.index];const field=row?$(`#${issue.field}-${row.id}`):null;if(field){field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby','input-error');}});
  }
  roles.forEach((row,i)=>['before','after'].forEach(field=>{const value=result.rows?.[i]?.[field+'Total'];$(`[data-total="${row.id}-${field}"]`).textContent=value===null||value===undefined?'— всего':`${format(value)} ч всего`;}));
  $('.result-card').classList.toggle('invalid',!result.valid);
  $('.result-card').classList.toggle('negative',result.valid&&result.saved<0);
  if(!result.valid){
    $('#people-total').textContent='—';$('#before-total').textContent='—';$('#after-total').textContent='—';$('#saved-hours').textContent='—';$('#fte-value').textContent='—';$('#percent-result').textContent='Проверьте данные';$('#equation').textContent='Заполните числовые поля';$('#result-heading').textContent='Высвобожденное время';$('#saved-unit').textContent='часов в год';$('#fte-note').textContent='Результат появится после исправления данных.';$('#before-bar').style.width='0%';$('#after-bar').style.width='0%';return result;
  }
  $('#people-total').replaceChildren(document.createTextNode(format(result.totalPeople)+' '));const unit=document.createElement('small');unit.textContent='чел.';$('#people-total').append(unit);
  $('#before-total').textContent=format(result.beforeTotal);$('#after-total').textContent=format(result.afterTotal);$('#saved-hours').textContent=format(result.saved);$('#fte-value').textContent=format(result.fte);
  $('#result-heading').textContent=result.saved<0?'Рост трудозатрат':result.saved===0?'Изменение трудозатрат':'Высвобожденное время';
  $('#saved-unit').textContent=result.saved<0?'часов экономии в год':'часов в год';
  $('#percent-result').textContent=result.percent===null?'Процент не определен: до = 0':result.saved<0?`На ${percentFormat.format(-result.percent)}% больше времени`:result.saved===0?'Трудозатраты не изменились':`На ${percentFormat.format(result.percent)}% меньше времени`;
  $('#fte-note').textContent=result.saved<0?'Внимание! Описанный процесс показывает отрицательную экономию: это означает, что процесс потребует больше времени команды':result.saved===0?'Высвобождения времени при этих значениях нет.':'Ресурс команды для других задач. Не означает сокращение штата.';
  $('#equation').textContent=`${format(result.beforeTotal)} − ${format(result.afterTotal)} = ${format(result.saved)} ч`;
  const scale=Math.max(result.beforeTotal,result.afterTotal);$('#before-bar').style.width=(scale?result.beforeTotal/scale*100:0)+'%';$('#after-bar').style.width=(scale?result.afterTotal/scale*100:0)+'%';
  return result;
}
function restoreExample(){roles=EXAMPLE_ROLES.map(createRole);Object.entries(EXAMPLE_CONTEXT).forEach(([id,value])=>{document.getElementById(id).value=value;});renderRoles();}
$('#roles').addEventListener('input',event=>{const input=event.target;if(!(input instanceof HTMLInputElement)||!input.dataset.field)return;const row=roles.find(row=>row.id===Number(input.dataset.id));if(row){row[input.dataset.field]=input.value;updateResults();}});
$('#roles').addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(!button||roles.length===1)return;const index=roles.findIndex(row=>row.id===Number(button.dataset.remove));roles.splice(index,1);renderRoles();$(`#name-${roles[Math.min(index,roles.length-1)].id}`).focus();});
$('#add-role').addEventListener('click',()=>{const row=createRole({name:'Новая роль',count:'1',before:'0',after:'0'});roles.push(row);renderRoles();const input=$(`#name-${row.id}`);input.focus();input.select();});
$('#restore').addEventListener('click',restoreExample);
$('.method-link').addEventListener('click',event=>{if(!isCalculatorUnlocked()){event.preventDefault();return;}$('#automation-section').open=true;$('#method details').open=true;});
$('#download-excel').addEventListener('click',async()=>{
  if(!isCalculatorUnlocked())return;
  const result=updateResults(),status=$('#download-status'),button=$('#download-excel');
  status.classList.remove('error');
  if(!result.valid){status.textContent='Исправьте данные участников перед скачиванием: '+result.errors[0].message;status.classList.add('error');return;}
  const snapshot=roles.map(({name,count,before,after})=>({name,count,before,after}));
  const fields=Object.fromEntries(Object.keys(EXAMPLE_CONTEXT).map(id=>[id,document.getElementById(id).value]));
  button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='Готовим файл Excel…';
  try{await downloadCalculation(snapshot,fields);status.textContent='Файл Excel готов. Скачивание началось.';}
  catch(error){status.textContent=error.message||'Не удалось подготовить файл. Попробуйте еще раз.';status.classList.add('error');}
  finally{button.disabled=false;button.removeAttribute('aria-busy');}
});
restoreExample();

// Progressive enhancement: one page-scoped tool uses the same state and model as the form.
const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();
  const tool={
    name:'configure_automation_calculation',title:'Рассчитать эффект автоматизации',
    description:'Заменить роли в видимой таблице и пересчитать годовую экономию часов. Описание процесса не меняется.',
    inputSchema:{type:'object',properties:{roles:{type:'array',minItems:1,items:{type:'object',properties:{name:{type:'string',minLength:1,maxLength:100},count:{type:'integer',minimum:0},before:{type:'number',minimum:0},after:{type:'number',minimum:0}},required:['name','count','before','after'],additionalProperties:false}}},required:['roles'],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute(input){
      if(!isCalculatorUnlocked())throw new Error('Сначала пройдите опрос о готовности процесса к ИИ.');
      if(!input||!Array.isArray(input.roles)||Object.keys(input).some(key=>key!=='roles')) throw new Error('Ожидается список ролей.');
      const candidates=input.roles.map(row=>{
        if(!row||typeof row.name!=='string'||row.name.length>100||['count','before','after'].some(key=>typeof row[key]!=='number')||Object.keys(row).some(key=>!['name','count','before','after'].includes(key))) throw new Error('Некорректные поля роли.');
        return {name:row.name,count:String(row.count),before:String(row.before),after:String(row.after)};
      });
      const result=calculate(candidates);if(!result.valid)throw new Error(result.errors[0].message);
      roles=candidates.map(createRole);renderRoles();
      return {totalPeople:result.totalPeople,beforeHours:result.beforeTotal,afterHours:result.afterTotal,savedHours:result.saved,reductionPercent:result.percent,fte:result.fte};
    }
  };
  try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
