// Лендинг Forecaster — общее поведение трёх страниц: язык, подсветка карточек под курсором,
// появление секций при прокрутке и ссылки на установщики с GitHub. Зависимостей нет.

/* ---------- язык ---------- */
(function(){
  var h=document.documentElement,
      ru=document.getElementById('l-ru'),
      en=document.getElementById('l-en');
  if (!ru || !en) return;
  var titles={ru:document.title, en:h.getAttribute('data-title-en')||document.title};
  function set(l){
    h.className=l==='en'?'en':'';
    ru.className=l==='en'?'':'on';
    en.className=l==='en'?'on':'';
    document.title=l==='en'?titles.en:titles.ru;
    try{ localStorage.setItem('fw_lang',l); }catch(e){}
  }
  ru.onclick=function(){ set('ru'); };
  en.onclick=function(){ set('en'); };
  var saved=null; try{ saved=localStorage.getItem('fw_lang'); }catch(e){}
  set(saved || (navigator.language && navigator.language.slice(0,2)==='ru' ? 'ru' : 'en'));
})();

/* ---------- подсветка карточки за курсором ----------
   Координаты кладём в CSS-переменные и обновляем не чаще кадра: сам градиент рисует CSS,
   JS только сообщает позицию. На тач-устройствах события просто не приходят. */
(function(){
  var cards=document.querySelectorAll('.card');
  if (!cards.length || !window.matchMedia) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var queued=false, pending=[];
  function flush(){
    queued=false;
    for (var i=0;i<pending.length;i++){
      pending[i].el.style.setProperty('--mx', pending[i].x+'px');
      pending[i].el.style.setProperty('--my', pending[i].y+'px');
    }
    pending=[];
  }
  Array.prototype.forEach.call(cards, function(card){
    card.addEventListener('mousemove', function(e){
      var r=card.getBoundingClientRect();
      pending.push({el:card, x:Math.round(e.clientX-r.left), y:Math.round(e.clientY-r.top)});
      if (!queued){ queued=true; requestAnimationFrame(flush); }
    });
  });
})();

/* ---------- появление при прокрутке ----------
   Класс .reveal ставим из JS, иначе при отключённом JS контент остался бы прозрачным. */
(function(){
  var nodes=document.querySelectorAll('section, .card');
  if (!nodes.length) return;
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  Array.prototype.forEach.call(nodes, function(n){
    n.classList.add('reveal');
    // Карточки одной сетки въезжают лесенкой, а не разом.
    var grid=n.parentNode;
    if (n.classList.contains('card') && grid && grid.classList.contains('grid')){
      var idx=Array.prototype.indexOf.call(grid.children, n);
      n.style.setProperty('--d', Math.min(idx,5)*70+'ms');
    }
  });
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, {rootMargin:'0px 0px -8% 0px', threshold:.08});
  Array.prototype.forEach.call(nodes, function(n){ io.observe(n); });
  // Что уже в первом экране — показываем сразу, без ожидания скролла.
  requestAnimationFrame(function(){
    Array.prototype.forEach.call(nodes, function(n){
      if (n.getBoundingClientRect().top < window.innerHeight) n.classList.add('in');
    });
  });
  // Страховка: если наблюдатель почему-то не сработал (нестандартный браузер, печать,
  // скриншот без прокрутки), через пару секунд показываем всё — контент важнее анимации.
  setTimeout(function(){
    Array.prototype.forEach.call(nodes, function(n){ n.classList.add('in'); });
  }, 2000);
})();

/* ---------- ссылки на установщики ----------
   Не зашиваем в страницу: берём последний выпуск с файлами и раскладываем по расширениям,
   тогда новый релиз не требует правки лендинга. */
(function(){
  if (!document.getElementById('dl-forecaster')) return;

  // Двуязычная надпись — теми же атрибутами, что и вся страница, иначе сгенерированный
  // текст не переключался бы по клику RU/EN.
  function bi(node, ru, en){
    var r=document.createElement('span'); r.setAttribute('data-ru',''); r.textContent=ru;
    var e=document.createElement('span'); e.setAttribute('data-en',''); e.textContent=en;
    node.appendChild(r); node.appendChild(e); return node;
  }
  function fallback(box, repo){
    var a=document.createElement('a');
    a.className='btn ghost'; a.href='https://github.com/VIZ-Blockchain/'+repo+'/releases';
    box.appendChild(bi(a,'Выпуски на GitHub','Releases on GitHub'));
  }
  function fill(repo, rootId){
    var root=document.getElementById(rootId);
    if (!root) return;
    var boxes=root.querySelectorAll('.dl');
    // Берём СПИСОК выпусков, а не /releases/latest: последний отдаёт только стабильные,
    // и предварительные сборки (pre-release) на странице бы не появились.
    fetch('https://api.github.com/repos/VIZ-Blockchain/'+repo+'/releases?per_page=10')
      .then(function(r){ return r.ok?r.json():Promise.reject(r.status); })
      .then(function(list){
        var rel=null;
        for (var i=0;i<list.length && !rel;i++){
          if (list[i].draft) continue;
          if ((list[i].assets||[]).length) rel=list[i];
        }
        if (!rel) return Promise.reject('no assets');
        var assets=rel.assets||[], any=false;
        for (var b=0;b<boxes.length;b++){
          var box=boxes[b], exts=box.getAttribute('data-ext').split(','), found=[];
          for (var e=0;e<exts.length;e++){
            for (var k=0;k<assets.length;k++){
              if (assets[k].name.toLowerCase().slice(-(exts[e].length+1))==='.'+exts[e].toLowerCase())
                found.push(assets[k]);
            }
          }
          if (!found.length){ fallback(box, repo); continue; }
          any=true;
          for (var f=0;f<found.length;f++){
            var a=document.createElement('a');
            a.className='btn '+(f?'ghost':'main');
            a.href=found[f].browser_download_url;
            a.appendChild(document.createTextNode(found[f].name+' '));
            var sz=document.createElement('span');
            sz.className='sz'; sz.textContent=Math.round(found[f].size/1048576)+' MB';
            a.appendChild(sz);
            box.appendChild(a);
          }
        }
        if (any){
          var n=document.createElement('p');
          n.className='note';
          var pre=rel.prerelease?' — предварительная сборка':'';
          var preEn=rel.prerelease?' — pre-release':'';
          bi(n,'Текущий выпуск: '+rel.tag_name+pre,'Current release: '+rel.tag_name+preEn);
          root.parentNode.insertBefore(n, root.nextSibling);
        }
      })
      .catch(function(){
        for (var i=0;i<boxes.length;i++) fallback(boxes[i], repo);
      });
  }
  fill('Forecaster-client','dl-forecaster');
  fill('WebVIZWallet','dl-wallet');
})();
