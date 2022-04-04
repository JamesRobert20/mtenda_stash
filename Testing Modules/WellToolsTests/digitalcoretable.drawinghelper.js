var DigitalCoreTable = DigitalCoreTable || {};
/**
 * Singleton Class that supports drawing . Adds elements to d3
 * Every addon that needs to draw must have an instance of this class
 */
DigitalCoreTable.DrawingHelperAddon = class DrawingHelperAddon{
    /**
     * Create and attach the addon
     * @param {DigitalCoreTable.Table} table 
     */
    constructor(table) {
        this.defaultFillOpacity = 0.65;
        this.table = table
        this._lineF = pathPoints => {
            return d3.line()
                .x(d => d.x)
                .y(d => d.y)
                 .curve(d3.curveBasis)(pathPoints) + 'Z';
        }
        this.parentSelection = this.table.svg;
    }

    drawDescription(srcs) {
        let className = 'dctDescriptionLabel'
        let helper = this;
        let ratio = 1 / 60;
        let bounds = table.viewer.viewport.getBounds();
        const minFontSize = DigitalCoreTable.settings.minFontSize;
        const maxFontSize = DigitalCoreTable.settings.maxFontSize;
        let fontSize = ratio * bounds.height;
        fontSize = Math.max(fontSize, minFontSize);
        fontSize = Math.min(fontSize, maxFontSize);

        //remove old description       
        //$('text[class^=dctDescriptionLabel]').remove();

        let sel = this.parentSelection.selectAll('text.' + className)
            .data(srcs.filter(o => o.interval.description != null && o.interval.description != ''));
        sel.exit()
            .remove();
        sel.enter()
            .append('text')
            .classed(className, true)
            .attr('stroke', 'black')
            .attr('stroke-width', 0)
            .attr('fill', 'darkblue')
            .style('pointer-events', 'none')
            .attr('opacity', 1)
            .merge(sel)
            //.attr('x', d => (this.table.striplogAddon == null ? d.descriptionX: 10))
            //.attr('y', d => (this.table.striplogAddon == null ? d.y : 0))
            .attr('font-family', 'Trebuchet MS')
            .attr('id', d => 'descLabel_'+d.id)
            .attr('font-size', d => (helper.table.striplogAddon == null ? fontSize : 12))
            .text(d => d.interval.description == null || d.interval.description == '' ? null : d.interval.description)

            .each(function (d) {
                if (d.interval.description == null || d.interval.description == '')
                    return;
                var text = d3.select(this),
                    words = this.textContent.split(/\s+/).reverse(),
                    word,
                    line = [],
                    lineNumber = 0,
                    lineHeight = 1.1, // ems
                    wordIndex = 0,//index of word, in order to control forced tspan, 0 and 1 goes to separate tspan
                    y = text.attr("y"),
                    dy = 1.1,
                    tspan = text.text(null).append("tspan")
                        .attr("x", d => (helper.table.striplogAddon == null ? d.descriptionX : 5))
                        .attr("y", d => (helper.table.striplogAddon == null ? d.y : 0))
                        .attr("dy", dy + "em");
                //in order to not split the track name we append it here
                if (words != '')
                    words.push(d.interval.start.toFixed(2) + '-' + d.interval.stop.toFixed(2), '[' + d.interval.groupName + ']');
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > d.descriptWidth || wordIndex <= 2) {
                        line.pop();
                        wordIndex++;
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan")
                                .attr("x", d => (helper.table.striplogAddon == null ? d.descriptionX : 5))
                                .attr("y", d => (helper.table.striplogAddon == null ? d.y : 0))
                                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
                        if (lineNumber == 1)
                            tspan.classed('description1Color', true);
                        else if (lineNumber == 2)
                            tspan.classed('description2Color', true);
                    }
                }
            });

        //draw top and bottom line
        className = 'dctDescriptionTopBottom';
        sel = this.parentSelection.selectAll('rect.' + className)
            .data(srcs.filter(o => o.interval.description != null && o.interval.description != ''));
        sel.exit()
            .remove();
        sel.enter()
            .append('rect')
            .classed(className, true)
            .style('pointer-events', 'none')
            .style('opacity', this.defaultFillOpacity)
            .attr('stroke', 'black')
            .merge(sel)
            //.attr('fill', d => d.fill.Color)
            .attr('vector-effect', 'non-scaling-stroke')
            .attr('stroke-width', 1)
            .attr('id', d => 'descTB_' + d.id)
            .attr('x', d => d.descriptionX)
            .attr('y', d => d.y)
            .attr('width', d => d.descriptionX + d.descriptWidth)
            .attr('height', d => d.height)
        .attr('fill','transparent')
    }


    drawSamples(srcs, className) {
        let helper = this;
        let ratio = 1 / 60;
        let bounds = table.viewer.viewport.getBounds();
        const minFontSize = DigitalCoreTable.settings.minFontSize;
        const maxFontSize = DigitalCoreTable.settings.maxFontSize;
        let fontSize = ratio * bounds.height;
        fontSize = Math.max(fontSize, minFontSize);
        fontSize = Math.min(fontSize, maxFontSize);

        //remove old sample numbers        
        //$('text[class^=dctSampleCount]').remove();

        let sel = this.parentSelection.selectAll('text.' + className)
            .data(srcs);
        sel.exit()
            .remove();
        sel.enter()
            .append('text')
            .classed(className, true)
            .attr('stroke', 'black')
            .attr('stroke-width', 0)
            .attr('fill', 'darkblue')
            .style('pointer-events', 'none')
            .attr('opacity', 1)
            .merge(sel)
            .attr('x', d => (this.table.striplogAddon ==null ? d.x + d.width / 2 - fontSize / 2 : 0))
            .attr('y', d => (this.table.striplogAddon==null ? d.y + d.height / 2 - fontSize / 2 :0))
            .attr('font-family', 'Trebuchet MS')
            .attr('font-size', fontSize)
            .each(function (item) {
                // we may encounter issue when interval is split, so we need to watch for intervalIsGroupLast
                let cond1 = item.intervalGroupIsLast && item.intervalGroupIsFirst;
                let cond2 = item.intervalGroupIsLast && !item.intervalGroupIsFirst;
                if (cond1 || cond2) {
                    //we check for the track name and then combine the string
                    //don't count NA,LC,Lost Core, show index with slash if there is shared sample
                    this.textContent = item.interval.fill ?.Abbr || '';
                    if (item.interval.sample != null) {
                        if (table.userGroup == 'Barrick') {
                            if (item.interval.sample != null && (item.interval.fill.Abbr != 'LC' && item.interval.fill.Abbr != 'NA')) {
                                this.textContent = item.interval.sample.name != null ? item.interval.sample.name :
                                    item.interval.sample.sharedFill != null ? item.interval.sample.secondSharedFill != null ? item.interval.sample.idx + "/" + (item.interval.sample.idx + 1) + "/" + (item.interval.sample.idx + 2) : item.interval.sample.idx + "/" + (item.interval.sample.idx + 1) :
                                        item.interval.sample.idx;
                            }
                        }
                        else {
                            this.textContent = item.interval.sample.name != null ? item.interval.sample.name :
                                item.interval.sample.sharedFill != null ? item.interval.sample.idx + "/" + (item.interval.sample.idx + 1) :
                                    item.interval.sample.idx;
                        }
                    }
                    //this.textContent = item.interval.sample?.name || item.interval.sample?.idx || item.interval.fill?.Abbr;

                    // this was breaking and confusing me so I replaced with the above
                    // this.textContent = item.interval.sample.name == null ? item.interval.sample.idx == null ? item.interval.fill.Abbr : item.interval.sample.idx : item.interval.sample.name;


                    //if (item.interval.groupName != 'Sample') {
                    //    this.textContent = item.interval.fill.Name != 'NA' ? item.interval.fill.Name == 'LC' || item.interval.fill.Name == 'Lost Core' ? 'LC' : item.interval.sample.name == null ? item.interval.sample.prefix + ("000" + item.interval.sample.idx).slice(-3) : item.interval.sample.name : 'NA';
                    //}
                    ////else if (item.interval.groupName == 'Soluble Ion') {
                    ////    this.textContent = 'SI' + ("000" + item.interval.sample.idx).slice(-3);
                    ////}
                    //else {
                    //    this.textContent = item.interval.sample.name == null ? item.interval.sample.idx : item.interval.sample.name;
                    //}

                    this.setAttribute('transform', "rotate(90," + this.getAttribute('x') + "," + this.getAttribute('y') + ")");
                }
                else{
                    this.textContent = '';
                }
            })
            //.attr('transform', d => 'rotate(90,' + d.x + ',' + d.y + ')');
    }

    /**
     * Physical drawing of all shared samples with pattern - diagonal inside rectangle with two colors 
     * @param {any} srcs
     */
    _drawSharedSamplesPattern(srcs) {
        let helper = this;
        //remove old patterns        
        //$('pattern[id^=' + 'splitpttrn]').remove();

        srcs
            .forEach(function (item, index) {
                let defsSel = helper.parentSelection
                    .select('defs');

                let fill = helper.table.fills.find(o => o.Id == item.interval.sample.sharedFill.Id);
                let core = helper.table.fills.find(o => o.Name == 'Core' && o.Group.toUpperCase() == item.interval.groupName.toUpperCase());
                let secondfill = helper.table.fills.find(o => o.Id == item.interval.sample.secondSharedFill?.Id);
                //remove old pattern
                $('pattern[id=' + 'splitpttrn_' + index + '_' + fill.Id +']').remove();
                let theid = 'splitpttrn_' + index + "_" + fill.Id;
                let pattern = defsSel.append("svg:pattern")
                    .attr('id', theid)
                    .attr('width', item.width)
                    .attr('height', item.height)//for striplog we need to add extra px for stroke width
                    .attr("x", item.x)
                    .attr("y", item.y)
                    .attr('opacity', 1)
                    .attr('preserveAspectRatio', 'none')
                    .attr('patternUnits', helper.table.striplogAddon == null ? 'userSpaceOnUse' : 'objectBoundingBox');
                pattern.append('path')
                    .classed('upper_split',true)
                    .attr('stroke', 'black')
                    .attr('stroke-width', 13)
                    .attr('d', function () {
                        return 'M0,0' + ' L' + item.width + ',0' + ' L0,' + item.height + ' Z';
                    })
                    .attr('fill', fill.Color);
                pattern.append('path')
                    .classed('lower_split',true)
                    .attr('stroke', 'black')
                    .attr('stroke-width', 13)
                    .attr('d', function () {
                        return 'M0,' + item.height + ' L' + item.width + ',' + item.height + ' L' + item.width + ',0' + ' Z';
                    })
                    .attr('fill', secondfill != null ? secondfill.Color : core.Color);

                $("path#lith_" + item.interval.id + '_' + item.intervalGroupIndex).css('fill', 'url(#' + theid + ')');
            });
    }

    drawText(srcs, className) {
        let ratio = 1 / 75;
        let bounds = table.viewer.viewport.getBounds();

        const minFontSize = DigitalCoreTable.settings.minFontSize;
        const maxFontSize = DigitalCoreTable.settings.maxFontSize;
        let fontSize = ratio * bounds.height;
        fontSize = Math.max(fontSize, minFontSize);
        fontSize = Math.min(fontSize, maxFontSize);

        let sel = this.parentSelection.selectAll('text.' + className)
            .data(srcs);
        let exitSel = sel.exit();
        exitSel.remove();

        let enterSel = sel.enter()
            .append('text')
            .classed(className, true)
            .attr('stroke', 'black')            
            .style('pointer-events', 'none')
            .attr('opacity',1);                                
        let updateSel = enterSel.merge(sel)
            .attr('x', d => d.x + d.width / 2 - (d.fontSize || fontSize)/2)
            .attr('y', d => d.y)
            .attr('stroke-width', d => d.strokeWidth || 0)            
            .attr('font-family', 'Trebuchet MS')
            .attr('fill', d => d.fontColor || 'darkblue')
            .attr('font-size', d => d.fontSize || fontSize)
            .attr('transform', d => d.rotate90 ? 'rotate(90,' + (d.x + (d.fontSize || fontSize)*1.5) + ',' + d.y + ')' : null); // this is probably wrong but i'm in a hurry
            // .each(function (item, index) {
            //     if(this.text == null){
            //         this.textContent = (index + 1); // draws the text for each top border, starting from 1
            //     }
            //     else{
            //         this.textContent = item.text;
            //     }                
            // })

            // lines of text
            let tspanSel = updateSel.selectAll('tspan')
                .data((d,index) => d.textLines != null ? d.textLines : [(index + 1)]);
            tspanSel.exit()
                .remove();
            tspanSel.enter()
                .append('tspan')
                .merge(tspanSel)            
                // .attr('dy', (d,i) => i == 0 ? '-0.2em' : '1.2em')
                .attr('dy', (d,i) => '1.2em')
                .attr('x', function(d){
                    let x = d3.select(this.parentNode).datum().x; // access parent data
                    return x;
                })
                .text(d => d);  
        return {
            enterSelection: enterSel,
            updateSelection: updateSel,
            exitSelection: exitSel,            
        };
    }

    /**
     * Update the interval elements on screen(position, dimensions, delete old, add new, etc).
     * Gets srcs as data to bind to,options, class name
     */
    drawRect(srcs, className, bringToFront) {
        let bounds = table.viewer.viewport.getBounds();
        let ratio = 1 / 500;
        let strokeWidth = ratio * bounds.height;               

        let sel = this.parentSelection.selectAll('rect.' + className)
            .data(srcs);
        sel.exit()
            .remove();
        let enterSel = sel.enter()
            .append('rect');
        enterSel.classed(className, true)
            .style('pointer-events', 'none')
            .style('opacity', d => d.opacity || this.defaultFillOpacity);
        let updateSel = enterSel.merge(sel);
        updateSel.attr('x', d => (this.table.striplogAddon == null ? d.x : 0))
            .attr('y', d => (this.table.striplogAddon == null ? d.y : 0))
            .attr('width', d => d.width)
            .attr('height', d => d.height)
            .style('stroke', d => d.stroke)
            .style('stroke-width', d => d.strokeWidth != null ? d.strokeWidth : strokeWidth)
            .attr('fill', d => d.fill);
        if(bringToFront)
            updateSel.raise();
    }

    /**
     * Draws the pattern of capital I shape with line intensity(abundance) , the middle one only
     * there is a gap in the middle to accomodate rectangle /text label
     * @param {any} srcs
     * @param {any} elementClass
     */
    drawOnAccessoryTrack(srcs, elementClass) {
        let addon = this;
        let bounds = table.viewer.viewport.getBounds();
        let ratio = 1 / 500;
        let strokeWidth = ratio * bounds.height;

        let svgSel = this.parentSelection;
        let sel = svgSel.selectAll('.' + elementClass)
            .data(srcs);
        //append the pattern for accessory tracks
        //we take size of text(its rect) as width of track x 50
        let midTextRectHeight = 2;
        sel.exit()
            .remove();

        //draws top and bottom solid lines
        sel.enter()
            .append('path')
            .classed(elementClass, true)
            .classed(DigitalCoreTable.noEventsClass, true)
            .style('opacity', this.defaultFillOpacity)
            .attr('stroke', 'black')
            .merge(sel)
            .attr('fill', d => d.fill.Color)
            .attr('vector-effect', 'non-scaling-stroke')
            .attr('id', d => d.id + '_' + d.intervalGroupIndex)
            .attr('stroke-width', d => this.table.striplogAddon == null ? d.showStroke ? 0.7 : 0 : 0.7)
            .attr('d', d => {
                //if (d.height == 0)
                //    return;
                let points = d.points;
                let topLeft = { x: d.x, y: d.y };
                let botLeft = { x: d.x, y: d.y + d.height };
                let topRight = { x: points[0].x, y: d.y };
                let botRight = { x: points[points.length - 1].x, y: d.y + d.height };

                // time to get janky here            
                let genericLineFStarter = d3.line()
                    .x(p => p.x)
                    .y(p => p.y);
                // let curvedLineF = genericLineFStarter.curve(d3.curveCardinal);
                let curvedLineF = genericLineFStarter.curve(d3.curveLinear);

                // curved vertical
                let s = curvedLineF(points);

                // Close the path
                let straightLineF = genericLineFStarter.curve(d3.curveLinear);
                //points = [d.points[d.points.length-1], pEnd, p1, d.points[0]];
                points = [botRight, botLeft, topLeft, topRight];
                s += straightLineF(points).replace('M', 'L');
                s += 'Z';
                return s;
            });          

            //.attr('d', d => {

            //    //draw the top line when d.intervalGroupIsFirst is true and bottom when d.intervalGroupIsLast is true
            //    let pointsString = '';
            //    //don't draw line if height is 0 as point data
            //    if (d.height == 0)
            //        return pointsString;
            //    if (d.intervalGroupIsFirst && d.intervalGroupIsLast) {
            //        pointsString = "M " + d.x + " " + d.y + "H " + (d.x + d.width) +
            //            "M " + d.x + " " + (d.y + d.height) + "H " + (d.x + d.width);
            //    }
            //    else {
            //        pointsString = d.intervalGroupIsFirst ? "M " + d.x + " " + d.y + "H " + (d.x + d.width) :
            //            d.intervalGroupIsLast ? "M " + d.x + " " + (d.y + d.height) + "H " + (d.x + d.width) : '';
            //    }

            //    return pointsString; /*"M " + d.x + " " + d.y + "H " + (d.x + d.width) +
            //        "M " + d.x + " " + (d.y + d.height) + "H " + (d.x + d.width);*/
            //});

        //draws the middle line with intensity
        sel = svgSel.selectAll('.dctAccessoryAbundance')
            .data(srcs);
        sel.exit()
            .remove();
        sel.enter()
            .append('path')
            .classed('dctAccessoryAbundance', true)
            .classed(DigitalCoreTable.noEventsClass, true)
            .style('opacity', this.defaultFillOpacity)
            .attr('stroke', 'black')
            .merge(sel)
            .attr('fill', 'black')
            .attr('vector-effect', 'non-scaling-stroke')
            .attr('stroke-width', 1)
            .attr('d', d => {
                if (d.height == 0)
                    return '';
                let dstring = this.table.striplogAddon != null ? "M" + (d.x + d.width / 2) + "," + d.y +
                    "V" + (d.y + d.height) :
                    "M" + (d.x + d.width / 2) + "," + d.y +
                    "V" + (d.y + d.height / 2 - (midTextRectHeight * 1.5)) +
                    "M" + (d.x + d.width / 2) + "," + (d.y + d.height / 2 + (midTextRectHeight * 1.5)) +
                    "V" + (d.y + d.height);

                //let dstring = "M" + (d.x + d.width / 2) + "," + d.y +
                //    "V" + (d.y + d.height / 2 - (midTextRectHeight * 1.5)) +
                //    "M" + (d.x + d.width / 2) + "," + (d.y + d.height / 2 + (midTextRectHeight * 1.5)) +
                //    "V" + (d.y + d.height);
                return dstring;
            })
            .attr('stroke-dasharray', src => {
                //in Alteration there only 3 categories not 5, make adjustment
                let arrInt = src.interval.isAlterationTrack || (addon.table.userGroup == 'Rio' && src.interval.groupName.endsWith('Mineralization')) ? DigitalCoreTable.lineDashedArr_7 : src.interval.groupName.includes('Mineralization') || src.interval.groupName.includes('Ichnofossils') ? DigitalCoreTable.lineDashedArr_5 :
                    addon.table.userGroup.toLowerCase().startsWith('barrick') && src.interval.groupName.startsWith('Alteration') ? DigitalCoreTable.lineDashedArr_6 : DigitalCoreTable.lineDashedArr_3;
                let dashIndex = src.interval.abundance != null ? src.interval.abundance : /*src.abundance*/arrInt.length - 1;
                return arrInt[dashIndex];
            });
    }

    showEditFields(element, src, isVein, windowPosition){
        //hide the tooltip
        let helper = this;
        helper._mouseoutFunc();
        helper._editFields(element,src,isVein, windowPosition);
        $('#hiddenContextIdHolder').val(src.id);
        $('#updateContextButton').click(function (src) {
            helper._updatingInterval();
        });
    }


    /**
     * Draws circle pattern in Alteration and Mineralization tracks
     * It actually appends the circle to the capital I shape and puts text inside
     * @param {any} srcs
     * @param {any} elementClass
     */
    drawCirclePatternOnAccessoryTracks(srcs, elementClass) {
        let helper = this;
        let circleClass = 'dctCircleAcc';
        let fontSize = 0;
        if(srcs.length > 0){
            let firstSrc = srcs[0];
            fontSize = firstSrc.segment.width / 2.5;
        }

        let svgSel = this.parentSelection;
        let sel = svgSel.selectAll('.' + circleClass)
            .data(srcs);

        sel.exit()
            .remove();
        let circleUpdateSel = sel.enter()
            .append('circle')
            .classed(circleClass, true)
            //.classed(DigitalCoreTable.noEventsClass, true)
            .attr('font-size', fontSize)
            .attr('stroke-width', 0)            
            .merge(sel)
            .attr('cx', d => (this.table.striplogAddon == null ? d.x + d.width /2 : 0 ))
            //.attr('cy', d => d.y + d.height / 2)
            .attr('cy', d => (this.table.striplogAddon == null ? d.y + d.height /2 :0))
            .attr('fill', d => d.fill.Color)
            .attr('stroke', 'black')
            .attr('opacity', this.defaultFillOpacity)
            .style('stroke-width', helper._getStrokeWidth())
            .attr('r', d => d.width /(this.table.striplogAddon == null ? 2 : 4)); // radius is half the width of track


        //we take size of text(its rect) as width of track x 50
        let midTextRectHeight = 25;

        sel = svgSel.selectAll('.' + elementClass)
            .data(srcs);
        sel.exit()
            .remove();

        //draws text
        //sel.enter()
        //    .append('text')
        //    .classed(elementClass, true)
        //    .attr('text-anchor', 'middle')
        //    .attr('alignment-baseline', 'middle')
        //    .style('pointer-events', 'none')
        //    .attr('stroke-width', 0)
        //    .merge(sel)
        //    .attr('font-size', (this.table.striplogAddon == null ? fontSize : 5))
        //    .attr('x', d => (this.table.striplogAddon == null ? d.x + d.width / 2 : 0))
        //    .attr('y', d => (this.table.striplogAddon == null ? d.y + d.height / 2 : 0))
        //    .text(d => d.shortName);

        this.fillSelectionWithPattern(circleUpdateSel, 'acc_texture', 'acc', true, true);
    }

    /**
     * Draws labels/text in the middle of the drawn interval
     * If labels cannot fint inside interval , then rotate them vertically(Sept 2020)
     * @param {any} srcs
     * @param {any} elementClass
     */
    drawCenterAlignedLabels(srcs, elementClass) {
        //console.time('drawCenterAlignedLabels')
        let helper = this;
        let bounds = table.viewer.viewport.getBounds();
        let ratio = 1 / 50;
        const minFontSize = DigitalCoreTable.settings.minFontSize;
        const maxFontSize = DigitalCoreTable.settings.maxFontSize;
        let fontSize = ratio * bounds.height;
        //we take size of text(its rect) as width of track x 50
        let midTextRectHeight = 25;

        fontSize = Math.max(fontSize, minFontSize);
        fontSize = Math.min(fontSize, maxFontSize)*1.7;
        //get unique values from array filtered on shortName
        let unique_values = _unique(srcs.map(function (d) { return d ?.shortName }))
        let metrics = _getTextMetrics(unique_values, fontSize);
        let sel = this.parentSelection.selectAll('.' + elementClass)
            .data(srcs);
        sel.exit()
            .remove();
        sel.enter()
            .append('text')
            .classed(elementClass, true)
            .classed(DigitalCoreTable.noEventsClass, true)     
            .classed('noselect',true)            
            .attr('stroke-width', 0)
            .merge(sel)
            .attr('font-size', fontSize)
            //.attr('text-anchor', 'left')
            .attr('x', d => (this.table.striplogAddon == null ? d.x + d.width/2 - fontSize /3 : 0))
            .attr('y', d => (this.table.striplogAddon == null ? d.y + d.height / 2 /*- midTextRectHeight + fontSize/1.2*/ : 0))
            //.attr('transform', d => {
            //    let x = d.x + d.width/2 - fontSize /3;
            //    let y = d.y + d.height / 2 - midTextRectHeight + fontSize/1.2;
            //    return 'rotate(90,' + x + ',' + y + ')'
            //})
            .text(d => d.shortName)
            .each(function (d) {
                if (table.striplogAddon != null)
                    return;
                var text = d3.select(this),
                    len = /*text.node().getComputedTextLength()*/ metrics.find(o => o.text == d.shortName)?.width || 0;
                //if label is greater than track width try to rotate vertically, if it is not fitting still, then remove
                if (len > d.width) {
                    //when we rotate, make sure to get updated height and not using old one, more tracks are on there is a resize
                    //need to change the y attribute ONLY
                    let y = (Math.max(d.y, d.y + d.height / 2 - len / 2));
                    let x = (d.x + d.width / 2 - fontSize / 3);
                    let rtstr = 'rotate(90' + ',' + x + ',' + y + ')';
                    this.setAttribute('y',y)
                    this.setAttribute('transform', rtstr);

                }
                if (len > d.height)
                    text.remove();
            })
            .raise(); 
        //console.timeEnd('drawCenterAlignedLabels')
    }

    /**
 * Draws image in the middle of the drawn interval
 * @param {any} srcs
 * @param {any} elementClass
 */
    drawCenterAlignedImage(srcs, elementClass) {
        let helper = this;
        let bounds = table.viewer.viewport.getBounds();
        let ratio = 1 / 50;
        const minFontSize = DigitalCoreTable.settings.minFontSize;
        const maxFontSize = DigitalCoreTable.settings.maxFontSize;
        let fontSize = ratio * bounds.height;
        //we take size of text(its rect) as width of track x 50
        let midTextRectHeight = 25;

        fontSize = Math.max(fontSize, minFontSize);
        fontSize = Math.min(fontSize, maxFontSize) * 1.7;

        let sel = this.parentSelection.selectAll('.' + elementClass)
            .data(srcs);
        let exitSel = sel.exit()
            .remove();
        let enterSel = sel.enter()
            .append('image')
            .classed(elementClass, true)
            .classed(DigitalCoreTable.noEventsClass, true)
            .attr('stroke-width', 0);

        let updateSel = enterSel.merge(sel)
            .attr("xlink:href", d => d.interval.fill.ResourceStretch)
            .attr('height', d => (this.table.striplogAddon == null ? 100 : 100 / 3))
            .attr('width', d => (this.table.striplogAddon == null ? d.width : d.width / 3))
            .attr('x', d => (this.table.striplogAddon == null ? d.x : 0))
            .attr('y', d => (this.table.striplogAddon == null ? d.y + d.height / 2 - (100 / 3) : 0));
        updateSel.raise();

        return { enterSelection: enterSel, updateSelection: updateSel, exitSelection: exitSel };
    }



    fillSelectionWithGradientColor1(srcs, gradients, elementClass) {

        let helper = this;
        let defsSel = helper.parentSelection
            .select('defs');
        if (srcs.length > 0) {//remove when there are any srcs
            $('rect[id^=rectbehind]').remove();
            //remove old gradients        
            $('linearGradient[id^=lithGradient]').remove();
        }
        let sel = this.parentSelection.selectAll('.' + elementClass)
            .data(srcs);

        let exitSel = sel.exit()
            .remove();

        let enterSel = sel.enter()
            .append('rect')
            .classed(elementClass, true)
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('height', d => d.height)
            .attr('width', d => DigitalCoreTable.grainLabels.find(o => o.name == 'sh').ratio * d.width) // we use width of DigitalCoreTable.grainLabels for sh
            .attr('id', function (d, index) {
                return 'rectbehind' + index;
            });

        //here we create gradients
        gradients.forEach(grd => {
            defsSel.append("svg:linearGradient")
                .attr('id', 'lithGradient_' + grd.gIdx)
                //.attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "0%")
                .attr("y2", "100%")
                .selectAll("stop")
                .data(grd.gData)
                .enter().append("stop")
                .attr("offset", function (d) { return d.offset; })
                .attr("stop-opacity", function (d) { return d.opacity; })
                .attr("stop-color", function (d) { return d.color; });
        })

        let updateSelection = enterSel.merge(sel);
        updateSelection.each(function (src, index) {//srcs are the rectangles behind!
            //let's get the interval lith_
            let intrvl = $("path#lith_" + src.id + '_' + src.intervalGroupIndex);
            //let intrvl = $("path#lith_" + (src.intervalGroupLength == 1 ? src.id : src.id + '_' + src.intervalGroupIndex));
            intrvl.css('fill', 'url(#' + 'lithGradient_' + src.gradIdx + ')');
            //append second rect behind, update its 'behind' color
            $(this).css('fill', src.secondFill.Color);
            $(this).insertBefore(intrvl);
        });
    }





    /**
     * @param {any} srcs
     * @param {any} gradients, data for offsets
     * @param {any} elementClass
     * the lith_ ids are having suffixed digit that specifies its index , we need it to bind with rectbehind
     */
    fillSelectionWithGradientColor(srcs, pttrns, elementClass) {
        let defsSel = this.parentSelection
            .select('defs');
        $('rect[id^=rectbehind]').remove();
        //remove old gradients        
        $('linearGradient[id^=lithGradient]').remove();
        let sel = this.parentSelection.selectAll('.' + elementClass)
            .data(srcs);

        let exitSel = sel.exit()
            .remove();

        let enterSel = sel.enter()
            .append('rect')
            .classed(elementClass, true)
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('height', d => d.height)
            .attr('width', d => DigitalCoreTable.grainLabels.find(o => o.name == 'sh').ratio * d.width) // we use width of DigitalCoreTable.grainLabels for sh
            .attr('id', function (d, index) {
                return 'rectbehind' + index;
            });

        //here we create gradients
        //let choose height of rect
        let rh = 10;
        pttrns.forEach(pttrn => {
            let pattern = defsSel.append("svg:pattern")
                .attr('id', 'grainPttrn_' + pttrn.gAssocId)
                .attr("patternUnits", "userSpaceOnUse")
                .attr('width', '100%')
                .attr('height', '6000');
            pattern.append('rect')
                .attr('x', '0')
                .attr('y', '0')
                .attr('height', 60 * (100 - pttrn.gPercentage))
                .attr('width','100%')
                .attr('fill', pttrn.gFill);
            pattern.append('rect')
                .attr('height', 60 * pttrn.gPercentage)
                .attr('fill', 'transparent');
        })

        let updateSelection = enterSel.merge(sel);
        updateSelection.each(function (src, index) {//srcs are the rectangles behind!
            //let's get the interval lith_
            let intrvl = $("path#lith_" + (src.intervalGroupLength == 1 ? src.id : src.id + '_' + src.intervalGroupIndex));
            intrvl.css('fill', 'url(#' + 'grainPttrn_' + src.id + ')');
            //append second rect behind, update its 'behind' color
            $(this).css('fill', src.secondFill.Color);
            $(this).insertBefore(intrvl);
        });
    }


    drawBlockLeftPath(srcs, elementClass) {
        let addon = this;
        let strokeWidth = 2;
        let sel = this.parentSelection.selectAll('.' + elementClass)
            .data(srcs);

        let exitSel = sel.exit()
            .remove();
        let enterSel = sel.enter()
            .append('path')
            .classed(elementClass, true)
            .classed(DigitalCoreTable.settings.noEventsClass, true)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('opacity', this.defaultFillOpacity)
            // not sure what this does. should be refactored if needed still
            //.on('click', function (src) {
            //    addon._selectTableFillFromId(src.fill.Name);
            //    //if (src.interval.isSampleTrack) { // we select the appropriate row in Sample window
            //    //    addon._selectSampleFillFromId(addon._extractFillNameFromSharedSample(this, src));
            //    //}
            //});
        let updateSel = enterSel.merge(sel)
            .classed(DigitalCoreTable.noEventsClass, true)
            .attr('stroke-width', d => d.showStroke ? strokeWidth: 0)
            //.style('clip-path', d => 'url(#' + d.clipPathId + ')')
            .each(function (src) {
                if (src.interval != null && src.interval.isLithologyTrack) {
                    $(this).css('opacity', '0.7');
                }
              //if we make accessory tracks having a digit appended to the end we can check for that
                // in case of condition Sample with url , don't overwrite fill color
                let isSampleCondition = src.interval != null && src.interval.isSampleTrack && $(this).css('fill').includes('url');
                if (src.interval != null && src.interval.isAccessoryTrack) {
                    $(this).css('stroke', 'white');
                    $(this).css('fill', 'white');
                }
                else if (!isSampleCondition) {
                    let color = src.fill?.Color || '#000000';
                    $(this).css('stroke', 'black');
                    $(this).css('fill', color);
                }
                //assign id to samples
                if (src.interval.isSampleTrack)
                    this.id = 'lith_' + src.interval.id + '_' + src.intervalGroupIndex
            })
            .attr('d', d => {     
                //if (d.height == 0)
                //    return;
                let points = d.points;
                let topLeft = { x: d.x, y:d.y };
                let botLeft = { x: d.x, y:d.y + d.height };
                let topRight = { x: points[0].x, y:d.y };
                let botRight = { x: points[points.length-1].x, y:d.y + d.height };

                // time to get janky here            
                let genericLineFStarter = d3.line()
                    .x(p => p.x)
                    .y(p => p.y);
                // let curvedLineF = genericLineFStarter.curve(d3.curveCardinal);
                let curvedLineF = genericLineFStarter.curve(d3.curveLinear);
                            
                // curved vertical
                let s = curvedLineF(points);

                // Close the path
                let straightLineF = genericLineFStarter.curve(d3.curveLinear);
                //points = [d.points[d.points.length-1], pEnd, p1, d.points[0]];
                points = [botRight, botLeft, topLeft, topRight];
                s += straightLineF(points).replace('M','L');
                s += 'Z';
                return s;
            });          
        return { enterSelection: enterSel, updateSelection:updateSel, exitSelection: exitSel };
    }

    _inBoundsForTooltip1(src, obj) {
        let maxy = Math.max.apply(Math, src.points.map(function (o) { return o.y }));
        let miny = Math.min.apply(Math, src.points.map(function (o) { return o.y }));
        let maxx = Math.max.apply(Math, src.points.map(function (o) { return o.x }));
        let minx = Math.min.apply(Math, src.points.map(function (o) { return o.x }));
        return ((d3.mouse(obj)[0] >= minx - src.width && d3.mouse(obj)[0] < maxx) && (d3.mouse(obj)[1] >= miny && d3.mouse(obj)[1] < maxy - 0.1));
    }


    _inBoundsForTooltip(src, mousePoint) {
        let maxy = Math.max.apply(Math, src.points.map(function (o) { return o.y }));
        let miny = Math.min.apply(Math, src.points.map(function (o) { return o.y }));
        let maxx = Math.max.apply(Math, src.points.map(function (o) { return o.x }));
        let minx = Math.min.apply(Math, src.points.map(function (o) { return o.x }));
        let conditionX = this.table.striplogAddon == null ? (mousePoint[0] >= minx - src.width) && (mousePoint[0] < maxx) : true;
        let conditionY = (mousePoint[1] >= miny) && (mousePoint[1] < maxy/* - 0.1*/);
        //in case of striplog conditionX is true always, no sense check by X, it will be from 0 to 100(striplog)
        return conditionX && conditionY;
    }

    _extractFillNameFromSharedSample(elem,src) {
        let name = src.fill.Name;
        if ($(elem).css('fill').includes('splitpttrn')) {
            //remove brackets and double quotes to get name in last[2] item
            name = $(elem).css('fill').replace(/[{()"}]/g, '').split('_')[2];
        }
        return name;
    }

    _drawIntervalFillers(srcs, elementClass){       
        let fillers = []; 
        srcs = srcs.filter(x => x.interval != null);                
        let groupedByInterval = _(srcs).groupBy(src => src.interval.id + src.segment.getTubeIndex()).toArray();
        groupedByInterval.forEach(g => {
            let groupSrcs = _(g).orderBy(x => x.y).value();
            for(let i = 0; i < groupSrcs.length-1; i++){
                let src1 = groupSrcs[i];
                let src2 = groupSrcs[i+1];
                                
                let points = src1.points;

                let filler = {
                    x: src1.x,
                    width: Math.abs(points[points.length-1].x -src1.x),
                    y: src1.y + src1.height,
                    height: Math.abs(src2.y - (src1.y + src1.height)),
                    fill: src1.fill.Color
                };
                fillers.push(filler);
            }
        });
        this.drawRect(fillers, 'filler' + elementClass);
    }

    _updatingInterval(isVein) {
        //get parameters from edit boxes of context menu
        //check if we got here from context menu
        if ($('#intervalContextId')[0] == null)
            return;
        if (isVein == null || !isVein) {
            let topVal = $('#editTop').val();
            let bottomVal = $('#editBottom').val();
            let descriptionVal = $('#editDescription').val()
            //validate the context form
            let isCond1 = topVal == '' && bottomVal == '' && descriptionVal == '';
            let isCond2 = parseFloat(topVal) > parseFloat(bottomVal);
            if (!isCond1 && !isCond2) {
                this.table.viewer.raiseEvent('update_interval_from_context', {
                    top: parseFloat(topVal),
                    bottom: parseFloat(bottomVal),
                    description: descriptionVal,
                    intervalId: $('#hiddenContextIdHolder').val()
                    //update src
                    //src.interval.start = parseFloat(topVal);
                    //src.interval.stop = parseFloat(bottomVal);
                    //src.interval.description = descriptionVal;
                })
            }
        }
        else {
            //Vein
            let descriptionVal = $('#editDescription').val()
            if (descriptionVal != '') {
                this.table.viewer.raiseEvent('update_vein_from_context', {
                    description: descriptionVal,
                    veinId: $('#hiddenContextIdHolder').val()
                });
            }
            //update src
            //src.description = descriptionVal;

        }
        d3.select('#intervalContextId')
            .style('display', 'none');
    }

    _editFields(elem,src, isVein, windowPosition) {
        if (isVein == null || !isVein) {
            //let start = src.interval.start.toFixed(/*this._getDecimalPlacesRelatedToZoom()*/2);
            //let stop = src.interval.stop.toFixed(/*this._getDecimalPlacesRelatedToZoom()*/2);
            let compName = '';
            let texture='';
            if (src.secondFill == null) { // in case of oil sands lithology
                let name = this._extractFillNameFromSharedSample(elem, src);
                compName = name;
                texture = src.interval.textureId != null ? "Texture:" + this.table.fills.find(f => f.Id == src.interval.textureId).Name : '';
            }
            else {
                compName = src.fill.Name + " " + (100 - src.percentage) + "%";
                texture = "Component:" + src.secondFill.Name + " " + src.percentage + "%";
            }
            $('#editTop').val(src.interval.start);
            $('#editBottom').val(src.interval.stop);
            $('#heightCellValue').text((src.interval.stop - src.interval.start).toFixed(/*this._getDecimalPlacesRelatedToZoom()*/2));
            $('#componentCellValue').text(compName);
            $('#componentTextureCellText').text(texture);
            $('#editDescription').val(src.interval.description);
            $.each($('.intervalTooltip :input.floatRxInput'), function (index, item) {
                $(item).trigger('change');// not firing automatically
            }); 
            //$("#editTop").prop('disabled', false);
            //$("#editBottom").prop('disabled', false);
        }
        else {
            //vein
            $("#editTop").prop('disabled', true);
            $("#editBottom").prop('disabled', true);
            $('#editDescription').val(src.description);
        }

        let pageX = 0;
        let pageY = 0;
        if(windowPosition != null){
            pageX = windowPosition.x;
            pageY = windowPosition.y;
        }
        else if(d3.event != null){
            pageX = d3.event.pageX;
            pageY = d3.event.pageY;
        }
        d3.select('.customContextMenu')
            .style("opacity", "1")
            .style("display", "block")  //The tooltip appears
            .style("left", (pageX) + "px")
            .style("top", (pageY) + "px")
        //d3.select('#intervalContextId')
        //    .transition()  //Opacity transition when the tooltip appears
        //    .duration(500)
        //    .style("opacity", "1")
        //    .style("display", "block")  //The tooltip appears
        //    .style("left", (pageX) + "px")
        //    .style("top", (pageY) + "px")
        //populate fields
    }

    _veinMouseoverFunc(elem, src, isVein) {
        //check if we got here by crossing the interval without actually ending drawing
        this._mouseoutFunc();

        /*we will have tooltip out for now*/
        if(this.table.intervalAddon != null && this.table.intervalAddon.intervalDrawing.currentTool != null){
           return;
        }        
        let _divtooltip = d3.select('body')
           .append('div')
           .attr('id','intervalTooltipId')
           .attr("class", "intervalTooltip")

        _divtooltip
           .transition()  //Opacity transition when the tooltip appears
           .duration(500)
           .style("opacity", "1")
           .style("display", "block")  //The tooltip appears
        _divtooltip
           .html(this._combineHtmlStringForTooltip(elem, src, isVein))
           .style("left", (d3.event.pageX) + "px")
           .style("top", (d3.event.pageY) + "px")
        setTimeout(() => this.hideToolTips(), 2000);
    }

    _mouseoverFunc(elem, src, isVein) {
        //check if we got here by crossing the interval without actually ending drawing
        this._mouseoutFunc();
        // refactor

        /*we will have tooltip out for now*/
        //if(this.table.intervalAddon != null && this.table.intervalAddon.intervalDrawing.currentTool != null){
        //    return;
        //}        
        //let _divtooltip = d3.select('body')
        //    .append('div')
        //    .attr('id','intervalTooltipId')
        //    .attr("class", "intervalTooltip")

        //_divtooltip
        //    .transition()  //Opacity transition when the tooltip appears
        //    .duration(500)
        //    .style("opacity", "1")
        //    .style("display", "block")  //The tooltip appears
        //_divtooltip
        //    .html(this._combineHtmlStringForTooltip(elem, src, isVein))
        //    .style("left", (d3.event.pageX) + "px")
        //    .style("top", (d3.event.pageY) + "px")
        //setTimeout(() => this.hideToolTips(), 2000);
    }

    hideToolTips(){
        this._mouseoutFunc();
    }

    _mouseoutFunc() {
        $("[id^='intervalTooltipId']").remove();
    }

    _getStrokeWidth() {
        return this.table.striplogAddon == null ? 2 : 0.5;
    } 

    /**
     * gets the interval hovered and produces html string for tool tip.
     * Outputs component , halo, texture etc. + top/bottom and height
     * Output html element is the table
     * @param {any} src
     * @param {any} elem
     */
    _combineHtmlStringForTooltip(elem, src, isVein) {
        if (isVein == null) {
            if (src.interval == null)
                return;
            //we build the html manually in the means of row/cells for easy change later
            //if changed be sure to close html tags for td/tr!!!!
            let start = src.interval.start;
            let stop = src.interval.stop;

            let c1 = "Top:" + start.toFixed(this._getDecimalPlacesRelatedToZoom());
            let c2 = "Bottom:" + stop.toFixed(this._getDecimalPlacesRelatedToZoom());
            let c4 = "Height:" + (stop - start).toFixed(this._getDecimalPlacesRelatedToZoom());
            let c3 = '';
            let c5 = '';
            if (src.secondFill == null) { // in case of oil sands lithology
                let name = this._extractFillNameFromSharedSample(elem, src);
                c3 = "Component:" + name;
                c5 = src.interval.textureId != null ? "Texture:" + this.table.fills.find(f => f.Id == src.interval.textureId).Name : '';
            }
            else {
                c3 = "Component:" + src.fill.Name + " " + (100 - src.percentage) + "%";
                c5 = "Component:" + src.secondFill.Name + " " + src.percentage + "%";
            }
            let descr = src.interval.description;
            let descriptionRow = descr != null ? "<tr><td colspan='2'>" + descr + "</td></tr>" : '<tr></tr>';
            let sampleCell = src.interval.sample.idx != null ? "Sample:" + src.interval.sample.idx : '';

            //combine in rows
            let r1 = "<tr><td>" + c1 + "</td><td>" + c3 + "</td></tr>";
            let r2 = "<tr><td>" + c2 + "</td><td>" + c5 + "</td></tr>";
            let r3 = "<tr><td>" + c4 + "</td><td>" + sampleCell + "</td></tr>";

            return "<div id='thumbnail'><table>" + r1 + r2 + r3 + descriptionRow + "</table></div>";
        }
        else if(isVein){
            //it is Vein, do as following
            let c1 = "Fill:" + src.fill.Name;
            let c2 = "Halo:" + src.stroke.Name;
            let textureRow = src.texture != null ? "<tr><td>Texture:" + src.texture.Name + "</td></tr>" : "<tr></tr>";
            let descriptionRow = src.description != null ? "<tr><td colspan='2'>" + src.description + "</td></tr>" : '<tr></tr>';
            //combine in rows
            let r1 = "<tr><td>" + c1 + "</td></tr><tr><td>" + c2 + "</td></tr>";
            r1 += "<tr><td>XRD#:" + src.timing.Name + "</tr></td>";
            return "<div id='thumbnail'><table>" + r1 + textureRow + descriptionRow + "</table></div>";
        }
    }

    _populateDepths(src) {
        if (src.segment != null) {
            let start = src.segment.getDepthFromY(src.interval.start);
            $('#Iframe').contents().find('#topUintBx').val(start.toFixed(this._getDecimalPlacesRelatedToZoom()));
            let stop = src.segment.getDepthFromY(src.interval.stop);
            $('#Iframe').contents().find('#bottomUintBx').val(stop.toFixed(this._getDecimalPlacesRelatedToZoom()));
            $('#Iframe').contents().find('#heightUintBx').val((stop - start).toFixed(this._getDecimalPlacesRelatedToZoom()));
        }
    }

    _getDecimalPlacesRelatedToZoom() {
        let bounds = table.viewer.viewport.getBounds();
        let boundsH = bounds.height;
        let tubeH = DigitalCoreTable.settings.tubeHeight;
        let decimalPlaces = 2;
        if (boundsH > tubeH)
            decimalPlaces = 1;
        else if (boundsH > tubeH * 0.5)
            decimalPlaces = 2;
        else if (boundsH > tubeH * 0.33333)
            decimalPlaces = 3;
        else
            decimalPlaces = 4;
        return decimalPlaces;
    }

    _selectSampleFillFromId(name) {
        this.table.viewer.raiseEvent('select_sample_fill_from_id', { name: name });
    }

    _drawVeins(srcs, elementClass) {
        let helper = this;

        let sel = this.parentSelection.selectAll('.' + elementClass)
            .data(srcs);
        sel.exit()
            .remove();
        return sel.enter()
            .append('path')
            .classed(elementClass, true)
            .classed(DigitalCoreTable.settings.interactiveClass, true)
            //.attr('vector-effect', 'non-scaling-stroke')
            .on('mouseover', function (src) {
                let maxy = Math.max.apply(Math, src.points.map(function (o) { return o.y }));
                let miny = Math.min.apply(Math, src.points.map(function (o) { return o.y }));
                let maxx = Math.max.apply(Math, src.points.map(function (o) { return o.x }));
                let minx = Math.min.apply(Math, src.points.map(function (o) { return o.x }));
                if ((d3.mouse(this)[0] >= minx - src.width && d3.mouse(this)[0] < maxx) && (d3.mouse(this)[1] >= miny && d3.mouse(this)[1] < maxy - 0.1));
                helper._veinMouseoverFunc(this, src,true);
            })
            .on('mouseout', function (src) {
                if (!helper._inBoundsForTooltip(src, d3.mouse(this)))
                    helper._mouseoutFunc();
            })
            .on('contextmenu', function (src) {
                d3.event.preventDefault();
                //hide the tooltip
                helper._mouseoutFunc();
                helper._editFields(this,src, true);
                $('#hiddenContextIdHolder').val(src.id);
                $('#updateContextButton').click(function (src) {
                    helper._updatingInterval(true);
                });
            })
            .each(function (d) {
                this.mouseTracker = new OpenSeadragon.MouseTracker({ element: this });
            })
            .merge(sel)
            .each(function(d){
                if(d.clickHandler != null){
                    this.mouseTracker.clickHandler = d.clickHandler;    
                }
            })
            // .style('clip-path', d => 'url(#' + d.clipPathId + ')')
            .style('opacity', d => d.opacity)
            .attr('fill', d => d.fill.Color)
            .attr('stroke', d => d.stroke.Color)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('stroke-width', /*d => d.strokeWidth*/helper._getStrokeWidth())
            .attr('d', d => helper._lineF(d.points))
    }

    _drawPointVeins(srcs, elementClass) {
        let helper = this;
        let commonF = (eventData, element, segment) => {
            eventData.track = segment.trackTube.track;
        };

        let sel = this.parentSelection.selectAll('.' + elementClass)
            .data(srcs);
        sel.exit()
            .remove();
        return sel.enter()
            .append('circle')
            .classed(elementClass, true)
            .classed(DigitalCoreTable.settings.interactiveClass, true)
            //.attr('vector-effect', 'non-scaling-stroke')
            .on('mouseover', function (src) {
                let maxy = Math.max.apply(Math, src.points.map(function (o) { return o.y }));
                let miny = Math.min.apply(Math, src.points.map(function (o) { return o.y }));
                let maxx = Math.max.apply(Math, src.points.map(function (o) { return o.x }));
                let minx = Math.min.apply(Math, src.points.map(function (o) { return o.x }));
                if ((d3.mouse(this)[0] >= minx - src.width && d3.mouse(this)[0] < maxx) && (d3.mouse(this)[1] >= miny && d3.mouse(this)[1] < maxy - 0.1));
                helper._veinMouseoverFunc(this, src,true);
            })
            .on('mouseout', function (src) {
                if (!helper._inBoundsForTooltip(src, d3.mouse(this)))
                helper._mouseoutFunc();
            })
            .on('contextmenu', function (src) {
                d3.event.preventDefault();
                ////hide the tooltip
                //helper._mouseoutFunc();
                //helper._editFields(this,src, true);
                //$('#hiddenContextIdHolder').val(src.id);
                //$('#updateContextButton').click(function (src) {
                //    helper._updatingInterval(true);
                //});
            })
            .each(function (segment) {
                let element = this;
                if (element.mouseTracker == null) {
                    element.mouseTracker = new OpenSeadragon.MouseTracker({ element: element });
                }

                element.mouseTracker.nonPrimaryPressHandler = eventData => {
                    //populate the fields in slidecontroladdon
                    if (helper.table.mode == 'striplog' && helper.table.parentTable != null) {
                        helper.table.parentTable.viewer.raiseEvent('populateIntervalEditFields', { interval: segment, tblReference: helper.table, track: 'HIRES' })
                    }
                    else
                        helper.table.viewer.raiseEvent('populateIntervalEditFields', { interval: segment, tblReference: helper.table, track: 'HIRES' })
                };
            })
            .merge(sel)
            .each(function (d) {
                if (d.clickHandler != null) {
                    this.mouseTracker.clickHandler = d.clickHandler;
                }
            })
            //.style('clip-path', d => 'url(#' + d.clipPathId + ')')
            .style('opacity', d => d.opacity)
            .attr('fill', d => d.fill.Color)
            .attr('stroke', d => d.stroke.Color)
            //.attr('vector-effect', 'non-scaling-stroke')
            .attr('cx', d => d.points[0].x)
            .attr('cy', d => d.points[0].y)
            .attr('r', d => /*d.radius || 50*/40)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('stroke-width', /*d => d.strokeWidth*/helper._getStrokeWidth())
            .attr('d', d => helper._lineF(d.points))
    }

    fillSelectionWithPattern(updateSelection, patternIdName, srcIdName, enablePattern, isCircle) {
        //check if we have a parent
        if (updateSelection._parents.length == 0)
            return;
        let addon = this;
        updateSelection.exit().remove();
        let drawInCircle = isCircle != null && isCircle; 
        let parentNode = updateSelection._parents[0];
        let defsSel = d3.select(parentNode).select('defs');
        //remove old patterns 
        let $defs = $(parentNode).children('defs');
        $defs.children('pattern[id^=' + patternIdName + ']').remove();
        updateSelection.attr('id', src => {
            let id = srcIdName + '_' + src.id;
            if (src.interval != null /*&& ((src.interval.isSampleTrack || src.interval.isLithologyTrack) && (!(src.intervalGroupIsFirst & src.intervalGroupIsLast)))*/) {
                id += '_' + src.intervalGroupIndex;
            }
            return id;
        })
        updateSelection.each(function (src, index) {
            //create a pattern
            let imgSrc = src?.texture?.ResourceStretch || src?.fill?.ResourceStretch;
                //hardcoded width/height are the size of texture images * 0.01
            if (imgSrc != null) {
                if (addon.table.striplogAddon == null) {
                    let width = 100;
                    let height = 100;
                    let factor = isCircle ? 2 : 10;
                    let pattern = defsSel.append("svg:pattern")
                        .classed('dctTexturePattern',true)
                        .attr('id', patternIdName + '_' + src.id + '_' + index)
                        .attr('width', height * factor)
                        .attr('height', width * factor)
                        .attr('opacity', 1)
                        .attr('preserveAspectRatio', 'none')
                        .attr('patternUnits', 'userSpaceOnUse');
                    pattern.append('rect')
                        .attr('width', height * factor)
                        .attr('height', width * factor)
                        .attr('fill', src.fill.Color);
                    pattern.append('svg:image')
                        .attr('xlink:href', imgSrc)
                        .attr('preserveAspectRatio', 'none')
                        .attr('width', height * factor)
                        .attr('height', width * factor);
                }
                else {
                    let patternViewboxLength = 100;
                    let pattern = defsSel.append("svg:pattern")
                        .attr('id', patternIdName + '_' + src.id + '_'+ index)
                        .classed('dctTexturePattern', true)
                        .attr('viewBox', `0 0 ${patternViewboxLength} ${patternViewboxLength}`)
                        .attr('width', '100%')
                        .attr('height', '10%')
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('opacity', 1)
                        .attr('preserveAspectRatio', 'none')
                        .attr('patternUnits', 'userSpaceOnUse');
                    pattern.append('rect')
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('width', patternViewboxLength)
                        .attr('height', patternViewboxLength)
                        .attr('fill', src.fill.Color);
                    pattern.append('svg:image')
                        .attr('xlink:href', imgSrc)
                        .attr('preserveAspectRatio', 'none')
                        .attr('width', patternViewboxLength)
                        .attr('height', patternViewboxLength);
                }
                if (!drawInCircle)
                    $("path#" + this.id).css('fill', enablePattern ? 'url(#' + patternIdName + '_' + src.id + '_' + index + ')' : 'none');
                else
                    $("circle#" + this.id).css('fill', enablePattern ? 'url(#' + patternIdName + '_' + src.id + '_' + index + ')' : 'none');
                }
            });
    }
}