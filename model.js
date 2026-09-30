export const ANNUAL_HOURS = 1972;
export const EXAMPLE_ROLES = [
  {name:'HR: кадры',count:'20',before:'50',after:'10'},
  {name:'HRBP',count:'5',before:'20',after:'1'},
  {name:'Руководители',count:'900',before:'10',after:'3'},
  {name:'Сотрудники',count:'2000',before:'15',after:'1'},
];
export const EXAMPLE_CONTEXT = {
  'process-name':'Оформление отпуска',
  pain:'Сотрудник отправляет заявку на отпуск по электронной почте кадрам, указывая только даты. Он не видит пересечения с отпусками коллег. Руководитель может пропустить письмо и тратит время на согласование, не видя единого календаря команды. HRBP регулярно отвечают на вопросы. Кадры вручную перепроверяют данные, заносят их в систему и оформляют отпуск.',
  solution:'Создать на корпоративном портале или в Service Desk шаблон заявки на отпуск. Данные сотрудника автоматически подтягиваются из 1С, сотрудник выбирает свободные даты, а руководитель получает уведомление в мессенджере и согласовывает заявку. Кадрам не нужно повторно проверять и вводить данные вручную.',
  risks:'1. Нарушение сроков выплаты отпускных: финансовые и репутационные риски.\n2. Временные затраты участников и замедление процесса.\n3. Ошибки ручного ввода.\n4. Кадровые «дыры» и конфликты расписания.\n5. Ошибки при расчете остатков отпуска.',
  comments:'Ожидаемые дополнительные эффекты: меньше рутины, снижение риска выгорания, перераспределение времени на более сложные задачи, ускорение согласований и снижение рисков текущего процесса. Эти эффекты требуют отдельной проверки.',
};

export function parseNumber(value, integer=false) {
  if(typeof value!=='string'&&typeof value!=='number') return null;
  const raw=String(value).trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
  const number=Number(raw);
  if(!Number.isFinite(number)||number<0||number>Number.MAX_SAFE_INTEGER||(integer&&!Number.isSafeInteger(number))) return null;
  return number;
}

export function calculate(roles) {
  if(!Array.isArray(roles)||!roles.length) return {valid:false,errors:[{field:'roles',message:'Добавьте хотя бы одну роль.'}]};
  const errors=[];
  const rows=roles.map((row,index)=>{
    if(!row||typeof row.name!=='string'||!row.name.trim()) errors.push({index,field:'name',message:'Укажите название роли.'});
    const count=parseNumber(row?.count,true),before=parseNumber(row?.before),after=parseNumber(row?.after);
    if(count===null) errors.push({index,field:'count',message:'Количество сотрудников — целое число от 0.'});
    if(before===null) errors.push({index,field:'before',message:'Введите часы до автоматизации: число от 0.'});
    if(after===null) errors.push({index,field:'after',message:'Введите часы после автоматизации: число от 0.'});
    // ТЗ, Лист1: G4:G7 = E × F; I4:I7 = E × H.
    return {count,beforeTotal:count!==null&&before!==null?count*before:null,afterTotal:count!==null&&after!==null?count*after:null};
  });
  if(errors.length) return {valid:false,errors,rows};
  // ТЗ: G15 = SUM(E4:E7), H15 = SUM(G4:G7), I15 = SUM(I4:I7), J15 = H15-I15.
  const totalPeople=rows.reduce((sum,r)=>sum+r.count,0);
  const beforeTotal=rows.reduce((sum,r)=>sum+r.beforeTotal,0);
  const afterTotal=rows.reduce((sum,r)=>sum+r.afterTotal,0);
  if([totalPeople,beforeTotal,afterTotal].some(n=>!Number.isFinite(n)||n>Number.MAX_SAFE_INTEGER)) return {valid:false,errors:[{field:'roles',message:'Значения слишком велики для точного расчета. Уменьшите их.'}],rows};
  const saved=beforeTotal-afterTotal;
  return {valid:true,rows,totalPeople,beforeTotal,afterTotal,saved,percent:beforeTotal===0?null:saved/beforeTotal*100,fte:saved/ANNUAL_HOURS};
}
