;(function(){
  'use strict';

  var preload = window.AppPreload;
  if (!preload) return;

  var keyFonts = [
    { family: '康熙', url: 'source/康熙字典体.TTF', sample: '多少事 从来急' },
    { family: '隶书', url: 'source/MoeLI(隸書3.0版1080724上網).ttf', sample: '势力标题' },
    { family: '明朝', url: 'source/文悦古典明朝体.ttf', sample: '角色水印' },
    { family: '大篆', url: 'source/金文大篆体.TTF', sample: '代词' }
  ];

  preload.register('prefetch-key-fonts', function(){
    keyFonts.forEach(function(font){ preload.prefetch(font.url, 'font'); });
  }, { context: 'all', priority: 10, timeout: 2200 });

  preload.register('load-app-fonts', function(){
    return Promise.all(keyFonts.map(function(font){ return preload.loadFont(font.family, font.sample); }));
  }, { context: 'app', priority: 20, delay: 80, timeout: 2200 });

  preload.register('prefetch-static-json', function(){
    return Promise.all([
      preload.json('base/announcements.json', { cache: 'no-cache' }),
      preload.json('base/help.json'),
      preload.json('base/compression.json')
    ]);
  }, { context: 'app', priority: 30, delay: 160, timeout: 2200 });

  preload.register('decode-common-images', function(){
    return Promise.all([
      preload.decodeImage('source/三兔.png'),
      preload.decodeImage('source/朱雀.png'),
      preload.decodeImage('source/青龙.png')
    ]);
  }, { context: 'app', priority: 60, delay: 360, timeout: 2600 });

  preload.start();
})();