$(function(){
    $.ajax({
        url:"characterMain.json",
        type:"GET",
        datatype:"json",
        success:
        function (data){
            CharacterRe(data)
        }
    });
    var CharacterRe = function(data){
        let Character = ""
        for(var i in data){
            Character += "<h2>"+data[i].name+"</h2><br>"
            for(var j in data[i].skill){
                Character += "<skillQuote class=\"bold\"><skillQuoteLeft></skillQuoteLeft>"+"<characterSkillElement"+" class=\""+data[i].skill[j].name+" scroll\"></characterSkillElement>"+"<skillQuoteRight></skillQuoteRight></skillQuote>"
            }
        }
        CharactersBlock.innerHTML = Character
    }
});