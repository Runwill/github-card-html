$(function(){
    //点击头栏切换页面时 滚动到上次访问位置
    $(".title-a").click(function(){
        if (!(window.location.hash)){
            setTimeout(function(){
                document.querySelectorAll(".is-active").forEach(
                    active => {
                        let scrollHeight = localStorage.getItem('scrollHeight'+active.id);
                        if (scrollHeight) {
                            setTimeout(() => {
                                window.scrollTo({top:scrollHeight,behavior:'smooth'});
                            }, 15)
                        }
                    }
                )
            },0)
        }
    })
    // 监听用户滚动位置
    const debounce = () => {
        let timer = null
        return () => {
            if (timer)clearTimeout(timer);
            timer = setTimeout(() => {
                document.querySelectorAll(".is-active").forEach(
                    active => {
                        localStorage.setItem('scrollHeight'+active.id, window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop)
                    }
                )
            }, 100)
        }
    }
    this.scrollFn = debounce()
    window.addEventListener('scroll', this.scrollFn)

    /*通过查找文本切换页面时滚动
    setTimeout(function(){
        document.querySelectorAll(".scroll").forEach(
            scroll => {
                if (scroll.outerHTML.startsWith("<"+window.location.hash.slice(1)+" ")){
                    if(!(scroll.classList.contains('fadeOnly'))){
                        scroll.scrollIntoView({behavior:'smooth'});
                    }
                    $(scroll).fadeTo(200,0).fadeTo(1000,1)
                }
            }
        )
    },0)*/
})