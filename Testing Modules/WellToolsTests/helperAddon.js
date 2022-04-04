var DigitalCoreTable = DigitalCoreTable || {};

function _populateOptionsInDocument(destinationHolder, destinationSelectElement, text, markSelected) {
    var sel = document.getElementById(destinationHolder).contentWindow.document.getElementById(destinationSelectElement);

    if (text != '') {
        // create new option element
        var opt = document.createElement('option');
        // create text node to add to option element (opt)
        opt.appendChild(document.createTextNode(text));
        // set value property of opt
        opt.value = 'option value';
        opt.selected = markSelected;
        // add opt to end of select box (sel)
        sel.appendChild(opt);
    }
    else {
        sel.selectedIndex = 0;
    }
}

function _removeOptionFromDocument(destinationHolder, destinationSelectElement, index) {
    var sel = document.getElementById(destinationHolder).contentWindow.document.getElementById(destinationSelectElement);
    sel.remove(index);
}

function _clearOptionsFromDocument(destinationHolder, destinationSelectElement) {
    var sel = document.getElementById(destinationHolder).contentWindow.document.getElementById(destinationSelectElement);
    sel.options.length = 0;
}

function _getBaseNameFromAccessoryTrackName(accessoryTrackName) {
    return accessoryTrackName != null ? accessoryTrackName.slice(0, -1) : null;
}

function _getBaseNameFromTrackNames(trackNames) {
  return trackNames.map(function (item)
    { return item.slice(-1) >= '0' && item.slice(-1) <= '9' ? item.slice(0, -1) : item })
}

function _isAccessoryTrack(track,trackname) {
    let regexp = /\d+$/;///(^\w+\d$)|(^\w+\s\w+\d$)/;
    return track.Type || track.constructor.name == 'IntervalTrack' ? regexp.test(trackname) : false; 
    //return trackname.slice(-1) >= '0' && trackname.slice(-1) <= '9';
}

function _replaceSpaceWithUnderscore(str) {
    return str.replace(/\s+/g, "_");
}

function _getCombinedNameForTexturesInDB(trackName) {
    return trackName.replace(/\s+/g, "_") + '_TEX';
}

function _createGradientFromSrcs(srcs) {
    //first we group the srcs by interval.id
    let groupedByIntervalId = _(srcs).groupBy(src => src.interval.id).toArray();
    let gradients = [];
    let ind = 0;
    groupedByIntervalId.forEach(g => {
        //let's put up some logic here depending on the user selected percentage
        /*let's default to 3 ranges 0-33.33, 33.33-66.66,66.66-100 that is parameter
         * there are two color swaps in each range main color and transparent .
        */
        let ranges = 10;// this is also for number of rectangles, how much ranges in 100%
        // let firstInterval = g[0];
        let lith1Height = g[0].height / 100 * (ranges - (g[0].percentage / ranges)); // this height will be needed for consecutive tubes
        let lith2Height = g[0].height / 100 * (g[0].percentage / ranges);
        g.forEach(interval => {
            if (interval.intervalGroupIndex > 0) // it is not the first member, change the ranges for consistent height of grains
            {
                //take the height of first interval in group and get its lith1 height that will be used in other group members
                //let heightOfLith1 = firstInterval.percentage * firstInterval.height / 10; // 10 as ranges
                ranges = Math.round(interval.height / (lith1Height + lith2Height));
            }
            let step = 100 / ranges; // in percents
            let mainColorStep = step * g[0].percentage / 100;

            //generate data object with step
            var objData = [];
            let fillColor = g[0].fill.Color;
            let opc = "1";
            for (var rangeIdx = 1; rangeIdx <= ranges; rangeIdx++) {
                let upperBoundary = rangeIdx * step;
                let offs = upperBoundary - mainColorStep;
                objData.push({ offset: offs.toFixed(1) + "%", color: fillColor, opacity: opc }),
                    fillColor = fillColor == g[0].fill.Color ? 'none' : g[0].fill.Color;
                opc = fillColor == 'none' ? "0" : "1";
                objData.push({ offset: offs.toFixed(1) + "%", color: g[0].fill.Color, opacity: opc }, { offset: upperBoundary.toFixed(1) + "%", color: g[0].fill.Color, opacity: opc });
                fillColor = fillColor == g[0].fill.Color ? 'none' : g[0].fill.Color;
                opc = fillColor == 'none' ? "0" : "1";
                objData.push({ offset: upperBoundary.toFixed(1) + "%", color: g[0].fill.Color, opacity: opc });
            }
            //assign that data to each item in the group
            interval.gradIdx = ind;

            gradients.push({ gData: objData, gIdx: ind });
            ind++;
        })
    })
    return gradients;
}



