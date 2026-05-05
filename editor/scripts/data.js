;(function () {
  'use strict';

  var ns = window.CardEditor = window.CardEditor || {};
  var ATTRS = ['class_name', 'epithet'];

  var PINYIN_TABLE = {
    "包": "bao",
    "备": "bei",
    "被": "bei",
    "本": "ben",
    "标": "biao",
    "濒": "bin",
    "不": "bu",
    "成": "cheng",
    "出": "chu",
    "此": "ci",
    "次": "ci",
    "存": "cun",
    "大": "da",
    "当": "dang",
    "的": "de",
    "等": "deng",
    "点": "dian",
    "定": "ding",
    "动": "dong",
    "度": "du",
    "段": "duan",
    "对": "dui",
    "多": "duo",
    "发": "fa",
    "范": "fan",
    "否": "fou",
    "复": "fu",
    "改": "gai",
    "各": "ge",
    "果": "guo",
    "害": "hai",
    "含": "han",
    "合": "he",
    "和": "he",
    "后": "hou",
    "回": "hui",
    "活": "huo",
    "或": "huo",
    "机": "ji",
    "技": "ji",
    "加": "jia",
    "角": "jiao",
    "阶": "jie",
    "结": "jie",
    "锦": "jin",
    "距": "ju",
    "君": "jun",
    "开": "kai",
    "可": "ke",
    "来": "lai",
    "离": "li",
    "力": "li",
    "量": "liang",
    "令": "ling",
    "名": "ming",
    "摸": "mo",
    "目": "mu",
    "囊": "nang",
    "内": "nei",
    "能": "neng",
    "你": "ni",
    "牌": "pai",
    "拼": "pin",
    "普": "pu",
    "其": "qi",
    "弃": "qi",
    "区": "qu",
    "去": "qu",
    "任": "ren",
    "如": "ru",
    "入": "ru",
    "若": "ruo",
    "色": "se",
    "杀": "sha",
    "伤": "shang",
    "上": "shang",
    "少": "shao",
    "生": "sheng",
    "胜": "sheng",
    "失": "shi",
    "时": "shi",
    "使": "shi",
    "始": "shi",
    "手": "shou",
    "受": "shou",
    "束": "shu",
    "数": "shu",
    "死": "si",
    "素": "su",
    "所": "suo",
    "锁": "suo",
    "他": "ta",
    "体": "ti",
    "同": "tong",
    "亡": "wang",
    "围": "wei",
    "唯": "wei",
    "为": "wei",
    "限": "xian",
    "陷": "xian",
    "小": "xiao",
    "效": "xiao",
    "选": "xuan",
    "一": "yi",
    "已": "yi",
    "意": "yi",
    "阴": "yin",
    "用": "yong",
    "有": "you",
    "于": "yu",
    "与": "yu",
    "域": "yu",
    "元": "yuan",
    "源": "yuan",
    "在": "zai",
    "造": "zao",
    "则": "ze",
    "择": "ze",
    "增": "zeng",
    "张": "zhang",
    "者": "zhe",
    "值": "zhi",
    "至": "zhi",
    "制": "zhi",
    "置": "zhi",
    "众": "zhong",
    "主": "zhu",
    "装": "zhuang",
    "最": "zui",
    "作": "zuo",
    "做": "zuo"
  };

  var COMPRESSED_ELEMENTS = {
    '(……)': ["<c name='()作用域'><c name='('></c>", "<c name=')'></c></c>"],
    '限一次': [["<c name='限次作用域'><c name='限'></c>一<c name='次'></c></c>"], ["<c name='次数限制' class='irreplaceable'><c name='限一次'></c></c>"]],
    '(时段限制)': ["<c name='时段限制/时段' class='irreplaceable'>", '</c>'],
    '(时段限制)，': ["<c name='(时段限制)'>", '</c>，'],
    '(时段限制)限一次': ["<c name='(时段限制)'>", "</c><c name='限一次' type=1></c>"],
    '(时段限制)限一次，': ["<c name='(时段限制)限一次'>", '</c>，'],
    '(时机限制)': ["<c name='时机限制' class='irreplaceable'>", '</c>'],
    '(时机限制)，': ["<c name='(时机限制)'>", '</c>，'],
    '技能元素': ['<characterSkillElement></characterSkillElement>'],
    '〖……〗': ["<c name='〖〗作用域'><c name='〖'></c>", "<c name='〗'></c></c>"],
    '〖技能名〗': ["<c name='〖……〗'><c name='技能元素'></c></c>"],
    '【……】': ["<c name='【】作用域'><c name='【'></c>", "<c name='】'></c></c>"],
    '【杀】': ["<c name='【……】'><c name='杀'></c></c>"],
    '【普度众生】': ["<c name='【……】'><c name='普度众生'></c></c>"],
    '【杀】的次数限制': ["<c name='【杀】'></c>的<c name='次数限制'></c>"],
    '阴锦囊牌': ["<c name='阴'></c><c name='锦囊牌'></c>"],
    '目标不包含你的锦囊牌': ["<c name='目标不包含你'></c>的<c name='锦囊牌'></c>"],
    '目标包含其他角色的锦囊牌': ["<c name='目标包含其他角色'></c>的<c name='锦囊牌'></c>"],
    '小于……': ["<c name='小于作用域'><c name='小于'></c>", '</c>'],
    '大于……': ["<c name='大于作用域'><c name='大于'></c>", '</c>'],
    '少于……': ["<c name='少于作用域'><c name='少于'></c>", '</c>'],
    '多于……': ["<c name='多于作用域'><c name='多于'></c>", '</c>'],
    '最小……': ["<c name='最小作用域'><c name='最小'></c>", '</c>'],
    '最大……': ["<c name='最大作用域'><c name='最大'></c>", '</c>'],
    '最少……': ["<c name='最少作用域'><c name='最少'></c>", '</c>'],
    '最多……': ["<c name='最多作用域'><c name='最多'></c>", '</c>'],
    '唯一最小……': ["<c name='唯一最小作用域'><c name='唯一最小'></c>", '</c>'],
    '唯一最大……': ["<c name='唯一最大作用域'><c name='唯一最大'></c>", '</c>'],
    '唯一最少……': ["<c name='唯一最少作用域'><c name='唯一最少'></c>", '</c>'],
    '唯一最多……': ["<c name='唯一最多作用域'><c name='唯一最多'></c>", '</c>'],
    '本……': ["<c name='本作用域'><c name='本'></c>", '</c>'],
    '本回合': ["<c name='本……'><c name='回合/回合时段'></c></c>"],
    '此……': ["<c name='此作用域'><c name='此'></c>", '</c>'],
    '令……': ["<c name='令作用域'><c name='令'></c>", '</c>'],
    '各……': ["<c name='各作用域'><c name='各'></c>", '</c>'],
    '可……': ["<c name='可作用域'><c name='可'></c>", '</c>'],
    '各可……': ["<c name='各……'><c name='可……'></c>", '</c>'],
    '你可……': ["<c name='你'></c><c name='可……'>", '</c>'],
    '当……': [["<c name='当作用域'><c name='当'></c>", '</c>'], ["<c name='时机限制' class='irreplaceable'><c name='当……'>", '</c></c>']],
    '当你……，': ["<c name='当……' type=1><c name='你'></c>", '</c>，'],
    '当一名角色……，': ["<c name='当……' type=1><c name='一名角色'></c>", '</c>，'],
    '等同于……': ["<c name='等同于作用域'><c name='等同于'></c>", '</c>'],
    '……数': ["<c name='数作用域'>", "<c name='数'></c></c>"],
    '其他角色数': ["<c name='……数'><c name='其他角色'></c></c>"],
    '若……': ["<c name='若作用域'><c name='若'></c>", '</c>'],
    '若你……': ["<c name='若……'><c name='你'></c>", '</c>'],
    '若此阶段……': ["<c name='若……'><c name='此阶段'></c>", '</c>'],
    '否则……': ["<c name='否则作用域'><c name='否则'></c>", '</c>'],
    '包含……': ["<c name='包含作用域'><c name='包含'></c>", '</c>'],
    '包含你': ["<c name='包含……'><c name='你'></c></c>"],
    '包含其他角色': ["<c name='包含……'><c name='其他角色'></c></c>"],
    '目标不包含你': ["<c name='目标-使用'></c>不<c name='包含你'></c>"],
    '目标包含其他角色': ["<c name='目标-使用'></c><c name='包含其他角色'></c>"],
    '此阶段': ["此<c name='阶段'></c>"],
    '已失去体力值': ["<c name='已失去体力/已失去体力值/·' epithet='1'></c>"],
    '你已失去体力值': ["<c name='你'></c><c name='已失去体力值'></c>"],
    '其他角色数与你已失去体力值和': ["<c name='和作用域'><c name='加数' class='irreplaceable'><c name='其他角色数'></c></c><c name='与'></c><c name='加数' class='irreplaceable'><c name='你已失去体力值'></c></c><c name='和'></c></c>"],
    '你的': ["<c name='你'></c>的"],
    '一名角色': ["一名<c name='角色·存活角色'></c>"],
    '所有角色': ["所有<c name='角色·存活角色'></c>"],
    '受伤角色数': ["<c name='……数'><c name='受伤'></c><c name='角色·存活角色'></c></c></c>"],
    '一张': [['一张'], ["<c name='目标数限制' class='irreplaceable'>一张</c>"]],
    '一名': [['一名'], ["<c name='目标数限制' class='irreplaceable'>一名</c>"]],
    '任意名': ["<c name='目标数限制' class='irreplaceable'><c name='任意'></c>名</c>"],
    '范围内-在范围内': ["<c name='在范围内作用域'><c name='范围内'></c></c>"],
    '范围内-距离限制': ["<c name='距离限制' class='irreplaceable'><c name='范围内-在范围内'></c></c>"],
    '其他角色-目标限制': ["<c name='目标限制' class='irreplaceable'><c name='其他角色'></c></c>"],
    '一张(目标限制)': ["<c name='一张' type=1></c><c name='目标限制' class='irreplaceable'>", '</c>'],
    '一张牌-选择目标': ["<c name='一张(目标限制)'><c name='牌·手牌或装备区内的牌'></c></c>"],
    '一张阴锦囊牌-选择目标': ["<c name='一张(目标限制)'><c name='阴锦囊牌'></c></c>"],
    '任意名角色-选择': [["<c name='任意名'></c><c name='角色·存活角色'></c>"], ["<c name='选择作用域'><c name='任意名角色-选择'></c></c>"]],
    '任意名其他角色-选择': [["<c name='任意名'></c><c name='其他角色-目标限制'></c>"], ["<c name='选择作用域'><c name='任意名其他角色-选择'></c></c>"]],
    '增加一点手牌上限': ["增加一点<c name='手牌上限'></c>"],
    '效果-生效': ["<c name='生效作用域'><c name='效果·生效'></c></c>"],
    '发动(技能)': [["<c name='发动'></c><c name='被发动技能' class='irreplaceable'>", '</c>'], ["<c name='发动作用域'><c name='发动(技能)'>", '</c></c>']],
    '发动〖技能名〗': [["<c name='发动'></c><c name='〖技能名〗'></c>"], ["<c name='发动作用域'><c name='发动〖技能名〗'></c></c>"]],
    '弃置(被弃牌)': [["<c name='弃置'></c><c name='被弃牌' class='irreplaceable'>", '</c>'], ["<c name='弃置作用域' class='irreplaceable'><c name='弃置(被弃牌)'>", '</c></c>']],
    '弃置所有手牌': [["<c name='弃置(被弃牌)'>所有<c name='手牌'></c></c>"], ["<c name='弃置作用域' class='irreplaceable'><c name='弃置所有手牌'></c></c>"]],
    '弃置(选择)': [["<c name='弃置(被弃牌)'><c name='选择作用域'>", '</c></c>'], ["<c name='弃置作用域' class='irreplaceable'><c name='弃置(选择)'>", '</c></c>']],
    '弃置一张阴锦囊牌': [["<c name='弃置(选择)'><c name='一张阴锦囊牌-选择目标'></c></c>"], ["<c name='弃置作用域' class='irreplaceable'><c name='弃置一张阴锦囊牌'></c></c>"]],
    '摸……牌': ["<c name='摸'></c>", "<c name='牌·摸牌'></c>"],
    '摸(摸牌数)张牌': [["<c name='摸……牌'><c name='摸牌数' class='irreplaceable'>", '张</c></c>'], ["<c name='摸牌作用域'><c name='摸(摸牌数)张牌'></c></c>"]],
    '摸x(x为……)张牌': [["<c name='摸(摸牌数)张牌'><c name='x(x为……)'>", '</c></c>'], ["<c name='摸牌作用域'><c name='摸x(x为……)张牌'></c></c>"]],
    '摸一张牌': [["<c name='摸(摸牌数)张牌'>一</c>"], ["<c name='摸牌作用域'><c name='摸一张牌'></c></c>"]],
    '摸等量牌': [["<c name='摸……牌'><c name='摸牌数' class='irreplaceable'>等量</c></c>"], ["<c name='摸牌作用域'><c name='摸等量牌'></c></c>"]],
    '你摸一张牌': ["<c name='摸牌作用域'><c name='摸牌者' class='irreplaceable'><you></you></c><c name='摸一张牌'></c></c>"],
    '目标-使用': ["<c name='使用作用域'><c name='目标·使用'></c></c>"],
    '(被使用牌)-使用': ["<c name='使用作用域'><c name='被使用牌' class='irreplaceable'>", '</c></c>'],
    '你-使用者': ["<c name='使用者' class='irreplaceable'><c name='你'></c></c>"],
    '使用(被使用牌)': ["<c name='使用'></c><c name='被使用牌' class='irreplaceable'>", '</c>'],
    '你使用(被使用牌)': ["<c name='使用作用域'><c name='你-使用者'></c><c name='使用(被使用牌)'>", '</c></c>'],
    '使用(选择)': ["<c name='使用(被使用牌)'><c name='选择作用域'>", '</c></c>'],
    '你使用(选择)': ["<c name='使用作用域'><c name='使用者' class='irreplaceable'><c name='你'></c></c><c name='使用(选择)'>", '</c></c>'],
    '使用一张(目标限制)': ["<c name='使用(选择)'><c name='一张' type=1></c><c name='目标限制' class='irreplaceable'>", '</c></c>'],
    '使用一张手牌': [["<c name='使用一张(目标限制)'><c name='手牌'></c></c>"], ["<c name='使用作用域'><c name='使用一张手牌'></c></c>"]],
    '你使用一张手牌': ["<c name='使用作用域'><c name='使用者' class='irreplaceable'><c name='你'></c></c><c name='使用一张手牌'></c></c>"],
    '使用一张拼点牌': ["<c name='使用作用域'><c name='使用一张(目标限制)'><c name='拼点牌'></c></c></c>"],
    '各可使用一张拼点牌': ["<c name='各可……'><c name='使用一张拼点牌' type=1></c></c>"],
    '对(目标)使用': ["<c name='对'></c><c name='目标·使用' class='irreplaceable'>", '</c><c name=\'使用\'></c>'],
    '对所有角色使用。': ["<c name='使用作用域'><c name='对(目标)使用'><c name='所有角色'></c></c></c>。"],
    '对(选择)使用': ["<c name='对(目标)使用'><c name='选择作用域'>", '</c></c>'],
    '对一名……使用': ["<c name='对(选择)使用'><c name='一名' type=1></c>", '</c>'],
    '对一名范围内的……使用': ["<c name='对一名……使用'><c name='范围内-距离限制'></c>的", '</c>'],
    '对一名范围内的其他角色使用。': ["<c name='使用作用域'><c name='对一名范围内的……使用'><c name='其他角色-目标限制'></c></c></c>。"],
    '使用(被使用牌)时': [["<c name='使用'></c><c name='(被使用牌)-使用'>", '</c><c name=\'时\'></c>'], ["<c name='使用时作用域'><c name='使用(被使用牌)时'>", '</c></c>']],
    '当你使用(被使用牌)时，': ["<c name='当你……，'><c name='使用(被使用牌)时' type=1>", '</c></c>'],
    '与(目标)拼点': [["<c name='与'></c><c name='目标·拼点' class='irreplaceable'>", '</c><c name=\'拼点\'></c>'], ["<c name='拼点作用域'><c name='与(目标)拼点'>", '</c></c>']],
    '你可与(目标)拼点': ["<c name='你可……'><c name='与(目标)拼点' type=1>", '</c></c>'],
    '回复一点': ["<c name='回复'></c><c name='回复值' class='irreplaceable'>一点</c>"],
    '回复(回复值)点体力': ["<c name='回复'></c><c name='回复值' class='irreplaceable'>", "点</c><c name='体力/体力值/○'></c>"],
    '回复一点体力': [["<c name='回复(回复值)点体力'>一</c>"], ["<c name='回复作用域'><c name='回复一点体力'></c></c>"]],
    '回复一点体力或体力上限': [["<c name='回复一点'></c><c name='或作用域'><c name='体力/体力值/○'></c><c name='或'></c><c name='体力上限'></c></c>"], ["<c name='回复作用域'><c name='回复一点体力或体力上限'></c></c>"]],
    '各回复一点体力': [["<c name='各……'><c name='回复一点体力' type=1></c></c>"]],
    '目标回复一点体力。-使用': [["<c name='回复作用域'><c name='回复者' class='irreplaceable'><c name='目标-使用'></c></c><c name='回复一点体力'></c></c></c>。"]],
    '对(受伤者)造成一点伤害': ["<c name='对'></c><c name='受伤者' class='irreplaceable'>", "</c><c name='造成'></c><c name='伤害值' class='irreplaceable'>一点</c><c name='伤害'></c>"],
    '你对目标造成一点伤害。-使用': ["<c name='伤害作用域'><c name='来源·伤害' class='irreplaceable'><c name='你'></c></c><c name='对(受伤者)造成一点伤害'><c name='目标-使用'></c></c></c>。"],
    '不': ['不'],
    '等量': ['等量'],
    '所有': ['所有'],
    '的': ['的'],
    '名': ['名'],
    '张': ['张'],
    '若如此做，': ['若如此做，'],
    '否则，': ["<c name='否则'></c>，"],
    '至多为': ['至多为'],
    '+': ['+'],
    '，': ['，'],
    '。': ['。'],
    'x(x为……)': ["x<c name='(……)'>x为", '</c>'],
    '锁定技，': ["<c name='锁定技'></c>，"],
    '君主技，': ["<c name='君主技/*'></c>，"],
    '摸牌阶段，': ["<c name='(时段限制)，'><c name='摸牌阶段'></c></c>"],
    '摸牌阶段，你可改为……': ["<c name='摸牌阶段，'></c><c name='你可……'><c name='改为'></c>", '</c>'],
    '出牌阶段限一次，': ["<c name='(时段限制)限一次，'><c name='出牌阶段'></c></c>"],
    '出牌阶段开始时，': ["<c name='(时机限制)，'><c name='出牌阶段开始时'></c></c>"],
    '出牌阶段结束时，': ["<c name='(时机限制)，'><c name='出牌阶段结束时'></c></c>"],
    '你可与任意名角色拼点，': ["<c name='你可……'><c name='与(目标)拼点' type=1><c name='任意名角色-选择'></c></c></c>，"],
    '若你胜，': ["<c name='若你……'><c name='胜'></c></c>，"],
    '当一名角色陷入濒死时，': ["<c name='当一名角色……，'><c name='陷入濒死时'></c></c>"],
    '当一名角色死亡时，': ["<c name='当一名角色……，'><c name='死亡时'></c></c>"],
    '当一名角色死亡后，': ["<c name='当一名角色……，'><c name='死亡后'></c></c>"]
  };

  function t(key, params) {
    return window.t ? window.t(key, params) : key;
  }

  function fetchList(url) {
    if (!url) return Promise.resolve([]);
    var cached = window.fetchJsonCached || function (path) {
      return fetch(path).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      });
    };
    return cached(url).catch(function () { return []; });
  }

  function isVariantValue(value) {
    return Array.isArray(value) && Array.isArray(value[0]);
  }

  function normalizeVariants(value) {
    if (!Array.isArray(value)) return [[String(value || '')]];
    return isVariantValue(value) ? value : [value];
  }

  function getVariant(value, index) {
    var variants = normalizeVariants(value);
    var selected = variants[Math.max(0, Math.min(index || 0, variants.length - 1))] || variants[0] || [''];
    return [String(selected[0] || ''), String(selected.length > 1 ? selected[1] || '' : '')];
  }

  function stripTags(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || '').trim();
  }

  function mergeInheritedAttributes(openHtml, cNode) {
    if (!/>\s*$/.test(openHtml || '')) return openHtml;
    var className = (cNode.getAttribute('class') || '').trim();
    var epithet = (cNode.getAttribute('epithet') || '').trim();
    var insertion = '';
    if (className) insertion += ' class="' + escapeAttr(className) + '"';
    if (epithet) insertion += ' epithet="' + escapeAttr(epithet) + '"';
    if (!insertion) return openHtml;
    return openHtml.replace(/>\s*$/, insertion + '>');
  }

  function expandShortcutHtml(html, defaultElements) {
    var holder = document.createElement('template');
    holder.innerHTML = html || '';

    for (var guard = 0; guard < 1200; guard++) {
      var cNode = holder.content.querySelector('c[name]');
      if (!cNode) break;
      var name = cNode.getAttribute('name') || '';
      var value = defaultElements && defaultElements[name];
      if (!value) {
        var fallback = document.createTextNode(cNode.textContent || '');
        cNode.replaceWith(fallback);
        continue;
      }
      var variantIndex = Number(cNode.getAttribute('type') || 0);
      if (!Number.isFinite(variantIndex)) variantIndex = 0;
      var pair = getVariant(value, variantIndex);
      var openHtml = mergeInheritedAttributes(pair[0], cNode);
      var wrapper = document.createElement('template');
      wrapper.innerHTML = openHtml + cNode.innerHTML + pair[1];
      cNode.replaceWith(wrapper.content.cloneNode(true));
    }

    return Array.from(holder.content.childNodes).map(function (node) {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
      if (node.outerHTML != null) return node.outerHTML;
      var div = document.createElement('div');
      div.appendChild(node.cloneNode(true));
      return div.innerHTML;
    }).join('');
  }

  function transformToBottomElements(dataList, sourceType) {
    var result = {};
    if (!Array.isArray(dataList)) return result;
    dataList.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var en = item.en || '';
      var cn = item.cn || '';
      if (cn) result[cn] = ['<' + en + '>', '</' + en + '>'];

      if (Array.isArray(item.part) && item.part.length) {
        var parts = sourceType === 'dynamic' ? item.part.slice(0, 1) : item.part;
        parts.forEach(function (sub) {
          if (!sub || typeof sub !== 'object') return;
          if (sub.cn) result[sub.cn] = ['<' + (sub.en || '') + '>', '</' + (sub.en || '') + '>'];
        });
      }

      if (Array.isArray(item.epithet) && item.epithet.length) {
        var text = item.epithet.map(function (ep) { return ep && ep.cn; }).filter(Boolean).join('/');
        if (text) result[text] = ['<' + en + '>', '</' + en + '>'];
      }

      if (!cn && en && !result[en]) result[en] = ['<' + en + '>', '</' + en + '>'];
    });
    return result;
  }

  function transformToChineseMap(dataList, sourceType) {
    var result = {};
    if (!Array.isArray(dataList)) return result;
    dataList.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var en = String(item.en || '').toLowerCase();
      var cn = item.cn || '';
      var color = item.color || '';
      if (!en) return;

      if (Array.isArray(item.part) && item.part.length) {
        if (cn) result[en] = { label: cn, color: color, py: item.py || '', abbr: item.pyAbbr || '' };
        var parts = sourceType === 'dynamic' ? item.part.slice(0, 1) : item.part;
        parts.forEach(function (sub) {
          if (!sub || typeof sub !== 'object') return;
          var partEn = String(sub.en || '').toLowerCase();
          var partCn = sub.cn || '';
          if (!partEn || !partCn) return;
          result[partEn] = {
            label: partCn,
            color: sub.termedPart ? String(color || '') + '60' : color,
            py: item.py || '',
            abbr: item.pyAbbr || ''
          };
        });
      } else if (Array.isArray(item.epithet) && item.epithet.length) {
        var epithetText = cn || item.epithet.map(function (ep) { return ep && ep.cn; }).filter(Boolean).join('/');
        result[en] = { label: epithetText, color: color, py: item.py || '', abbr: item.pyAbbr || '' };
      } else {
        result[en] = { label: cn, color: color, py: item.py || '', abbr: item.pyAbbr || '' };
      }
    });
    return result;
  }

  function makeEntry(key, value, chineseMap, source) {
    var variants = normalizeVariants(value);
    var html = variants.map(function (pair) { return String(pair[0] || '') + String(pair[1] || ''); }).join(' ');
    var plain = stripTags(html);
    var meta = (chineseMap[String(key).toLowerCase()] || {});
    return {
      key: key,
      value: value,
      source: source,
      hasVariant: variants.length > 1,
      searchText: [key, html, plain, meta.py || '', meta.abbr || '', pinyinSearchText(key + ' ' + plain)].join(' ').toLowerCase()
    };
  }

  function pinyinSearchText(text) {
    var full = [];
    var compact = [];
    var abbr = [];
    String(text || '').split('').forEach(function (ch) {
      var py = PINYIN_TABLE[ch];
      if (py) {
        full.push(py);
        compact.push(py);
        abbr.push(py.charAt(0));
      } else if (/^[a-z0-9]$/i.test(ch)) {
        var lower = ch.toLowerCase();
        full.push(lower);
        compact.push(lower);
        abbr.push(lower);
      }
    });
    return [full.join(' '), compact.join(''), abbr.join('')].join(' ');
  }

  async function loadElementData() {
    var fixed = [];
    var dynamic = [];
    var cards = [];
    var skills = [];
    if (window.endpoints) {
      var data = await Promise.all([
        fetchList(window.endpoints.termFixed && window.endpoints.termFixed()),
        fetchList(window.endpoints.termDynamic && window.endpoints.termDynamic()),
        fetchList(window.endpoints.card && window.endpoints.card()),
        fetchList(window.endpoints.skill && window.endpoints.skill())
      ]);
      fixed = data[0] || [];
      dynamic = data[1] || [];
      cards = data[2] || [];
      skills = data[3] || [];
    }

    var bottomElements = Object.assign(
      {},
      transformToBottomElements(fixed, 'fixed'),
      transformToBottomElements(dynamic, 'dynamic'),
      transformToBottomElements(cards, 'card')
    );
    var defaultElements = Object.assign({}, bottomElements, COMPRESSED_ELEMENTS);
    var chineseMap = Object.assign(
      {},
      transformToChineseMap(fixed, 'fixed'),
      transformToChineseMap(dynamic, 'dynamic'),
      transformToChineseMap(cards, 'card')
    );

    var keys = Object.keys(defaultElements).sort(function (a, b) {
      return a.length === b.length ? a.localeCompare(b, 'zh-Hans-CN') : a.length - b.length;
    });
    var entries = keys.map(function (key) {
      return makeEntry(key, defaultElements[key], chineseMap, Object.prototype.hasOwnProperty.call(COMPRESSED_ELEMENTS, key) ? 'snippet' : 'token');
    });

    var relationCorpus = [];
    if (Array.isArray(skills)) {
      skills.forEach(function (skill) {
        if (skill && skill.content) relationCorpus.push(String(skill.content));
      });
    }

    return { entries: entries, defaultElements: defaultElements, chineseMap: chineseMap, relationCorpus: relationCorpus };
  }

  function makeId() {
    return 'ed_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function displayNameForTag(tag, chineseMap) {
    var meta = chineseMap && chineseMap[String(tag || '').toLowerCase()];
    return (meta && meta.label) || tag || '';
  }

  function nodeFromDom(domNode, chineseMap) {
    if (domNode.nodeType === Node.TEXT_NODE) {
      return { id: makeId(), element: false, text: domNode.nodeValue || '', tag: domNode.nodeValue || '', attrs: {}, children: [] };
    }
    if (domNode.nodeType !== Node.ELEMENT_NODE) return null;
    var tag = String(domNode.tagName || '').toLowerCase();
    var attrs = {};
    ATTRS.forEach(function (attr) {
      var domAttr = attr === 'class_name' ? 'class' : attr;
      attrs[attr] = domNode.getAttribute(domAttr) || '';
    });
    var children = Array.from(domNode.childNodes).map(function (child) {
      return nodeFromDom(child, chineseMap);
    }).filter(Boolean);
    return {
      id: makeId(),
      element: true,
      text: displayNameForTag(tag, chineseMap),
      tag: tag,
      attrs: attrs,
      children: children,
      expanded: true
    };
  }

  function parseHtmlToNodes(html, defaultElements, chineseMap) {
    var expanded = expandShortcutHtml(String(html || '').replace(/\\"/g, '"'), defaultElements || {});
    var template = document.createElement('template');
    template.innerHTML = expanded;
    return Array.from(template.content.childNodes).map(function (node) {
      return nodeFromDom(node, chineseMap || {});
    }).filter(Boolean);
  }

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function serializeNode(node) {
    if (!node) return '';
    if (!node.element) return node.text || '';
    var tag = node.tag || 'span';
    var attrText = ATTRS.map(function (attr) {
      var value = node.attrs && node.attrs[attr];
      if (!value) return '';
      return ' ' + (attr === 'class_name' ? 'class' : attr) + '="' + escapeAttr(value) + '"';
    }).join('');
    var inner = (node.children || []).map(serializeNode).join('');
    return '<' + tag + attrText + '>' + inner + '</' + tag + '>';
  }

  function serializeNodes(nodes, escapeQuotes) {
    var html = (nodes || []).map(serializeNode).join('');
    return escapeQuotes ? html.replace(/"/g, '\\"') : html;
  }

  function refreshLabels(nodes, chineseMap) {
    (nodes || []).forEach(function (node) {
      if (node.element) node.text = displayNameForTag(node.tag, chineseMap || {});
      refreshLabels(node.children || [], chineseMap || {});
    });
  }

  function sourceLabel(source) {
    return source === 'snippet' ? t('editor.source.snippet') : t('editor.source.token');
  }

  ns.Data = {
    ATTRS: ATTRS,
    loadElementData: loadElementData,
    parseHtmlToNodes: parseHtmlToNodes,
    serializeNodes: serializeNodes,
    expandShortcutHtml: expandShortcutHtml,
    getVariant: getVariant,
    refreshLabels: refreshLabels,
    sourceLabel: sourceLabel,
    isVariantValue: isVariantValue,
    makeId: makeId
  };
})();