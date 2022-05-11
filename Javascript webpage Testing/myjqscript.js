$(document).ready(
    function ()
    { 
        // Initialize a div with id = dom-tested
        var bodyS = d3.select("body").append("div").attr("id", "dom-tested");
        bodyS.append("h1").style("text-align","center").text("Hello There !");

        // Centered items (<center> </center>)
        var centered = bodyS.append("center");

        centered.append("button")
            .style("margin-left", "-25px")
            .style("width", "50px")
            .style("height", "50px")
            .style("background-color", "lightgreen")
            .style("position", "absolute")
            .attr("class", "btn1")
            .text("1st Button");
        
        centered.append("button")
            .style("margin-top","75px")
            .style("margin-left", "-25px")
            .style("width", "50px")
            .style("height", "50px")
            .style("background-color", "lightblue")
            .style("position", "relative")
            .attr("class", "btn2")
            .text("2nd Button");

        centered.append("div")
                .attr("id", "flip")
                .style("margin","2px")
                .text("Click here to toggle the SVG ");

        var svg = centered.append("svg")
                        .attr("width", "300")
                        .attr("height", "300")
                        .style("background-color","#c3c3c3");

        svg.append("circle")
            .attr("class","outerCircle")
            .attr("cx","150")
            .attr("cy", "150")
            .attr("r","50")
            .style("fill","pink");

        svg.append("circle")
            .attr("class","innerCircle")
            .attr("cx","150")
            .attr("cy", "150")
            .attr("r","20")
            .style("fill","green");

        
        $(".btn2").click(
            function ()
            {
                $(this).animate({left: "100px"});
                $(this).animate({height: '300px', opacity: '0.4'}, "slow");
                $(this).animate({width: '300px', opacity: '0.8'}, "slow");
                $(this).animate({height: '50px', opacity: '0.4'}, "slow");
                $(this).animate({width: '50px', opacity: '0.8'}, "slow");
            }
    
        );
    
        $("#flip").click(
    
            function ()
            {
                // Takes 3 seconds
                $("svg").slideToggle(3000); 
    
            }
        );
    
        var counter = 0;
    
        $(".innerCircle").click(
        
            function ()
            {
                if(counter == 0)
                {
                    $(".outerCircle").animate({cx: "250", cy: "250"}, {duration: 1000, queue: false});
    
                    $(".innerCircle").animate({cx: "250", cy: "250"}, {duration: 1000, queue: false});
                    
                    counter++;
                }
                else
                {
                    $(".outerCircle").animate({cx: "150", cy: "150"}, {duration: 1000, queue: false});
    
                    $(".innerCircle").animate({cx: "150", cy: "150"}, {duration: 1000, queue: false});
    
                    counter--;
                }
                                            
            }
        
        );
    }
);

