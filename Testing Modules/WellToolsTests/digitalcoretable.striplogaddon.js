var DigitalCoreTable = DigitalCoreTable || {};
DigitalCoreTable.StripLogAddon = class StripLogAddon  {
   constructor(table){             
       this.table = table;      
       table.striplogAddon = this;
       this.curvePlot = null;
       this.scaleControl = null;  
       this.yScale = null;       
       
       this._overrideUpdateWellModel();
       this._overrideGetOsdImageSrcs();       
       this._decorateResetTracks();       
       this._overrideCreateCurveButtons();
       this._overrideCreateOverlayButtons();
    //    this._decorateSetLoading();
       this.table.addCurvesLoadedHandler(async d => {            
           await this.loadCurveLogs();  
           //add striplog holder for trackpositioncontrol
            this.table.setLoading(false);
       });
       this.table.addInitializedHandler(() => {
           //this._createHyperSpectralButton();
       });
       this.table.addUpdateHandler(() => {
            this.update();
       });       
       DigitalCoreTable.settings.spaceBetween = 0;    
   }

//    _decorateSetLoading(){
//         let original = this.table.setLoading.bind(this.table);
//         this.table.setLoading = (isLoading) =>{                        
//             isLoading = isLoading || !this.table.isCurvesLoaded || !this.table.isInitialized;
//             original(isLoading);            
//         }; 
//    } 

   // move the hires to the end instead of the start
   // also fatten our logging tracks
   _decorateResetTracks(){
       let original = this.table.resetTracks.bind(this.table);
       this.table.resetTracks = () =>{
           original();
           let temp = this.table.tracks[0];
           this.table.tracks.splice(0,1);
           this.table.tracks.push(temp);
       };
   }

   _overrideCreateCurveButtons(){
       let original = this.table.createCurveButtons.bind(this.table);
       this.table.createCurveButtons = () => {
           //original();
           // do nothing
       };
   }

   _overrideCreateOverlayButtons(){
    this.table._createOverlayButtons = () => {
        // do nothing
    };
}   

   _overrideUpdateWellModel(){
       ///let original = this.table.updateWellModel.bind(this.table);
       this.table.updateWellModel = (well) => {
            return this.updateWellModel(well);
       };
   }

   _overrideGetOsdImageSrcs(){
       this.table.getOSDImageSrcs = () => {
           return this.getOSDImageSrcs();
       };
    }

    _sortVisibleTracksByPosition() {
        //getting the tracks and resorting the array 
        let filteredTracks = this.curvePlot.logChartModel.Tracks.filter(o => !o.Collapsed).sort((a, b) => a.Position - b.Position)
        var grps = _.groupBy(filteredTracks, x => (x.Name != null && x.Name.slice(-1) >= '0' && x.Name.slice(-1) <= '9') ? _getBaseNameFromAccessoryTrackName(x.Name) : x.Name)
        var arrObj = [];
        Object.keys(grps).forEach((group, index) => {
            arrObj.push({ name: group, ind: index })
        });
        return arrObj;
    }

    _createStriplogTrackControl() {
        var addon = this;
        let id = 'dctTrackPositionControl';
        if ($('div#' + id).length == 0) {
            this.table.createAnchoredControlDiv(id, OpenSeadragon.ControlAnchor.TOP_LEFT);
            var $table = $('<table>', { id: 'tblTrackPositionControl' }).addClass('draggable droppable ui-sortable').css({ 'backgroundColor': 'white','display':'none'});
            var $tbody = $('<tbody>').addClass('draganddrop').css('display','block').css('overflow','auto');
            $table.append($tbody);
            $('div#' + id).append($('<button class="btnRibbon" id="btnCloseTrackPositionController" style="float:right"><img width="30" class="btnImage" style="float:right" height="20" src="./images/close.png"></button>')).append($table);
        }
        else
            $('table#tblTrackPositionControl > tbody tr').remove();
        var $trs = $();
        let filteredTracks = this.curvePlot.logChartModel.Tracks.filter(o => !o.Collapsed).sort((a, b) => a.Position - b.Position)
        var grps = _.groupBy(filteredTracks, x => (x.Name != null && x.Name.slice(-1) >= '0' && x.Name.slice(-1) <= '9') ? _getBaseNameFromAccessoryTrackName(x.Name) : x.Name)
        var grpArray = [];
        Object.keys(grps).forEach((group, index) => {
            let $tr = $('<tr/>', { class: 'table-row' });
            $tr.append($('<td/>').css({ 'white-space':'nowrap'}).text(group).add($('<td/>').text(index).css('display','none').addClass('index')));
            $trs = $trs.add($tr);
            //grpArray.push({name:group,ind:index })
        });
        grpArray = this._sortVisibleTracksByPosition();
        //Append all TRs to the container.
        $('table#tblTrackPositionControl > tbody').append($trs);
        $('div#' + id).show();
        //set the height of tbody to be less than window.innerHeight
        $('table#tblTrackPositionControl > tbody').css('max-height', window.innerHeight + 'px')
        //handling sort
        var fixHelperModified = function (e, tr) {
            var $originals = tr.children();
            var $helper = tr.clone();
            $helper.children().each(function (index) {
                $(this).width($originals.eq(index).width())
            });
            return $helper;
        },
            updateIndex = function (e, ui) {
                // gets the new and old index then removes the temporary attribute
                //check if we have accessory track
                var destTrack = addon.curvePlot.logChartModel.Tracks.find(o => o.Name == grpArray[ui.item.index()].name || (o.Name == grpArray[ui.item.index()].name + '0'));
                let sTrackName = grpArray[Number($(this).attr('prevIndex'))].name;
                var sourceTrack = addon.curvePlot.logChartModel.Tracks.find(o => o.Name == sTrackName || (o.Name == sTrackName+'0'));
                //if accessory tracks, take the first track
                if (destTrack != null && sourceTrack != null) {
                    addon.table.plotControlsAddon._shiftStriplogTracks(sourceTrack, destTrack);
                    grpArray = addon._sortVisibleTracksByPosition();
                }
                $(this).attr('prevIndex', null);
                $('td.index', ui.item.parent()).each(function (i) {
                    $(this).html(i);
                });
            },
        assignSource = function (e, ui) {
            // creates a temporary attribute on the element with the old index
            $(this).attr('prevIndex',ui.item.index());
        }

        $("table#tblTrackPositionControl tbody").sortable({
            helper: fixHelperModified,
            stop: updateIndex,
            start: assignSource
        }).disableSelection();
        $('button#btnCloseTrackPositionController').on('click', function () {
            //close the controller
            $('div#' + id).hide();
        })

    }

   _createScaleControl(){
        var control = this.table.createAnchoredControlDiv('dctScaleControl',OpenSeadragon.ControlAnchor.ABSOLUTE);        
        let sel = d3.select(control);
        sel.classed('noselect', true)
        d3.select(control.parentElement).style('pointer-events','none');
        let scaleClass = 'dctCurvePlotScale'        
        sel.style('top', '55vh');
        
        sel.append('svg')
            .attr('viewBox', '0 0 100 100')
            .attr('preserveAspectRatio', 'none')
            .classed(scaleClass, true);       
        sel.select('svg')
            .append('path')
            .attr('d', 'M20,0L100,0L100,100L20,100')
            .attr('vector-effect', 'non-scaling-stroke')
            .classed(scaleClass, true);
        sel.append('span')
            .classed(scaleClass, true);         
        this.scaleControl = sel;
   }

   getOSDImageSrcs(segments){               
       segments = segments || this.table.getSegmentsOfType(this.table.defaultImageTrack);
       // don't load hires for longer wells or when depth correcting
       this.showTiles = segments.length < 100;
       // hide while dc
        let srcs = segments
            .filter(s => s.trackTube.track.isPhoto)
            .map(segment => {
                let deepZoomImagePrefix = segment.trackTube.tubeGroup.well.prefixToData + 'tubes/deepzoomimages/';
                let src = {
                    segment: segment,
                    id: segment.trackTube.track.name + 'track' + segment.getTubeIndex() + segment.id,
                    // tileSource: deepZoomImagePrefix + segment.trackTube.tileSource,
                    tileSource: deepZoomImagePrefix + segment.tileSource,
                    height: segment.forClipHeight,
                    opacity: !this.table.showStriplogHiresTrack ? 0 : segment.trackTube.track.isVisible && this.showTiles ? 1 : 0,
                    x: segment.x,
                    y: segment.forClipY,
                    clip: segment.clip,// new OpenSeadragon.Rect(0, segment.imageY1, segment.trackTube.tubeGroup.tubeMetaData.TubeWidth, segment.imageY2 - segment.imageY1),
                    rotation:0,
                };
                return src;
            });
    
       if (!this.showTiles)
        {
            // load 2 to handle positioning still
            srcs = [srcs[0], srcs[srcs.length - 1]];
        }        

        return srcs;
   }   

    updateWellModel(well){        
        let allSegments = _(well.getSegments()).filter(x => x.trackTube.track.isPhoto)
           .orderBy(x => x.getTopDepth())
           .value();        
        if(allSegments.length === 0)
            return;

        let totalHeightOSD = DigitalCoreTable.settings.tubeHeight * allSegments.length;

        // update yScale
        let bufferM = 0//10; //meters
        let threshold = 0;
        let wellTop = well.getTopDepth();
        let wellBase = well.getBaseDepth();
        if(this.yScale == null ||            
            (wellTop - this.yScale.domain()[0]) < threshold || // well top too close to top buffer
            (this.yScale.domain()[1] - wellBase) < threshold){ // well base too close to bottom buffer
            this.yScale = d3.scaleLinear()
                .domain([Math.floor(wellTop - bufferM), Math.ceil(wellBase + bufferM)])
                .range([well.y, totalHeightOSD]);  
        }   
        let yScale = this.yScale; 
        
        well.width = 0;
        well.height = 0;
        well.tubeGroups.forEach((tubeGroup, tubeGroupIndex, tubeGroups) => {
            let previousTubeGroup = tubeGroupIndex === 0 ? null : tubeGroups[tubeGroupIndex - 1];
            tubeGroup.x =  well.x;            
            tubeGroup.y = 0;
            tubeGroup.height = 0;
            tubeGroup.width = 0;

            tubeGroup.trackTubes.filter(t => t.segments.length > 0).forEach((trackTube, trackTubeIndex, trackTubes) => {
                let previousTrackTube = trackTubeIndex === 0 ? null : trackTubes[trackTubeIndex - 1];
                trackTube.x = previousTrackTube == null ? tubeGroup.x : previousTrackTube.x + previousTrackTube.width;
                trackTube.y = 0;
                trackTube.height = 0;
                trackTube.width = 0;                
                
                _(trackTube.segments).orderBy(segment => segment.imageY1).forEach((segment, segmentIndex, segments) => {
                    // look for core piece image (hyperspectral segment)
                    let corePiece = segment.corePieceImage;
                    let segmentHeightM = segment.getBaseDepth() - segment.getTopDepth();
                    let segmentHeightOSD = yScale(segmentHeightM) - yScale(0);                    
                    let segmentHeightTubePx = segment.imageY2 - segment.imageY1;

                    let segmentYM = segment.getTopDepth();
                    let segmentYOSD = yScale(segmentYM);

                    // if tube image
                    if(trackTube.tileSource != null){
                        let imageHeightTubePx = tubeGroup.tubeMetaData.TubeHeight;
                        let tubeHeightM = segmentHeightM / segmentHeightTubePx * imageHeightTubePx;
                        let tubeHeightOSD = yScale(tubeHeightM) - yScale(0);

                        let forClipOffset = segmentHeightM / segmentHeightTubePx * segment.imageY1;
                        let forClipYM = segment.getTopDepth() - forClipOffset;
                        let forClipYOSD = yScale(forClipYM);
   
                        segment.forClipY = forClipYOSD;
                        segment.forClipHeight = tubeHeightOSD;
                        segment.clip = new OpenSeadragon.Rect(0, segment.imageY1, segment.trackTube.tubeGroup.tubeMetaData.TubeWidth, segment.imageY2 - segment.imageY1);                                        
                        segment.tileSource = trackTube.tileSource;
                        segment.width = segment.trackTube.tubeGroup.tubeMetaData.TubeWidth / segment.trackTube.tubeGroup.tubeMetaData.TubeHeight * segment.forClipHeight;
                    }
                    // if core piece image (segment)
                    else if(corePiece != null && corePiece.segmentImageMetaData != null){
                        let imageHeightPx = corePiece.segmentImageMetaData.Height;
                        let corePieceTubeRatio = imageHeightPx / (corePiece.segmentMetaData.SegmentBasePx - corePiece.segmentMetaData.SegmentTopPx); 
                        let segmentHeightPx = segmentHeightTubePx * corePieceTubeRatio;
                        let segmentPxPerM = segmentHeightPx / segmentHeightM;
                        let imageHeightM = imageHeightPx / segmentPxPerM;
                        let imageHeightOSD = yScale(imageHeightM) - yScale(0);

                        let forClipOffset = (segment.imageY1 - corePiece.segmentMetaData.SegmentTopPx) // height in tube px
                            * corePieceTubeRatio // convert to core piece px
                            / segmentPxPerM // convert to meters;
                        let forClipYM = segment.getTopDepth() - forClipOffset;
                        let forClipYOSD = yScale(forClipYM);    
    
                        segment.forClipY = forClipYOSD;
                        segment.forClipHeight = imageHeightOSD;                        
                        let clipY1 = (segment.imageY1 - corePiece.segmentMetaData.SegmentTopPx) * corePieceTubeRatio; // converted to core piece image px                                                
                        let minClipY1 = 0;
                        clipY1 = Math.max(clipY1, minClipY1);
                        let clipHeight = (segment.imageY2 - corePiece.segmentMetaData.SegmentTopPx) * corePieceTubeRatio - clipY1; // converted to core piece image px
                        let maxClipHeight = corePiece.segmentImageMetaData.Height - clipY1;
                        clipHeight = Math.min(clipHeight, maxClipHeight);

                        segment.clip = new OpenSeadragon.Rect(0, clipY1, corePiece.segmentImageMetaData.Width,clipHeight);
                        segment.tileSource = corePiece.tileSource;
                        segment.width = corePiece.segmentImageMetaData.Width / corePiece.segmentImageMetaData.Height * segment.forClipHeight;
                    }
                    else if(!segment.trackTube.track.isPhoto){
                        segment.width = trackTube.track.width || 100; // default width in case
                    }
                    else{
                        segment.width = 1; // for missing images
                    }
                    segment.x = trackTube.x;     
                    segment.y = segmentYOSD;
                    segment.height = segmentHeightOSD;

                    trackTube.y = Math.min(segment.y, trackTube.y);
                    trackTube.width = Math.max(segment.width, trackTube.width);
                    trackTube.height = Math.max(segment.y + segment.height - trackTube.y, trackTube.height);

                    if(!trackTube.track.isVisible){
                        trackTube.width = 0;
                        segment.width = 0;
                    }
               });                

               tubeGroup.y = Math.min(trackTube.y, tubeGroup.y);
               tubeGroup.height = Math.max(trackTube.y + trackTube.height - tubeGroup.y, tubeGroup.height);
           });           
           tubeGroup.width = _(tubeGroup.trackTubes).sumBy(tt => tt.width);
           well.width = Math.max(tubeGroup.x + tubeGroup.width - well.x, well.width);
           well.height = Math.max(tubeGroup.y + tubeGroup.height - well.y, well.height);
       });

       // adjust track widths so that they are all the same per track. then adjust well width        

        let tubeGroupWidth = 0;
        let trackTubes = well.getTrackTubes();
        this.table.tracks.filter(x => x.isVisible).forEach(track => {
            let trackTubesOfSameType = trackTubes.filter(x => x.track === track);
            let trackWidth = _(trackTubesOfSameType).maxBy(x => x.width).width;
            trackTubesOfSameType.forEach(x => {
                x.width = trackWidth;
                x.x = well.x + tubeGroupWidth;
            });
            tubeGroupWidth += trackWidth;
        });
        well.tubeGroups.forEach(tg => tg.width = tubeGroupWidth);
        well.width = tubeGroupWidth;

       //right justify 
       well.getSegments()
        .forEach(s => {
            // s.x = s.x + (well.width - s.width);
            s.x = s.trackTube.x + (s.trackTube.width - s.width);
        });
   }

    update(){
        if(this.curvePlot != null){
            let well = this.table.wells[0];
            let yMin = this.getDisplayTop();
            let yMax = this.getDisplayBase();
            // this.curvePlot.logChartModel.Tracks.filter(x => !x.Collapsed).forEach(t => {
            this.curvePlot.logChartModel.Tracks.forEach(t => {
                t.YMin = yMin;
                t.YMax = yMax;
                t.Series.forEach(s => {
                    let c = well.curveSet.allCurves.find(x => x.curveName === s.XName);
                    if(c == null)
                        return;
                    s.Curve = c;
                    s.Paths = [];
                    s.Track = t;
                    t.Series.forEach(s => {
                        (s.ShadingModels || []).forEach(shading => {
                            shading.ShadeFromSeries = s;
                            shading.Track = t;
                            if(shading.ShadeToId != null)                            
                                shading.ShadeToSeries = t.Series.find(x => shading.ShadeToId === x.XId);
                        });
                    });
                    c.paths.forEach(path => {                                                

                        // let points = path.map(p => { return { x: p.getEasyValue(), y: p.depth}; });
                        // if(points.length > 100){
                        //     // simplify is a 3rd party library I'm using to reduce the number of points
                        //     // it expects points in an {x:num, y:num} fashion
                        //     // Higher tolerance means fewer points. seems like 0 - 5 are normalish values?
                        //     // I see no evidence of high quality really doing anything but I set it to true.
                        //     // http://mourner.github.io/simplify-js/
                        //     let highQuality = false;
                        //     let tolerance = 0.5;
                        //     points = path.map(p => { return { x: p.getEasyValue(), y: p.depth}; });
                        //     points = simplify(points, tolerance, highQuality); 
                        // }
                        // let newPath = points.map(p =>  { return {value: p.x, depth: p.y };});

                        let newPath = path.map(p => { 
                            let v = t.Type == 'stacked' ? p.getEasyValue() : p.value;
                            let point = { value: v, depth: p.depth}; 
                            return point;
                        });
                        s.Paths.push(newPath);
                    });
                    let _points = _(s.Paths).flatten();
                    if(s.Autoscale && _points.some()){
                        c.autoscale();
                        s.DomainXMin = c.min;
                        s.DomainXMax = c.max;
                        
                    }
                });                
            });
            this.curvePlot.update();
        }
        this.resizeCurvePlot({force: true});       
    }

   loadCurveLogs(){
       let self = this;
       let table = this.table;
        table.wells.forEach(async well => {             
            var model = well.curveSet.chart;

            // needed to work around the constraints in OSD        
            let placeHolderSrc1 = {
                url: DigitalCoreTable.prefixes.digitalcoretablePrefix + 'images/DONOTDELETE-NEEDEDPLACEHOLDERFORSTRIPLOG.jpg', 
                x:0, 
                y:0, 
                width:10,
                opacity:0,
                success: (e) => {
                    this._placeHolderImage1 = e.item;
                }
            };         
            table.viewer.addSimpleImage(placeHolderSrc1);

            let placeHolderSrc2 = {
                url: DigitalCoreTable.prefixes.digitalcoretablePrefix + 'images/DONOTDELETE-NEEDEDPLACEHOLDERFORSTRIPLOG.jpg', 
                x:0, 
                y:0, 
                width:10,
                opacity:0,
                success: (e) => {
                    this._placeHolderImage2 = e.item;
                }
            };         
            table.viewer.addSimpleImage(placeHolderSrc2);            

            var view = new DigitalCoreTable.CurvePlot(model, table.svg.node(), well.x + well.width, well.y, well.width, well.height);
            view.axisScaleEnabled = table.userEmail == 'afp@enersoft.ca' || table.userEmail == 'quaternary@enersoft.ca' || table.userEmail == 'imperial@enersoft.ca' || table.userEmail == 'kearl@enersoft.ca';
            if(view.axisScaleEnabled){
                view.axisScaleSecondScaleOffset = well.headerData != null && well.headerData.Elevation != null ? well.headerData.Elevation : null;
                view.axisScaleWidth = view.axisScaleSecondScaleOffset != null ? 80 : 40;
            }

            this.curvePlot = view;
            view.update();    

            // Auto resize
            this.scrollBy = table.viewer.zoomPerScroll;
            table.viewer.zoomPerScroll = 1;
            table.viewer.addHandler('canvas-scroll', (e) => {   
                if(this._placeHolderImage1 == null || this._placeHolderImage2 == null)
                    return;
                
                let zoomByValue = e.scroll > 0 ? this.scrollBy : 1/this.scrollBy;

                let viewport = table.viewer.viewport;
                let refPointVP = viewport.windowToViewportCoordinates(e.position);

                let curvePlotX = parseFloat(view.logSvg.attr('x'));            
                let curvePlotWidth = parseFloat(view.logSvg.attr('width'));
                let curvePlotHeight = parseFloat(view.logSvg.attr('height'));
                let curvePlotX2 = curvePlotX + curvePlotWidth;
                let newWidth = curvePlotWidth / zoomByValue;
                this._placeHolderImage1.setPosition(new OpenSeadragon.Point(curvePlotX,0));
                this._placeHolderImage2.setPosition(new OpenSeadragon.Point(curvePlotX + newWidth,curvePlotHeight));

                //if looking at curves
                if(refPointVP.x >= curvePlotX && refPointVP.x <= curvePlotX2){
                    refPointVP.x = curvePlotX;
                }
                viewport.zoomBy(zoomByValue, refPointVP, false);
            });                                                                                
            
            table.viewer.addHandler('viewport-change', (e) => {
                this.resizeCurvePlot();
            });

            this._createScaleControl();
            this.resizeCurvePlot();
        });
   }

   getDisplayTop(){
       return this.yScale.domain()[0];
   }

   getDisplayBase(){
        return this.yScale.domain()[1];
   }


    getDisplayYOSD(){
        return this.yScale.range()[0];
    }   

    getDisplayHeightOSD(){
        return this.yScale.range()[1] - this.yScale.range()[0];
    }

    resizeCurvePlot(options){
        options = options || {};
        if (this.curvePlot == null || (this.table.mode == 'striplog' && this.table.parentTable != null && !this.table.parentTable._isStriplogVisible()))
            return;
        let table = this.table;
        let curvePlot = this.curvePlot;
        let bounds = table.viewer.viewport.getBounds();

        // Resize width
        let newCurvePlotX = table.viewer.viewport.windowToViewportCoordinates(new OpenSeadragon.Point(0,0)).x;
        let newCurvePlotX2 = table.viewer.viewport.windowToViewportCoordinates(new OpenSeadragon.Point(curvePlot.getFixedPixelWidth(),0)).x;
        let newCurvePlotWidth = Math.abs(newCurvePlotX2 - newCurvePlotX);  
        let newCurvePlotHeight = this.getDisplayHeightOSD();
        curvePlot.width = newCurvePlotWidth;       
        curvePlot.x = this.getPhotoTrackX() + this.getPhotoTrackWidth();
        [curvePlot.logSvg, curvePlot.headerSvg].forEach(svg => {
            svg.attr('x', curvePlot.x)
                .attr('height', newCurvePlotHeight)
                .attr('width', newCurvePlotWidth);
        });

        // Move header                
        let headerY = Math.max(bounds.y, curvePlot.y);
        headerY = Math.min(headerY, curvePlot.y + curvePlot.height);
        headerY = Math.min(headerY, bounds.y + bounds.height);        
        curvePlot.headerSvg            
            .attr('y', headerY)
            .attr('height', newCurvePlotWidth);            
        

        // Grid lines and scale
        // Grid lines
        let tenthScreenOsd = bounds.height / 4;
        let breakPoints = [20, 10, 5, 2, 1, 0.5 , 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0005];
        let tenthScreenM = Math.abs(this.yScale.invert(tenthScreenOsd) - this.yScale.invert(0));
        let currentBp = breakPoints.find(bp => bp < tenthScreenM) || breakPoints[breakPoints.length-1];        
        if(options.force || this._gridLineStep != currentBp){
            this._gridLineStep = currentBp;
            let patternHeightOSD = Math.abs(this.yScale(this._gridLineStep) - this.yScale(0));            
            let patternHeightPerc = patternHeightOSD / newCurvePlotHeight * 100;
            
            let depthMin = this.yScale.domain()[0];
            let depthMax = this.yScale.domain()[1];
            let offSetM = Math.floor(depthMin) % 10;
            // let offSetPerc = offSetM/(depthMax - depthMin) * 100 * -1;
            let offSetPerc = offSetM/(depthMax - depthMin) * 100 * -1;
            curvePlot.axisScaleTickEvery = this._gridLineStep;

            let selectors = ['pattern.' + curvePlot.dctStriplogGridLinesPatternClass, 'pattern.' + curvePlot.dctStriplogGrainsizeLinesPatternClass, 'pattern.dctTexturePattern','pattern.dctStriplogAxisTicksPattern'];
            // let selectors = ['pattern.' + curvePlot.dctStriplogGridLinesPatternClass];
            curvePlot.logSvg.selectAll(selectors.join(', '))
                .attr('y', offSetPerc + '%') // for the axis scale this is adjusted further in curveplot.js
                .attr('height', patternHeightPerc + '%');
            curvePlot.updateAxisScale();
        }            
        curvePlot.updateAxisScaleText();

        // Scale
        let patternHeightOSD = Math.abs(this.yScale(this._gridLineStep) - this.yScale(0));
        let y2 = table.viewer.viewport.viewportToWindowCoordinates(new OpenSeadragon.Point(0, patternHeightOSD)).y;
        let y1 = table.viewer.viewport.viewportToWindowCoordinates(new OpenSeadragon.Point(0, 0)).y;
        let patternHeightWindow = Math.abs(y2 - y1);
        this.scaleControl.select('span')
            .text(this._gridLineStep + DigitalCoreTable.settings.distanceUnit);
        this.scaleControl.select('svg')
            .attr('height', patternHeightWindow);


        // // Downscale curve data as needed        
        // let screenHeightM = this.yScale.invert(bounds.height) - this.yScale.invert(0);
        // let allowablePointsOnScreenRange = [150,300];        
        // let allowablePointsPerMRange = allowablePointsOnScreenRange.map(x => x/screenHeightM);                
        // let updateNeeded = false;
        // if(this.curvePlot.targetPointsPerM < allowablePointsPerMRange[0] || this.curvePlot.targetPointsPerM > allowablePointsPerMRange[1]){
        //     this.curvePlot.targetPointsPerM = _(allowablePointsPerMRange).mean();
        //     updateNeeded = true;
        // }
        // if(updateNeeded){
        //     let key = 'updateStripLogCurvePlotCurves';
        //     DigitalCoreTable.delayedFunctionCaller.cancelCall(key);
        //     DigitalCoreTable.delayedFunctionCaller.delayedCall(key, () => {
        //         this.curvePlot.update();
        //     }, 60);
        // }

    }

    getPhotoTrackX(){        
        //return this.table.wells[0].x;
        let tubeGroup = this.table.wells[0].tubeGroups[0];
        let firstPhotoTrack = tubeGroup.trackTubes.find(x => x.track.isPhoto);
        return firstPhotoTrack.x;
    }

    getPhotoTrackWidth(){
        let tubeGroup = this.table.wells[0].tubeGroups[0];
        let firstPhotoTrack = tubeGroup.trackTubes.find(x => x.track.isPhoto);
        return this.table.wells[0].width - firstPhotoTrack.x;
    }

    _createHyperSpectralButton() {
        let table = this.table;
        let tracks = table.tracks.filter(x => x.name != this.table.defaultImageTrack && x.isPhoto && x.name != 'HIRES');
        let hiresTrackStriplog = this.curvePlot.logChartModel.Tracks.find(o => o.Name == 'HIRES');
        let data = tracks.map(t => {
            return {
                id: 'imgtrackPaletteMenuItem' + t.name,
                name: t.niceName,
                color: 'black',
                obj: t.name,
                isActive: d => t.isVisible,
                type: 'checkbox',
                events: {
                    click: function (e) {
                        t.isVisible = !t.isVisible;
                        table.syncTrackTubes();
                        table.update();
                    }
                },
                onSelected: d => {
                    if (table.mode == 'striplog' && t.niceName == 'HIRES')
                        table.showStriplogHiresTrack = !table.showStriplogHiresTrack;
                     else {
                        t.isVisible = !t.isVisible;
                        table.syncTrackTubes();
                    }
                    table.update();
                }
            };
        }
        );
        //need to add HIRES track from striplog and check its status at Collapsed
        if (hiresTrackStriplog != null) {
            data.push({
                id: 'imgtrackPaletteMenuItemHIRES',
                name: 'HIRES',
                color: 'black',
                obj: 'HIRES',
                isActive: d => !hiresTrackStriplog.Collapsed,
                type: 'checkbox',
                onSelected: d => {
                    if (table.mode == 'striplog') {
                        table.showStriplogHiresTrack = !table.showStriplogHiresTrack;
                        hiresTrackStriplog.Collapsed = !table.showStriplogHiresTrack;
                    }
                    table.update();
                }
            })
        }
        // let isActiveF = d => table.tracks.some(x => x.name === d.name);
        let isActiveF = null;
        let onSelected = null;
        //table.createButtonSet(data, 'Striplog Images', isActiveF, onSelected);
        table.createButtonSetSlideStriplogND(data, 'striplogMosaicItems', isActiveF, onSelected);
    }    

    async exportToPdf(){  
        let table = this.table;
        let viewport = table.viewer.viewport;
        let headerData = this.table.wells[0].headerData; 

        // Load the pdf export window        
        let mainSvg = table.svgOverlay.node().parentElement;        
        let url = DigitalCoreTable.prefixes.popupWindowsPrefix + '/pdfexport.html';
        let exportWindow = window.open(url, "_blank", `top=0,left=0,width=${screen.width},height=${screen.height}`);                  
        let onloadPromise = new Promise((resolve,reject) => {            
            exportWindow.addEventListener('load', e => {
                resolve();
            });
        });        
        await onloadPromise;  

        exportWindow.document.title = headerData.Uwi.replaceAll('-','_') + ' striplog';

        // copy stylesheets
        let stylesheetsToCopy = _(document.styleSheets).filter(sheet => sheet.href.includes('digitalcoretable.css') || sheet.href.includes('digitalcoretable.striplog.css')).value();
        stylesheetsToCopy.forEach(sheet => {
            let link = exportWindow.document.createElement('link');
            exportWindow.document.head.appendChild(link);
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = sheet.href;
        });

        // Header data
        let headerElement = exportWindow.document.getElementById('uwi');
        headerElement.innerText = headerData.Uwi.replaceAll('-','_');

        headerElement = exportWindow.document.getElementById('easting');
        headerElement.innerText = headerData.Easting + ' m';

        headerElement = exportWindow.document.getElementById('northing');
        headerElement.innerText = headerData.Northing + ' m';        

        headerElement = exportWindow.document.getElementById('elevation');
        headerElement.innerText = headerData.Elevation + ' masl';        

        headerElement = exportWindow.document.getElementById('td');
        headerElement.innerText = headerData.TD + ' ' + DigitalCoreTable.settings.distanceUnit;                

        headerElement = exportWindow.document.getElementById('drillType');
        headerElement.innerText = headerData.DrillType;    

        headerElement = exportWindow.document.getElementById('location');
        headerElement.innerText = headerData.Location;    

        headerElement = exportWindow.document.getElementById('dateDrilled');
        headerElement.innerText = headerData.DateDrilled;   
        
        headerElement = exportWindow.document.getElementById('footerloggedby');
        headerElement.innerText = headerData.LoggedBy;   
        
        headerElement = exportWindow.document.getElementById('footertd');
        headerElement.innerText = headerData.TD;   


        if(table.userEmail == 'afp@enersoft.ca' || table.userEmail == 'quaternary@enersoft.ca' || table.userEmail == 'imperial@enersoft.ca' || table.userEmail == 'kearl@enersoft.ca'){
            headerElement = exportWindow.document.getElementById('logo1');
            headerElement.setAttribute('src', 'https://enersoftcanada.blob.core.windows.net/resources/logo1.png');    
            
            headerElement = exportWindow.document.getElementById('logo2');
            headerElement.setAttribute('src', 'https://enersoftcanada.blob.core.windows.net/resources/logo2.png');    
        }        
        

        let pxPerM = 122*5;
        let currentHeightPx = table.viewer.container.offsetHeight;
        let pageSizeM = currentHeightPx / pxPerM;
        let aspectRatio = viewport.getAspectRatio();                
        let height = this.yScale(pageSizeM) - this.yScale(0);
        let x =  table.x;        
        let width = height * aspectRatio;        
        viewport.fitBounds(new OpenSeadragon.Rect(0,0, width, height), true);
        table.svgOverlay.resize();


        // Start copying over striplog
        let destH = viewport.viewportToWindowCoordinates(new OpenSeadragon.Point(0,table.height)).y - viewport.viewportToWindowCoordinates(new OpenSeadragon.Point(0,0)).y;
        let contentContainer = exportWindow.document.getElementById('content');
        viewport.fitBounds(new OpenSeadragon.Rect(x, table.y, width, height), true);
        table.svgOverlay.resize();
        this.resizeCurvePlot();
        let div = exportWindow.document.createElement('div');
        contentContainer.appendChild(div);
        let clone = mainSvg.cloneNode(true);        
        clone.removeAttribute('width');
        clone.removeAttribute('height');
        clone.style = null;
        clone.style.width = "100%";
        clone.style.height = destH + "px";

        // expand the width of the image
        d3.select(clone)
            .select('#dctstriploglorestubessvg')
            .attr('width', function(){
                return Number.parseFloat(this.getAttribute('width')) * 2;
            });
        d3.select(clone).select('#svgcontainer')            
            .attr('x', function(){
                return Number.parseFloat(this.getAttribute('x')) * 2;
            });        
        d3.select(clone).select('#svgheadercontainer')            
            .attr('x', function(){
                return Number.parseFloat(this.getAttribute('x')) * 2;
            });                    

        // remove crosshair
        d3.select(clone).select('#dctCrosshair')
            .remove();

        div.appendChild(clone);                
    }

    createExportPdfButton(){
        let div = this.table.createAnchoredControlDiv('dctStripLogExportToPdfButton', OpenSeadragon.ControlAnchor.BOTTOM_LEFT);
        d3.select(div).selectAll('*')
            .remove();
        d3.select(div)
            .append('div')
            //.classed('btn-group', true)            
            .append('button')
            .classed('btn', true)
            .classed('badge badge-secondary', true)
            .classed('btn-primary', true)
            .text('Export to PDF')
            .on('click', () => {
                this.exportToPdf();
            });
    }
};

