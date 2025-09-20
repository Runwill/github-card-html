function summonCharacters(){
    var deferred1 = $.Deferred();
    var deferred2 = $.Deferred();
    $.ajax({
        url: (endpoints && endpoints.character ? endpoints.character() : '/api/character'),
        type:"GET",
        datatype:"json",
        success:
        function (characterData){
            deferred1.resolve(characterData)
        }
    })
    const skillUrl = (endpoints && endpoints.skill ? endpoints.skill() : '/api/skill?strength=' + encodeURIComponent(localStorage.getItem('strength')));
    $.ajax({
        url: skillUrl,
        type:"GET",
        datatype:"json",
        success:
        function (skillData){
            deferred2.resolve(skillData);
        },
        error: function(){
            deferred2.resolve([]); // 失败兜底为空数组，避免整体阻塞
        }
    })
    $.when(deferred1, deferred2).done(function (characterData, skillData) {
        CharacterReplace(characterData, skillData);
    })
}
function CharacterReplace(character,skill) {
        let standardCharacters = []
        //提取武将序号的顺序数组
        let characterID = []
        for (i in character) characterID.push(parseInt(character[i].id))
        characterID.sort((a, b) => a - b)

        for (i in characterID) {
            for (j in character) {
                if (character[j].id == characterID[i]) {

                    standardCharacters += "<characterParagraph class='characterParagraph'><div class='container'><div class='role_title'>" + character[j].title + "</div>"
                    
                    // 使用 CSS mask 将黑色形状渲染为主题文字色
                    var iconPath = "source/" + character[j].position + (character[j].dominator ? "_君主" : "") + ".png";
                    standardCharacters += "<div class='role_icon" + (character[j].dominator ? " dominator" : " not_dominator") + " role_icon--mask' "
                        + "style=\"width:300px;height:300px;"
                        + "-webkit-mask-image:url('" + iconPath + "');mask-image:url('" + iconPath + "');"
                        + "-webkit-mask-size:contain;mask-size:contain;"
                        + "-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;"
                        + "-webkit-mask-position:center;mask-position:center;\"></div>"
                        + "<padding><h3>" + characterID[i] + " <characterName class=\"characterID" + characterID[i] + " scroll\"></characterName> "

                    for (let a = 0; a < character[j].health; a++)standardCharacters += "<health epithet='2' style='font-size: 1.3em;letter-spacing: -2px;'></health>"

                    standardCharacters += "</h3>"

                    //获得武将牌上技能次序
                    let skillOrder = []
                    for (k in skill) {
                        if (skill[k].role) {
                            for (l in skill[k].role) {
                                if (skill[k].role[l].id == characterID[i]) {
                                    skillOrder.push(parseInt(skill[k].role[l].skill_order))
                                }
                            }
                        }
                    }
                    skillOrder.sort((a, b) => a - b)

                    for (k in skillOrder) {
                        for (l in skill) {
                            if (skill[l].role) {
                                for (m in skill[l].role) {
                                    if (skill[l].role[m].id == characterID[i] && skill[l].role[m].skill_order == skillOrder[k]) {

                                        standardCharacters += "<div class=\"indent\"><pronounScope><skillQuote class=\"bold"
                                        
                                        //if (skill[l].role[m].dominator) standardCharacters += " glowing"

                                        standardCharacters += "\"><skillQuoteLeft></skillQuoteLeft>" + "<characterSkillElement" + " class=\"" + skill[l].name + " " + skill[l].name + "LoreCharacterID" + characterID[i] + "\"></characterSkillElement>" + "<skillQuoteRight></skillQuoteRight></skillQuote>"

                                        if (skill[l].role[m].dominator) standardCharacters += "<dominatorSkill></dominatorSkill>，"

                                        standardCharacters += skill[l].content

                                        //尾部武将名
                                        for (n in skill[l].role) {
                                            for (o in character) {
                                                if (character[o].id == skill[l].role[n].id) {
                                                    //武将名
                                                    standardCharacters += "<" + "<characterName class=\"characterID" + character[o].id + "\"></characterName>" + skill[l].role[n].skill_order
                                                    //君主技
                                                    if (skill[l].role[n].dominator) standardCharacters += "<dominatorSkill epithet=\"1\"></dominatorSkill>"
                                                    standardCharacters += ">"
                                                }
                                            }
                                        }
                                        standardCharacters += "</pronounScope></div>"
                                    }
                                }
                            }
                        }
                    }
                    standardCharacters += "</padding></div><br><br><br><br></characterParagraph>"
                }
            }
        }
        $(".standardCharactersBlock").html("<br>" + '<div class="search-container" style="z-index: 100; top: 10%;"><input type="text" id="search-input" placeholder="搜检" oninput="filterParagraphs()" autocomplete="off" style="background-color: rgba(255,255,255,1); position: relative; transition: right 1s ease, transform 0.2s ease, box-shadow 0.2s ease; transform: translateY(0) scale(1); box-shadow: 0 1px 4px rgba(0,0,0,0.08);"></div>' + '<div id="block-under-search"></div>' + standardCharacters)

        const searchContainer = document.querySelector('.search-container')
        const searchInput = document.getElementById('search-input')
        let isFocused = false
        let isShowingAnimation = false // 跟踪是否正在执行弹出动画
        let isDropped = false // 跟踪是否已经放下
        let animationTimers = [] // 存储动画定时器

        // 清除所有动画定时器
        function clearAnimationTimers() {
            animationTimers.forEach(timer => clearTimeout(timer))
            animationTimers = []
        }

        // 拿起效果
        function liftSearchInput() {
            searchInput.style.transform = 'translateY(-3px) scale(1.01)'
            searchInput.style.boxShadow = '0 5px 10px rgba(0,0,0,0.15)'
            isDropped = false // 标记为未放下状态
        }

        // 放下效果
        function dropSearchInput() {
            searchInput.style.transform = 'translateY(0) scale(1)'
            searchInput.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'
            // 如果是由于focus而放下，添加强调样式
            if (isFocused) {
                //searchInput.style.boxShadow = '0 2px 15px rgba(0,166,147,0.2)'
            }
            isDropped = true // 标记为已放下状态
        }

        // 搜索框弹出函数 - 拿起、移入、放下效果
        function showSearchInput() {
            // 清除之前的动画定时器
            clearAnimationTimers()
            
            // 标记正在执行弹出动画
            isShowingAnimation = true
            
            // 第一阶段：拿起（上移+缩放）
            liftSearchInput()
            
            // 第二阶段：移入（延迟执行）
            const timer1 = setTimeout(() => {
                searchInput.style.right = '0'
            }, 200)
            animationTimers.push(timer1)
            
            // 第三阶段：放下（等移入完成后再执行，1s移入时间 + 200ms缓冲）
            // 延迟检查focus状态，因为focus事件可能在mouseenter之后触发
            const timer2 = setTimeout(() => {
                isShowingAnimation = false // 弹出动画完成
                if (isFocused) {
                    dropSearchInput()
                }
            }, 1200)
            animationTimers.push(timer2)
        }

        // 搜索框插回函数 - 拿起、移出、放下效果
        function hideSearchInput() {
            if (!isFocused && window.innerWidth > 1101) {
                // 清除之前的动画定时器
                clearAnimationTimers()
                
                // 标记不再执行弹出动画
                isShowingAnimation = false
                
                // 第一阶段：拿起（上移+缩放）
                // 只有在已经放下的情况下才执行拿起效果
                if (isDropped) {
                    liftSearchInput()
                
                    // 第二阶段：移出（延迟执行）
                    const timer1 = setTimeout(() => {
                        searchInput.style.right = '-95%'
                    }, 200)
                    animationTimers.push(timer1)
                } else {
                    const timer1 = setTimeout(() => {
                        searchInput.style.right = '-95%'
                    }, 0)
                    animationTimers.push(timer1)
                }
                
                // 第三阶段：放下（等移出完成后再执行，1s移出时间 + 200ms缓冲）
                const timer2 = setTimeout(() => {
                    dropSearchInput()
                }, 1200)
                animationTimers.push(timer2)
            }
        }

        searchContainer.addEventListener('mouseenter', () => {
            if (!isFocused) {
                showSearchInput()
            }
        })
        searchContainer.addEventListener('mouseleave', () => {
            hideSearchInput()
        })

        searchInput.addEventListener('focus', () => {
            isFocused = true
            // 只有在不是弹出动画过程中才立即执行放下动画
            if (!isShowingAnimation) {
                dropSearchInput()
            }
        })
        searchInput.addEventListener('blur', () => {
            isFocused = false
            hideSearchInput()
        })
}