$(function(){
    var term = [
        { 
            "cn":"询问" ,
            "en":"ask" ,
            "color":"#e6a0de"
        },
        { 
            "cn":"进行" ,
            "en":"advance" ,
            "color":"#8dff9e"
        },
        { 
            "cn":"程序" ,
            "en":"procedure" ,
            "color":"#8dbeff"
        },
        { 
            "cn":"程序触发器" ,
            "en":"procedureTrigger" ,
            "color":"#d3e7ff"
        },
        { 
            "cn":"优先级" ,
            "en":"priority" ,
            "color":"#779bff"
        },
        { 
            "cn":"你" ,
            "en":"you" ,
            "color":"#f0a2a2"
        },
        { 
            "cn":"时段与次数限制" ,
            "en":"tickingTimeLimit" ,
            "color":"#b9f69e"
        },
        { 
            "epithet":[{"cn":"时段限制"},{"cn":"时段"}] ,
            "en":"tickingLimit" ,
            "color":"#d7f69e"
        },
        { 
            "cn":"次数限制" ,
            "en":"numberLimit" ,
            "color":"#a1fbcc"
        },
        { 
            "cn":"时机限制" ,
            "en":"tickLimit" ,
            "color":"#8dff8d"
        },
        { 
            "en":"numberLimiting" ,
            "part":[
                {
                    "cn":"限" ,
                    "en":"numberLimitingHead" ,
                },
                {
                    "cn":"次" ,
                    "en":"numberLimitingEnd" ,
                }
            ],
            "color":"#60e6ae"
        },
        { 
            "cn":"程序时机" ,
            "en":"procedureTick" ,
            "color":"#8dbeff"
        },
        { 
            "cn":"属性" ,
            "en":"attribute" ,
            "color":"#ff8ddd"
        },
        { 
            "cn":"流程" ,
            "en":"process" ,
            "color":"#ca8dff"
        },
        { 
            "epithet":[{"cn":"局流程"},{"cn":"局"}] ,
            "en":"game" ,
            "color":"#d19ffc"
        },
        { 
            "cn":"局开始时" ,
            "en":"atGameStart" ,
            "color":"#d4aaf8"
        },
        { 
            "epithet":[{"cn":"轮流程"},{"cn":"轮"}] ,
            "en":"round" ,
            "color":"#9fbcfc"
        },
        { 
            "cn":"轮开始时" ,
            "en":"atRoundStart" ,
            "color":"#aac8f8"
        },
        { 
            "cn":"轮结束时" ,
            "en":"atRoundFinish" ,
            "color":"#aac8f8"
        },
        { 
            "cn":"轮数" ,
            "en":"rounds" ,
            "color":"#aac8f8"
        },
        { 
            "epithet":[{"cn":"回合流程"},{"cn":"回合"}] ,
            "en":"turnProcess" ,
            "color":"#fbff8d"
        },
        { 
            "cn":"回合开始前" ,
            "en":"beforeTurnStart" ,
            "color":"#f9a8a8"
        },
        { 
            "epithet":[{"cn":"回合时段"},{"cn":"回合"}] ,
            "en":"turn" ,
            "color":"#fb8686"
        },
        { 
            "epithet":[{"cn":"阶段时段"},{"cn":"阶段"}] ,
            "en":"stage" ,
            "color":"#a8bef9"
        },
        { 
            "cn":"回合开始时" ,
            "en":"atTurnStart" ,
            "color":"#f9a8a8"
        },
        { 
            "cn":"固有准备阶段" ,
            "en":"inherentPreparingStage" ,
            "color":"#95a3ca"
        },
        { 
            "epithet":[{"cn":"准备阶段流程"},{"cn":"准备阶段"}] ,
            "en":"preparingStageProcess" ,
            "color":"#fbff8d"
        },
        { 
            "cn":"固有判定阶段" ,
            "en":"inherentDealingStage" ,
            "color":"#95a3ca"
        },
        { 
            "epithet":[{"cn":"判定阶段流程"},{"cn":"判定阶段"}] ,
            "en":"dealingStageProcess" ,
            "color":"#fbff8d"
        },
        { 
            "cn":"固有摸牌阶段" ,
            "en":"inherentGettingStage" ,
            "color":"#95a3ca"
        },
        { 
            "epithet":[{"cn":"摸牌阶段流程"},{"cn":"摸牌阶段"}] ,
            "en":"gettingStageProcess" ,
            "color":"#fbff8d"
        },
        { 
            "cn":"固有出牌阶段" ,
            "en":"inherentActingStage" ,
            "color":"#95a3ca"
        },
        { 
            "cn":"出牌阶段" ,
            "en":"actingStage" ,
            "color":"#7fe586"
        },
        { 
            "cn":"出牌阶段开始前" ,
            "en":"beforeActingStageStart" ,
            "color":"#7fe586"
        },
        { 
            "cn":"出牌阶段开始时" ,
            "en":"atActingStageStart" ,
            "color":"#7fe586"
        },
        { 
            "en":"acting" ,
            "color":"#7fe586",
            "replace":true
        },
        { 
            "cn":"出牌阶段结束时" ,
            "en":"atActingStageFinish" ,
            "color":"#7fe586"
        },
        { 
            "cn":"出牌阶段结束后" ,
            "en":"afterActingStageFinish" ,
            "color":"#7fe586"
        },
        { 
            "epithet":[{"cn":"出牌阶段流程"},{"cn":"出牌阶段"}] ,
            "en":"actingStageProcess" ,
            "color":"#fbff8d"
        },
        { 
            "cn":"固有弃牌阶段" ,
            "en":"inherentThrowingStage" ,
            "color":"#95a3ca"
        },
        { 
            "epithet":[{"cn":"弃牌阶段流程"},{"cn":"弃牌阶段"}] ,
            "en":"throwingStageProcess" ,
            "color":"#fbff8d"
        },
        { 
            "cn":"固有结束阶段" ,
            "en":"inherentConcludingStage" ,
            "color":"#95a3ca"
        },
        { 
            "epithet":[{"cn":"结束阶段流程"},{"cn":"结束阶段"}] ,
            "en":"concludingStageProcess" ,
            "color":"#fbff8d"
        },
        { 
            "cn":"固有阶段" ,
            "en":"inherentStage" ,
            "color":"#95a3ca"
        },
        { 
            "epithet":[{"cn":"阶段流程"},{"cn":"阶段"}] ,
            "en":"stageProcess" ,
            "color":"#8dc6ff"
        },
        { 
            "cn":"回合结束时" ,
            "en":"atTurnFinish" ,
            "color":"#f9a8a8"
        },
        { 
            "cn":"回合结束后" ,
            "en":"afterTurnFinish" ,
            "color":"#f9a8a8"
        },
        { 
            "cn":"事件" ,
            "en":"event" ,
            "color":"#c6ff8d"
        },
        { 
            "cn":"对象" ,
            "en":"object" ,
            "color":"#aea2d6"
        },
        { 
            "cn":"时机" ,
            "en":"tick" ,
            "color":"#aee3ba"
        },
        { 
            "en":"can" ,
            "part":[
                {
                    "cn":"可" ,
                    "en":"canHead" ,
                }
            ],
            "color":"#f6b19e"
        },
        { 
            "cn":"任何时候" ,
            "en":"anytime" ,
            "color":"#fdc298"
        },
        { 
            "cn":"当前时机" ,
            "en":"currentTick" ,
            "color":"#9fe3e8"
        },
        { 
            "en":"when" ,
            "part":[
                {
                    "cn":"当" ,
                    "en":"whenHead" ,
                }
            ],
            "color":"#defbfd"
        },
        { 
            "cn":"时段" ,
            "en":"ticking" ,
            "color":"#91be9c"
        },
        { 
            "en":"in" ,
            "part":[
                {
                    "cn":"内" ,
                    "en":"inEnd" ,
                }
            ],
            "color":"#fddede"
        },
        { 
            "cn":"角色" ,
            "en":"role" ,
            "color":"#b0d9e8"
        },
        { 
            "cn":"当前回合角色" ,
            "en":"currentTurnRole" ,
            "color":"#edb897"
        },
        { 
            "cn":"存亡" ,
            "en":"liveStatus" ,
            "color":"#e8b0ca"
        },
        { 
            "cn":"存活" ,
            "en":"living" ,
            "color":"#f0a2a2"
        },
        { 
            "epithet":[{"cn":"存活角色"},{"cn":"角色"}] ,
            "en":"livingRole" ,
            "color":"#f0a2b7"
        },
        { 
            "cn":"死亡" ,
            "en":"dead" ,
            "color":"#e1e1e1"
        },
        { 
            "cn":"死亡角色" ,
            "en":"deadRole" ,
            "color":"#e1e1e1"
        },
        { 
            "cn":"座位" ,
            "en":"seat" ,
            "color":"#b0c6e8"
        },
        { 
            "en":"roleSeated" ,
            "part":[
                {
                    "cn":"位" ,
                    "en":"roleSeatedBody" ,
                }
            ],
            "color":"#c6b0e8"
        },
        { 
            "en":"nextSeat" ,
            "part":[
                {
                    "cn":"下" ,
                    "en":"nextSeatHead" ,
                },
                {
                    "cn":"家" ,
                    "en":"nextSeatEnd" ,
                }
            ],
            "color":"#96add9"
        },
        { 
            "en":"previousSeat" ,
            "part":[
                {
                    "cn":"上" ,
                    "en":"previousSeatHead" ,
                },
                {
                    "cn":"家" ,
                    "en":"previousSeatEnd" ,
                }
            ],
            "color":"#d99696"
        },
        { 
            "cn":"位次" ,
            "en":"seatOrder" ,
            "color":"#b0b7e8"
        },
        { 
            "cn":"选择" ,
            "en":"choose" ,
            "color":"#b0e8d0"
        },
        { 
            "cn":"角色选择器" ,
            "en":"roleSelector" ,
            "color":"#b0e8d0"
        },
        { 
            "cn":"目标数限制" ,
            "en":"targetNumberLimit" ,
            "color":"#a1cbfb"
        },
        { 
            "cn":"距离限制" ,
            "en":"distanceLimit" ,
            "color":"#a1fbaa"
        },
        { 
            "cn":"目标限制" ,
            "en":"targetLimit" ,
            "color":"#a1b1fb"
        },
        { 
            "cn":"技能" ,
            "en":"skill" ,
            "color":"#b4a7ec"
        },
        { 
            "cn":"武将技能" ,
            "en":"characterSkill" ,
            "color":"#cca7ec"
        },
        { 
            "cn":"装备技能" ,
            "en":"equipmentSkill" ,
            "color":"#a7beec"
        },
        { 
            "en":"skillQuote" ,
            "part":[
                {
                    "cn":"〖" ,
                    "en":"skillQuoteLeft" ,
                },
                {
                    "cn":"〗" ,
                    "en":"skillQuoteRight" ,
                }
            ],
            "color":"#f4defd"
        },
        { 
            "en":"and" ,
            "part":[
                {
                    "cn":"且" ,
                    "en":"andBody" ,
                }
            ],
            "color":"#fdeade"
        },
        { 
            "en":"or" ,
            "part":[
                {
                    "cn":"或" ,
                    "en":"orBody" ,
                }
            ],
            "color":"#dffdde"
        }
    ];
    
    
    var CharacterSkill = [
        {
            "name":"允中",
            "content":"<procedureTrigger class=\"irreplacable\"><tickingTimeLimit class=\"irreplacable\"><tickingLimit class=\"irreplacable\"><actingStage></actingStage></tickingLimit><numberLimit class=\"irreplacable\"><numberLimiting><numberLimitingHead></numberLimitingHead>一<numberLimitingEnd></numberLimitingEnd></numberLimiting></numberLimit></tickingLimit></procedureTrigger>，<you></you><can><canHead></canHead><or>令<roleSelector class=\"irreplacable\"><targetNumberLimit class=\"irreplacable\">所有</targetNumberLimit><targetLimit class=\"irreplacable\">手牌最多的<livingRole epithet=\"1\"></livingRole></targetLimit></roleSelector>各弃置一张牌<orBody></orBody>令<roleSelector class=\"irreplacable\"><targetNumberLimit class=\"irreplacable\">所有</targetNumberLimit><targetLimit class=\"irreplacable\">手牌最少的<livingRole epithet=\"1\"></livingRole></targetLimit></roleSelector>各摸一张牌</or></can>。",
            "own":[{"role":"1"}]
        },
        {
            "name":"刑德",
            "content":"刑德",
            "own":[{"role":"1"}]
        }
    ]
    //获取技能名并排序
    let CharacterSkillNames = []
    for(var i in CharacterSkill){
        CharacterSkillNames.push(CharacterSkill[i].name)
    }
    CharacterSkillNames.sort()
    
    let standardCharacterSkills = ""
    for(var i in CharacterSkillNames){
        for(j in CharacterSkill){
            if(CharacterSkill[j].name == CharacterSkillNames[i]){
                standardCharacterSkills += "<skillQuote class=\"bold\"><skillQuoteLeft></skillQuoteLeft>"+"<characterSkillElement"+" class=\""+CharacterSkill[j].name+" scroll\"></characterSkillElement>"+"<skillQuoteRight></skillQuoteRight></skillQuote>"+CharacterSkill[j].content
            }
        }
        standardCharacterSkills += "<br>"+"<br>"
    }
    standardCharacterSkillsBlock.innerHTML = "<br>"+"<br>"+standardCharacterSkills
    
    for(var i in term){
        if(!term[i].part){
            document.querySelectorAll(term[i].en).forEach(//替换和滚动
                element => {
                    element.termPosition=i
                    if(!element.classList.contains('irreplacable')){
                        if(!term[i].epithet){
                            if(term[i].cn)element.innerHTML = term[i].cn
                            else element.innerHTML = term[i].en
                        }
                        else{
                            if(!element.getAttribute("epithet"))element.innerHTML =  term[i].epithet[0].cn
                            else{
                                element.innerHTML =  term[i].epithet[element.getAttribute("epithet")].cn
                            }
                        }
                    }
                    element.addEventListener(
                        'click', function(){
                            document.querySelectorAll(".scroll").forEach(
                                scroll => {
                                    event.stopPropagation()
                                    if (scroll.outerHTML.startsWith("<"+event.currentTarget.tagName.toLowerCase()+" ")){
                                        if(!(scroll.classList.contains('fadeOnly'))){
                                            scroll.scrollIntoView({behavior: "smooth"});
                                        }
                                        $(scroll).fadeTo(200,0).fadeTo(1000,1)
                                    }
                                }
                            )
                        }
                    )
                }
            )
            $(term[i].en).mouseover(//高亮
                function(){
                    $(this).css("background-color",term[event.currentTarget.termPosition].color)
                    $(term[event.currentTarget.termPosition].en+".scroll").css("background-color",term[event.currentTarget.termPosition].color)
                }
            )
            $(term[i].en).mouseout(//高亮
                function(){
                    $(this).css("background-color","")
                    $(term[event.currentTarget.termPosition].en+".scroll").css("background-color","")
                }
            )
        }
        else{
            for(var j in term[i].part){//替换
                document.querySelectorAll(term[i].part[j].en).forEach(
                    element => {
                        element.innerHTML = term[i].part[j].cn
                    }
                )
            }
            $(term[i].en).each((index,element)=>{//高亮
                element.termPosition=i
                $(element).mouseover(()=>{
                    for(var j in term[event.currentTarget.termPosition].part){
                        $(element).children(term[event.currentTarget.termPosition].part[j].en).css("background-color",term[event.currentTarget.termPosition].color)
                        $(term[event.currentTarget.termPosition].en+".scroll").children(term[event.currentTarget.termPosition].part[j].en).css("background-color",term[event.currentTarget.termPosition].color) 
                    }
                })
                 $(element).mouseout(()=>{
                    for(var j in term[event.currentTarget.termPosition].part){
                        $(element).children(term[event.currentTarget.termPosition].part[j].en).css("background-color","")
                        $(term[event.currentTarget.termPosition].en+".scroll").children(term[event.currentTarget.termPosition].part[j].en).css("background-color","")
                    }
                })
            })
            document.querySelectorAll(term[i].en).forEach(//滚动
                element => {
                    element.addEventListener(
                        'click', function(){
                            document.querySelectorAll(".scroll").forEach(
                                scroll => {
                                    if (scroll.outerHTML.startsWith("<"+term[event.currentTarget.termPosition].en.toLowerCase()+" ")){
                                        if(!(scroll.classList.contains('fadeOnly'))){
                                            scroll.scrollIntoView({behavior: "smooth"});
                                        }
                                        for(var j in term[event.currentTarget.termPosition].part){
                                            $(term[event.currentTarget.termPosition].en+".scroll").find(term[event.currentTarget.termPosition].part[j].en).fadeTo(200,0).fadeTo(1000,1)
                                        }
                                    }
                                }
                            )
                        }
                    )
                }
            )
        }
    }
    for(var i in CharacterSkillNames){
        document.querySelectorAll("."+CharacterSkillNames[i]).forEach(//替换和滚动
            element => {
                element.innerHTML = CharacterSkillNames[i]
                element.skillPosition=i
                element.addEventListener(
                    'click', function(){
                        document.querySelectorAll(".scroll").forEach(
                            scroll => {
                                if (scroll.classList.contains(event.currentTarget.classList[0])){
                                    event.stopPropagation()
                                    if(!(scroll.classList.contains('fadeOnly'))){
                                        scroll.scrollIntoView({behavior:'smooth'})
                                    }
                                    $(scroll).fadeTo(200,0).fadeTo(1000,1)
                                }
                            }
                        )
                    }
                )
            }
        )
        $("."+CharacterSkillNames[i]).mouseover(//高亮
            function(){
                $(this).css("background-color","#df90ff")
                $("."+event.currentTarget.classList[0]+".scroll").css("background-color","#df90ff")
            }
        )
        $("."+CharacterSkillNames[i]).mouseout(//高亮
            function(){
                $(this).css("background-color","")
                $("."+event.currentTarget.classList[0]+".scroll").css("background-color","")
            }
        )
    }
});
