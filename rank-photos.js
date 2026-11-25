(function(root){
  const hosts=new Set(['http2.mlstatic.com','m.media-amazon.com','images-na.ssl-images-amazon.com']);
  const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function source(value){
    try{
      const url=new URL(value);
      if(url.protocol!=='https:'||!hosts.has(url.hostname)||url.port||url.username||url.password)return '';
      return url.href;
    }catch{return '';}
  }

  function lookup(id,country){
    const key=country?country+'|'+id:id;
    return root.UWANT_RANK_PHOTOS?.[key]||'';
  }

  function markup(value){
    const url=source(value);
    return '<span class="rank-photo" aria-hidden="true"><span>暂无图片</span>'+
      (url?'<img data-rank-photo src="'+escape(url)+'" loading="lazy" decoding="async" alt="" referrerpolicy="no-referrer">':'')+
      '</span>';
  }

  function settle(event){
    const img=event.target;
    if(!img?.matches?.('[data-rank-photo]'))return;
    if(event.type==='load'&&img.naturalWidth>=32&&img.naturalHeight>=32)img.dataset.loaded='true';
    else img.hidden=true;
  }
  root.document.addEventListener('load',settle,true);
  root.document.addEventListener('error',settle,true);
  root.RankPhotos={source,lookup,markup};
})(window);
