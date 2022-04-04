var DigitalCoreTable = DigitalCoreTable || {};
DigitalCoreTable.StripLogIntervalAddon = class StripLogIntervalAddon {
    constructor(table){        
        if(table.striplogAddon == null)
            throw "Missing dependency on StriplogAddon";
        if(table.intervalAddon == null)
            throw "Missing dependency on IntervalAddon";            
        
        this.table = table;
        this.table.striplogIntervalAddon = this;
        this.striplogAddon = this.table.striplogAddon;
        this.intervalAddon = this.table.intervalAddon;        
        this.toggleAuPredictionLabels = false; // toggle labels in that track for Barrick
        DigitalCoreTable.settings.defaultTrackWidths.normal = DigitalCoreTable.settings.defaultTrackWidths.normal * 50;
        DigitalCoreTable.settings.defaultTrackWidths.simple = DigitalCoreTable.settings.defaultTrackWidths.simple * 50;
        DigitalCoreTable.settings.defaultTrackWidths.mini =   DigitalCoreTable.settings.defaultTrackWidths.mini * 50;

        this.table.addUpdateHandler(() => {
            this.update();
        });

        this.table.addCurvesLoadedHandler(() => {
            this._addIntervalTracksToStriplog();
        });

        this._decorateResizeCurvePlot();
        this._overrideCreateTrackButton();        
        this._overrideEnableDrawingOnTracks();
        this._overrideGetMouseXDomain();
        this._overrideGetMouseDepth();
        this._overrideStopDrawingOnSegments();
        this._overrideGetSecondSegment();
        this._decorateIntervalAddonUpdate();
    }

    _decorateIntervalAddonUpdate() {
        let original = this.intervalAddon.update.bind(this.intervalAddon);
        this.intervalAddon.update = () => {
            original();
            this.update();
        };
    }    

    // interval drawing
    _overrideEnableDrawingOnTracks(){     
        let addon = this;   
        let intervalDrawing = this.intervalAddon.intervalDrawing;
        let original = intervalDrawing.enableDrawingOnTracks.bind(intervalDrawing);
        intervalDrawing.enableDrawingOnTracks = (trackNames) =>{
            // original();
            let curvePlot = this.striplogAddon.curvePlot;
            let updateSelection = curvePlot.logSvg.selectAll('svg.dctStripLogTrack')
                .filter(track => trackNames.some(tn => track.Name == tn));

            updateSelection.each(function(track){
                let element = this;                
                if(element.mouseTracker == null){
                    element.mouseTracker = new OpenSeadragon.MouseTracker({ element: element });
                }        

                let commonF = eventData => {                    
                    eventData.track = addon.table.getTrackByName(track.Name);
                    eventData.parentSelection = d3.select(this);                                        
                    eventData._segment = addon._getClosestSegmentToEventData(eventData, track.Name);                    
                };                

                element.mouseTracker.dragHandler = eventData => {
                    commonF(eventData);
                    intervalDrawing._startOrContinueDragHandler(eventData, element, eventData._segment);
                };
                element.mouseTracker.dragEndHandler = eventData => {
                    commonF(eventData);
                    intervalDrawing._endDragEventHandler(eventData, element, eventData._segment);
                };
                element.mouseTracker.clickHandler = eventData => {
                    commonF(eventData);
                    intervalDrawing._clickEventHandler(eventData, element, eventData._segment);
                };
                element.mouseTracker.enterHandler = eventData => {
                    commonF(eventData);
                    intervalDrawing._enterHandler(eventData, element, eventData._segment);
                };
                element.mouseTracker.exitHandler = eventData => {
                    commonF(eventData);
                    intervalDrawing._exitHandler(eventData, element, eventData._segment);
                };
                element.mouseTracker.moveHandler = eventData => {
                    commonF(eventData);
                    intervalDrawing._moveHandler(eventData, element, eventData._segment);
                };                
                element.mouseTracker.nonPrimaryPressHandler = eventData => {
                    commonF(eventData);
                    intervalDrawing._nonPrimaryPressHandler(eventData, element, eventData._segment);
                };                
                element.mouseTracker.nonPrimaryReleaseHandler = eventData => {
                    commonF(eventData);
                    intervalDrawing._nonPrimaryPressHandler(eventData, element, eventData._segment);
                    //intervalDrawing._nonPrimaryReleaseHandler(eventData, element, eventData._segment);
                };                                                    
                element.addEventListener('contextmenu', intervalDrawing._fillerContextMenuFunction);
            });
        };
    }    

    _overrideGetMouseDepth(){
        let addon = this;  
        let table = this.table; 
        let intervalDrawing = this.intervalAddon.intervalDrawing;
        let original = intervalDrawing.getMouseDepth.bind(intervalDrawing);
        intervalDrawing.getMouseDepth = (eventData, segment) => {
            //original();            
            let ppx = new OpenSeadragon.Point(eventData.originalEvent.offsetX, eventData.originalEvent.offsetY);                        
            let pviewport = table.pointFromPixel(ppx);        
            let mouseY = pviewport.y;    
            let depth = segment.getDepthFromY(mouseY);
            return depth;
        };
    };

    _overrideStopDrawingOnSegments(){
        let addon = this;
        let intervalDrawing = this.intervalAddon.intervalDrawing;
        let original = intervalDrawing.stopDrawingOnSegments.bind(intervalDrawing);
        intervalDrawing.stopDrawingOnSegments = () =>{
            // original();
            let curvePlot = this.striplogAddon.curvePlot;
            let updateSelection = curvePlot.logSvg.selectAll('svg.dctStripLogTrack')
            updateSelection.each(function(segment) {
                if(this.mouseTracker != null)
                    this.mouseTracker.destroy();
                this.mouseTracker = null;
                this.removeEventListener('contextmenu', self._fillerContextMenuFunction);            
            }).style('cursor', 'default');;
        };
    }

    _overrideGetMouseXDomain(){
        let addon = this;   
        let intervalDrawing = this.intervalAddon.intervalDrawing;
        let original = intervalDrawing._getMouseXDomain.bind(intervalDrawing);
        intervalDrawing._getMouseXDomain = (eventData, segment) =>{
            // original();
            let trackName = eventData.track.name;
            let curvePlotTrack = addon.striplogAddon.curvePlot.logChartModel.Tracks.find(x => x.Name == trackName);
                        
            let xMin = DigitalCoreTable.settings.intervalXMin;
            let xMax = DigitalCoreTable.settings.intervalXMax;
            let xScale = d3.scaleLinear()
                .domain([xMin, xMax])
                .range([0, curvePlotTrack.Width]);
                            
            let mouseX = eventData.position.x;
            let mouseXDomain = xScale.invert(mouseX);
            mouseXDomain = Math.max(xMin, mouseXDomain);
            mouseXDomain = Math.min(xMax, mouseXDomain);    
            return mouseXDomain;            
        };
    }    


    _getClosestSegmentToEventData(eventData, trackName){
        let nearestSegment = null;
        let y = this.table.viewer.viewport.windowToViewportCoordinates(new OpenSeadragon.Point(0,eventData.originalEvent.offsetY)).y;
        let depth = this.striplogAddon.yScale.invert(y);

        let track = this.table.getTrackByName(trackName);
        if(track.isVisible){
            nearestSegment = this.table.getSegmentClosestToDepth(depth, trackName);        
        }
        else{
            nearestSegment = this.table.getSegmentClosestToDepth(depth, this.table.defaultImageTrack);        
        }        
        
        return nearestSegment;
    }

    _overrideGetSecondSegment(){     
        let addon = this;   
        let intervalDrawing = this.intervalAddon.intervalDrawing;
        intervalDrawing._getSecondSegment = (eventData, initialSegment) =>{
            let trackName = eventData.track.name;
            let nearestSegment = addon._getClosestSegmentToEventData(eventData, trackName);  
            return nearestSegment;
        };
    }    

    _overrideCreateTrackButton(){
        this.table._createTrackButtons = () => {};
    }

    _addDefaultTrackToTemplate(template,type) {
        template = template || this.table.defaultChart;
        let tracks = template.Tracks;

        //template being passed in is == welltools/db chart namespace
        //this.table.tracks == core table layout
        let trackToAdd = {};
        trackToAdd = _.cloneDeep(tracks[0]);
        trackToAdd.Id = uuidv1();
        trackToAdd.Name = '';
        trackToAdd.ShowAxis = false;
        trackToAdd.Position = Math.max.apply(Math, tracks.map(function (o) { return o.Position; })) + 1;
        trackToAdd.Series = [];
        trackToAdd.Type = type;
        trackToAdd.Collapsed = true;//it is interval track being added
        trackToAdd.CollapsedCT = true;
        trackToAdd.Width = 125;
        tracks.push(trackToAdd);
        return trackToAdd;
    }

    _addIntervalTrackToTemplateU(template, trackname, tracktype) {
        template = template || this.table.defaultChart;
        let tracks = template.Tracks;

        //template being passed in is == welltools/db chart namespace
        //this.table.tracks == core table layout
        let trackToAdd = {};
        trackToAdd = _.cloneDeep(tracks[0]);
        trackToAdd.Id = uuidv1();
        trackToAdd.Name = trackname;
        trackToAdd.ShowAxis = false;
        trackToAdd.Position = Math.max.apply(Math, tracks.map(function (o) { return o.Position; })) + 1;//tracks.length;
        trackToAdd.Series = [];
        trackToAdd.Type = 'IntervalTrack';
        trackToAdd.Collapsed = true;//it is interval track being added
        trackToAdd.CollapsedCT = true;
        trackToAdd.Width = 70;
        if (this.table.descriptionTracks.some(o => o.name == trackname))
            trackToAdd.Width = DigitalCoreTable.settings.striplogAccessoryTrackWidth * 3;
        else if (tracktype == 'AccessoryTrack')
            trackToAdd.Width = DigitalCoreTable.settings.striplogAccessoryTrackWidth;
        else if (tracktype=='LithologyTrack') {
            trackToAdd.Width = DigitalCoreTable.settings.striplogNotInUseTrackWidth;//300;    
        }
        tracks.push(trackToAdd);
    }

    _addIntervalTrackToTemplate(template, track) {
        template = template || this.table.defaultChart;
        let tracks = template.Tracks;

        //template being passed in is == welltools/db chart namespace
        //this.table.tracks == core table layout
        let trackToAdd = {};
        trackToAdd = _.cloneDeep(tracks[0]);
        trackToAdd.Id = uuidv1();
        trackToAdd.Name = track.name;
        trackToAdd.ShowAxis = false;
        trackToAdd.Position = Math.max.apply(Math, tracks.map(function (o) { return o.Position; })) + 1;//tracks.length;
        trackToAdd.Series = [];
        trackToAdd.Type = track.constructor.name;
        trackToAdd.Collapsed = true;//it is interval track being added
        trackToAdd.CollapsedCT = true;
        trackToAdd.Width = 70;
        if (this.table.descriptionTracks.some(o => o.name == track.name))
            trackToAdd.Width = DigitalCoreTable.settings.striplogAccessoryTrackWidth * 3;
        else if (track.isAccessoryTrack)
            trackToAdd.Width = DigitalCoreTable.settings.striplogAccessoryTrackWidth;
        else if (track.hasX) {
            trackToAdd.Width = DigitalCoreTable.settings.striplogNotInUseTrackWidth;//300;    
        }
        tracks.push(trackToAdd);
    }

    _addIntervalTracksToStriplog(template) {
        template = template || this.table.defaultChart;
        let tracks = template.Tracks;

        //template being passed in is == welltools/db chart namespace
        //this.table.tracks == core table layout
        let filtered = this.table.tracks.filter(x => !x.isPhoto || x.name == 'HIRES');
        filtered.forEach(track => {
            if (tracks.some(x => x.Name == track.name || track.name == ''))
                return;
            let trackToAdd = {};
            trackToAdd = _.cloneDeep(tracks[0]);
            trackToAdd.Id = uuidv1();
            trackToAdd.Name = track.name;
            trackToAdd.ShowAxis = false;
            trackToAdd.Position = /*tracks.length*/Math.max(...tracks.map(o => o.Position))+1;
            trackToAdd.Series = [];
            trackToAdd.Collapsed = true;//track.name == 'HIRES' ? false : true;
            trackToAdd.CollapsedCT = true;//track.name == 'HIRES' ? false : true;
            trackToAdd.Type = track.constructor.name;
            trackToAdd.Width = 70;
            if (this.table.descriptionTracks.some(o => o.name == track.name))
                trackToAdd.Width = DigitalCoreTable.settings.striplogAccessoryTrackWidth * 3;
            else if (track.isAccessoryTrack)
                trackToAdd.Width = DigitalCoreTable.settings.striplogAccessoryTrackWidth;
            else if (track.hasX) {
                trackToAdd.Width = DigitalCoreTable.settings.striplogNotInUseTrackWidth;//300;    
            }
            tracks.push(trackToAdd);
        });
    }
    
    clearDuplicates(){
        let tracks = this.table.defaultChart.Tracks;
        //need to add a bool for accessory track in order to hide it later in menu                
        _(tracks).groupBy(t => t.Name).map(x => x).value().forEach(g => {
            g.forEach((t,i) => {
                if(i > 0){
                    let index = tracks.indexOf(t);
                    tracks.splice(index, 1);
                }
            });
        });
    }

    _updateBarrickAuPredictionTrack() {
        var addon = this;
        let curvePlot = this.striplogAddon.curvePlot;
        if (curvePlot != null) {
            let plotHeightOsd = parseFloat(curvePlot.logSvg.attr('height'));
            let plotWidthOsd = parseFloat(curvePlot.logSvg.attr('width'));
            let plotWidthPx = curvePlot.getFixedPixelWidth();
            let plotHeightPx = plotHeightOsd / plotWidthOsd * plotWidthPx;
            let matchTrackWidth = 100; // regardless the size of the track, scale the size as if it's 100px wide - this allows us to set font sizes scaled roughly like word font sizes

            curvePlot.logSvg.selectAll('text.dctIntervalLabels')
                .attr('dominant-baseline', 'middle') // to help center vertically
                .attr('text-anchor', 'middle') // to help center horizontally
                .attr('transform', function (d) {
                    let track = d3.select(this.parentElement).datum();
                    let trackWidthPx = track.Width;
                    let skew = trackWidthPx / plotHeightPx;
                    let scale = matchTrackWidth / trackWidthPx;

                    let y = d.y + d.height / 2;
                    let x = d.x + d.width / 2;
                    let s = `translate(${x},${y}) scale(${scale},${skew * scale})`;
                    return s;
                })
                .attr('font-size', function (d) {
                    let track = d3.select(this.parentElement).datum();
                    let s = track.Name == 'Au Prediction' && addon.toggleAuPredictionLabels ? 0 : 12;
                    return s;
                })
        }
    }

    _updateIntervalTracks() {
        var addon = this;
        let curvePlot = this.striplogAddon.curvePlot;
        if (curvePlot != null) {
            let plotHeightOsd = parseFloat(curvePlot.logSvg.attr('height'));
            let plotWidthOsd = parseFloat(curvePlot.logSvg.attr('width'));
            let plotWidthPx = curvePlot.getFixedPixelWidth();
            let plotHeightPx = plotHeightOsd / plotWidthOsd * plotWidthPx;
            let matchTrackWidth = 100; // regardless the size of the track, scale the size as if it's 100px wide - this allows us to set font sizes scaled roughly like word font sizes

            curvePlot.logSvg.selectAll('text.dctIntervalLabels, text.dctAccessoryLabels')
                .attr('dominant-baseline', 'middle') // to help center vertically
                .attr('text-anchor', 'middle') // to help center horizontally
                .attr('transform', function (d) {
                    let track = d3.select(this.parentElement).datum();
                    let trackWidthPx = track.Width;
                    let skew  = trackWidthPx / plotHeightPx;
                    let scale = matchTrackWidth / trackWidthPx;  
                    
                    let y = d.y + d.height / 2;
                    let x = d.x + d.width / 2;
                    let s = `translate(${x},${y}) scale(${scale},${skew * scale})`;
                    return s;
                })
                .attr('font-size', function (d) {
                    let track = d3.select(this.parentElement).datum();
                    let s = track.Name == 'Au Prediction' && addon.toggleAuPredictionLabels ? 0 : 12;
                    return s;
                })

            curvePlot.logSvg.selectAll('text.dctDescriptionLabel')
                .attr('dominant-baseline', 'middle') // to help center vertically
                //.attr('text-anchor', 'middle') // to help center horizontally
                .attr('transform', function (d) {
                    let track = d3.select(this.parentElement).datum();
                    let trackWidthPx = track.Width;
                    let skew = trackWidthPx / plotHeightPx;
                    let scale = matchTrackWidth / trackWidthPx;

                    let y = d.y;
                    let x = d.x + track.Width / 2;
                    let s = `translate(${d.x},${y}) scale(${scale},${skew * scale})`;
                    return s;
                })
                .attr('font-size', 12)


            curvePlot.logSvg.selectAll('circle.dctCircleAcc')
                .attr('transform', function (d) {
                    let track = d3.select(this.parentElement).datum();
                    let trackWidthPx = track.Width;
                    let skew = trackWidthPx / plotHeightPx;
                    let scale = matchTrackWidth / trackWidthPx;

                    let y = d.y + d.height / 2;
                    let x = d.x + d.width / 2;
                    let s = `translate(${x},${y}) scale(${scale},${skew * scale})`;
                    return s;
                })
                //.attr('r', 8);

            curvePlot.logSvg.selectAll('text.dctTextInCircle')
                .attr('transform', function (d) {
                    let track = d3.select(this.parentElement).datum();
                    let trackWidthPx = track.Width;
                    let skew = trackWidthPx / plotHeightPx;
                    let scale = matchTrackWidth / trackWidthPx;

                    let y = d.y + d.height / 2;
                    let x = d.x + d.width / 2;
                    let s = `translate(${x},${y}) scale(${scale},${skew * scale})`;
                    return s;
                })
                .attr('font-size', 9)
                .attr('stroke-width',0);

            curvePlot.logSvg.selectAll('text.dctSampleCount')
                .attr('font-size', 10)
                .attr('text-anchor','middle')
                 .attr('transform', function (d) {
                     let track = d3.select(this.parentElement).datum();
                     let trackWidthPx = track.Width;
                     let skew = trackWidthPx / plotHeightPx;
                     let scale = matchTrackWidth / trackWidthPx;

                     let y = d.y + d.height / 2;
                     let x = d.x + d.width / 2 - parseInt($(this).attr('font-size'))/3;
                     let s = `translate(${x},${y}) scale(${scale},${skew * scale})`;
                     return s;
                 })

            curvePlot.logSvg.selectAll('image.dctAccessoryImage')
                .attr('transform', function (d) {
                    let track = d3.select(this.parentElement).datum();
                    let trackWidthPx = track.Width;
                    let skew = trackWidthPx / plotHeightPx;
                    let scale = matchTrackWidth / trackWidthPx;

                    let y = d.y + d.height / 2 - (parseFloat(this.getAttribute('height') *skew*scale/2)) ;
                    let x = d.x + d.width / 2 - d.width/3;
                    let s = `translate(${x},${y}) scale(${scale},${skew * scale})`;
                    return s;
                })

            curvePlot.logSvg.selectAll('pattern[id ^= ' + 'splitpttrn]')
                //.attr('viewbox', '0 0 100 100')
                .attr('width', '1')
                .attr('height','1')
                .attr('x', 0)
                .attr('y', 0)
                .attr('stroke-width', 0)
            curvePlot.logSvg.selectAll('path.upper_split,path.lower_split')
                .attr('stroke-width', 0)

            curvePlot.logSvg.selectAll('rect.dctintervalcontact')
                .attr('transform', function (d) {
                    let track = d3.select(this.parentElement).datum();
                    let trackWidthPx = track.Width;
                    let skew = trackWidthPx / plotHeightPx;
                    let scale = matchTrackWidth / trackWidthPx;

                    let y = d.y + d.height;
                    let x = 0;
                    let s = `translate(${x},${y}) scale(${scale},${skew * scale})`;
                    return s;
                })
        }
    }


    _decorateResizeCurvePlot(){
        let original = this.striplogAddon.resizeCurvePlot.bind(this.striplogAddon);
        this.striplogAddon.resizeCurvePlot = () =>{
            original();
            this._updateDescription();
            this._updateIntervalTracks();
        };
    }

    _updateClipPaths(srcs, parentSel){
        let curvePlot = this.striplogAddon.curvePlot;
        if(curvePlot == null)
            return;            

        // Create container if needed
        let container = parentSel.select('defs')
            .select('g.dctIntervalClipPathContainer');
        if(container.node() == null){
            container = parentSel.select('defs')
                .append('g')
                .classed('dctIntervalClipPathContainer', true);
        }

        // Create / update / remove clip paths
        let idPrefix = 'dctIntervalClipPath';
        let sel = container.selectAll('clipPath')
            .data(srcs);
        let enterSel = sel.enter()
            .append('clipPath');
        enterSel.append('rect');
        sel.exit()
            .remove();
        let updateSel = sel.merge(enterSel)
            .attr('id', d => idPrefix + d.interval.id)
            .select('rect')
            .attr('x', d => d.x)
            .attr('width', d => d.width)
            .attr('y', d => d.y)
            .attr('height', d => d.height);
        
        // assign clip paths
        // let selectors = ['text.dctIntervalLabels', 'circle.dctCircleAcc', 'text.dctSampleCount', 'text.dctTextInCircle'];
        // parentSel.selectAll(selectors.join(','))
        //     .attr('clip-path', d => `url(#${idPrefix + d.id})`);

        // you are here 
        // can maybe just use the property instead of elements
        // need to nest targets in gs to avoid transformation issues
    }

    _updateDescription() {
        let addon = this;
        let curvePlot = this.striplogAddon.curvePlot;

        d3.selectAll('#dctlithologyguidelinespattern').remove();
        if (curvePlot != null) {
            curvePlot.logSvg.selectAll('svg.dctStripLogTrack').each(function (track) {
                let groupName = track.Name;
                let parentSel = d3.select(this);
                let srcs = [];
                if (track.Type == 'LithologyTrack' || track.Type == 'IntervalTrack') {
                    srcs = addon.intervalAddon.getIntervalSrcs(addon.intervalAddon.table.descriptionTracks.some(o => o.name == groupName) ? '*' : groupName != null ? groupName : '-XX')//-XX for no srcs at all, there is no such track name
                }

                if (addon.intervalAddon.table.descriptionTracks.some(o => o.name == groupName)) {
                    addon.intervalAddon.intervalDrawing.draw([], parentSel);//we need to clean 
                    //we need to update the width of description track for each srcs
                    srcs.forEach(src => src.descriptWidth = track.Width);
                    let dt = addon.intervalAddon.table.descriptionTracks.find(o => o.name == groupName);
                    let filteredSrcs = dt != null ? srcs.filter(o => dt.tracksForDescription.some(x => x == o.interval.groupName)) : [];
                    addon.intervalAddon.intervalDrawing.drawDescription(filteredSrcs, parentSel);
                }
            });
            //this._updateIntervalTracks();
        }
    }

    update(){
        let addon = this;
        let curvePlot = this.striplogAddon.curvePlot;

        d3.selectAll('#dctlithologyguidelinespattern').remove();
        if(curvePlot != null){
            curvePlot.logSvg.selectAll('svg.dctStripLogTrack').each(function(track) {
                let groupName = track.Name;
                let parentSel = d3.select(this);
                let srcs = [];
                if (track.Type == 'LithologyTrack' || track.Type == 'IntervalTrack') {
                    srcs = addon.intervalAddon.getIntervalSrcs(addon.intervalAddon.table.descriptionTracks.some(o => o.name == groupName) ? '*' : groupName != null ? groupName : '-XX')//-XX for no srcs at all, there is no such track name
                }                

                if (addon.intervalAddon.table.descriptionTracks.some(o => o.name == groupName)) {  
                    addon.intervalAddon.intervalDrawing.draw([], parentSel);//we need to clean 
                    //we need to update the width of description track for each srcs
                    srcs.forEach(src => src.descriptWidth = track.Width);
                    let dt = addon.intervalAddon.table.descriptionTracks.find(o => o.name == groupName);
                    let filteredSrcs = dt != null ? srcs.filter(o => dt.tracksForDescription.some(x => x == o.interval.groupName)) : [];
                    addon.intervalAddon.intervalDrawing.drawDescription(filteredSrcs, parentSel);
                }
                else {
                    addon.intervalAddon.intervalDrawing.draw(srcs, parentSel);
                    addon._updateClipPaths(srcs, parentSel);

                }
            });            
            this._updateIntervalTracks();
        }
    }


};