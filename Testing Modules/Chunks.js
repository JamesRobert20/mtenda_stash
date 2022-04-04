test("should animate element over 500ms", function () 
{ 
    var el = jQuery("<div></div>");

    el.appendTo(document.body);

    ok(el.css('display').indexOf("block") > -1);

    el.fadeOut();
    
    ok(el.css('display').indexOf("none") > -1); 
});


test("should animate element over 500ms", function () 
{ 
    var el = jQuery("<div></div>");

    el.appendTo(document.body);

    ok(el.css('display').indexOf("block") > -1);

    el.fadeOut(); 
    
    this.clock.tick(510);

    ok(el.css('display').indexOf("none") > -1); 
});