import {QUESTIONS,assessReadiness} from './readiness-model.js';

export function initializeReadiness(onRestart) {
  const form=document.getElementById('readiness-form');
  const questions=document.getElementById('quiz-questions');
  const result=document.getElementById('quiz-result');
  const calculator=document.getElementById('calculation-sections');
  const methodLink=document.querySelector('.method-link');
  let unlocked=false;
  const gate=(visible,enabled)=>{
    unlocked=enabled;calculator.hidden=!visible;calculator.inert=!enabled;
    calculator.classList.toggle('is-locked',!enabled);
    calculator.setAttribute('aria-disabled',String(!enabled));methodLink.hidden=!enabled;
  };
  const clearResult=()=>{result.hidden=true;gate(false,false);};
  QUESTIONS.forEach((question,i)=>{
    const group=document.createElement('fieldset');group.className='quiz-question';group.id=`question-${i+1}`;
    const legend=document.createElement('legend');legend.textContent=`Вопрос ${i+1}. ${question.title}`;group.append(legend);
    question.options.forEach(([label],j)=>{
      const option=document.createElement('label');option.className='quiz-option';
      const radio=document.createElement('input');radio.type='radio';radio.name=`question-${i+1}`;radio.value=String(j);radio.required=true;radio.id=`answer-${i+1}-${j}`;
      const text=document.createElement('span');text.textContent=label;option.append(radio,text);group.append(option);
    });
    const error=document.createElement('p');error.id=`question-error-${i+1}`;error.className='question-error';error.textContent='Ответьте на этот вопрос';error.hidden=true;group.append(error);questions.append(group);
  });
  const groups=[...questions.querySelectorAll('fieldset')];
  const markMissing=(group,missing)=>{
    group.classList.toggle('unanswered',missing);const error=group.querySelector('.question-error');error.hidden=!missing;
    group.querySelectorAll('input').forEach(input=>{
      if(missing){input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',error.id);}
      else{input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');}
    });
  };
  const messages={
    prepare:['Ваш процесс пока не готов к ИИ-автоматизации.','Процесс либо нестабилен, либо критически важен, либо данные еще не оцифрованы, внедрение ИИ прямо сейчас приведет к лишним расходам и ошибкам.','Сначала наведите порядок в регламентах и соберите данные в единую цифровую базу'],
    pilot:['Есть потенциал к ИИ-автоматизации, но он со звездочкой: тут нужна доработка.','Процесс содержит рутину, но некоторые параметры (качество данных или цена ошибки) повышают риски, поэтому рекомендации такие: начать с узкого пилотного проекта, где результаты ИИ обязательно проверяет человек'],
    ready:['На основе ваших ответов ваш процесс – идеальный кандидат для ИИ-автоматизации.','Ваш процесс отлажен, отнимает много времени, опирается на цифровые данные и допускает небольшую погрешность. Вы можете запускать автоматизацию в первую очередь – инвестиции окупятся быстрее всего']
  };
  form.addEventListener('submit',event=>{
    event.preventDefault();const answers=groups.map(group=>{const selected=group.querySelector('input:checked');return selected?Number(selected.value):null;});
    const missing=groups.filter((group,i)=>{markMissing(group,answers[i]===null);return answers[i]===null;});
    const hint=document.getElementById('quiz-error');hint.hidden=missing.length===0;
    if(missing.length){clearResult();hint.textContent='Ответьте на все вопросы';missing[0].querySelector('input').focus();missing[0].scrollIntoView({block:'center',behavior:'auto'});return;}
    const assessment=assessReadiness(answers);if(!assessment)return;
    const [title,...paragraphs]=messages[assessment.tier];document.getElementById('quiz-result-title').textContent=title;
    document.getElementById('quiz-result-copy').replaceChildren(...paragraphs.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
    document.getElementById('preparation-plan').hidden=assessment.unlocked;
    document.getElementById('positive-actions').hidden=!assessment.unlocked;
    document.getElementById('readiness-score').textContent=assessment.unlocked?'':String(assessment.score);
    result.dataset.tier=assessment.tier;result.hidden=false;gate(true,assessment.unlocked);
    result.focus();result.scrollIntoView({block:'start',behavior:'auto'});
  });
  form.addEventListener('change',event=>{
    if(event.target.type!=='radio')return;
    markMissing(event.target.closest('fieldset'),false);document.getElementById('quiz-error').hidden=!groups.some(group=>group.classList.contains('unanswered'));
    clearResult();
  });
  document.querySelectorAll('[data-restart-quiz]').forEach(button=>button.addEventListener('click',()=>{
    form.reset();groups.forEach(group=>markMissing(group,false));document.getElementById('quiz-error').hidden=true;clearResult();onRestart();
    document.querySelector('.process-details').open=false;groups[0].querySelector('input').focus();document.getElementById('readiness-heading').scrollIntoView({block:'start',behavior:'auto'});
  }));
  gate(false,false);
  return ()=>unlocked;
}
