var url_string = window.location.href
var url = new URL(url_string);
var uwisstring = url.searchParams.get("uwis");

$(document).ready(() => {
    document.getElementById('uwi').innerText = uwisstring;
});

function launchTable(){
    let url = `main.html?uwis=${uwisstring}`
    window.open(url, "_blank", `top=0,left=0,width=${screen.width},height=${screen.height}`);          
}

function launchStriplog(){
    let url = `main.html?uwis=${uwisstring}&mode=striplog`
    window.open(url, "_blank", `top=0,left=0,width=${screen.width},height=${screen.height}`);          
}