function _createGrainSizePatternsFromSrcs(srcs) {
    //first we group the srcs by interval.id
    let groupedByIntervalId = _(srcs).groupBy(src => src.interval.id).toArray();
    let patterns = [];
    groupedByIntervalId.forEach(g => {
        //let's put up some logic here depending on the user selected percentage
        /*let's default to 3 ranges 0-33.33, 33.33-66.66,66.66-100 that is parameter
         * there are two color swaps in each range main color and transparent .
        */

        patterns.push({
            gPercentage: g[0].percentage,
            gFill: g[0].fill.Color,
            gSecondFill: g[0].secondFill.Color,
            gAssocId: g[0].id
        });
    })
    return patterns;
}

/**
 * @param {any} txtArr , array of strings
 * @param {any} fontSize
 */
function _getTextMetrics(txtArr, fontSize, units = 'px') {
    //let a = window.performance.now();
    //we need to combine array of names , since we have only few distinct names , there is no
    // need to loop thru each  one and measure its width, we can measure width for each one of that few distinct
    // and provide the measurement when needed
    let dictionaryOfSizes = [];

    //var canvas = document.createElement('canvas');
    var context = /*canvas.getContext('2d')*/$('canvas')[0].getContext('2d');
    context.font = fontSize + units +' ' + $('html').css('font-family');
    txtArr.forEach(name => {
        dictionaryOfSizes.push({ text: name, width: context.measureText(name).width });
    })
    //canvas.remove();
    //let b = window.performance.now();
   // console.log((b - a));
    //return context.measureText(text).width;
    return dictionaryOfSizes;
}

function _unique(x) {
    return x.reverse().filter(function (e, i, x) { return x.indexOf(e, i + 1) === -1; }).reverse();
}


function getDistanceFromPointToRect(pointX, pointY, rectX, rectY, rectW, rectH) {
    let rectX2 = rectX + rectW;
    let rectY2 = rectY + rectH;
    var dx = Math.max(rectX - pointX, 0, pointX - rectX2);
    var dy = Math.max(rectY - pointY, 0, pointY - rectY2);
    return Math.sqrt(dx*dx + dy*dy);
}

function getGapsInIntervalTracks(intervals) {
    let gapsIntervals = [];
    //remove the condition later if it always true!!!
    for (let i = 0; i < intervals.length - 1; i++) {
        //stop should be same as start of next
        let stop = intervals[i].stop;
        let start = intervals[i + 1].start;
        if (start - stop > DigitalCoreTable.settings.lostCoreThreshold)
            gapsIntervals.push({ start: stop, stop: start, length: start - stop });
    }
    return gapsIntervals;
}  

function roundTo(num, x) {
    return +(Math.round(num + "e+" +x) + "e-" + x);
}

function join(t, a, s) {
    function format(m) {
        let f = new Intl.DateTimeFormat('en', m);
        try {
            return f.format(t);
        }
        catch (err) {
            console.log('problem with datetime stamp, replacing with current date' + err)
            return f.format(new Date());
        }
    }
    return a.map(format).join(s);
}

