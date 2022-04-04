var DigitalCoreTable = DigitalCoreTable || {};
/**
 * The segment event layer controls a bunch of invisible rectangle hitboxes over the segments. You can add handlers to listen for events on these (click, mouse move, etc).
 */
DigitalCoreTable.IntervalDrawing = class  IntervalDrawing{
    constructor(intervalAddon){
        this.intervalAddon = intervalAddon;
        this.table = intervalAddon.table;
        this.segmentEventLayer = this.table.segmentEventLayer;
        this.copyTrackSelected = null;
        this.activeTrack = null;  
        this.isDrawingInProgress = false; //

        this.drawingInProgressTool = null;
        this._newInterval = {            
            inProgress: false,
            elementClass: 'dctNewInterval',
            initialDepth: 0,
            initialXDomain: 0,
            trackName: null,
            initialSegment: null,
            subPoints: [],            
        }; 

        this._resizeInterval = {
            inProgress: false,
            initialDepth: 0,
            trackName: null,
            initialSegment: null,
            aboveInterval: null,            
            belowInterval: null,      
            minDepth: -Infinity,
            maxDepth: Infinity
        };

        // Tools
        /**
         * The standard interval to where your drag from start to base
         * @type {DigitalCoreTable.IntervalTool}
         */
        this.bothSidesTool = new DigitalCoreTable.IntervalTool(this, 'Drag to Fill');
        this.bothSidesTool.url = './images/mouseicons/Mouse_pointer.png';
        /**
         * The standard interval created between the previous one and the mouse pointer
         * @type {DigitalCoreTable.IntervalTool}
         */
        this.snapAboveTool = new DigitalCoreTable.IntervalTool(this, 'Snap Above');
        this.snapAboveTool.url = './images/mouseicons/Mouse_top.png';
        /**
         * The standard interval created between the next one and the mouse pointer
         * @type {DigitalCoreTable.IntervalTool}
         */        
        this.snapBelowTool = new DigitalCoreTable.IntervalTool(this, 'Snap Below', true);
        this.snapBelowTool.url = './images/mouseicons/Mouse_bottom.png';
        /**
         * The standard interval created between two intervals
         * @type {DigitalCoreTable.IntervalTool}
         */        
        this.fillBetweenTool = new DigitalCoreTable.IntervalTool(this, 'Fill Between');
        this.fillBetweenTool.url = './images/mouseicons/Mouse_up_down.png';
        /**
         * Copy from another track and snap above
         * @type {DigitalCoreTable.IntervalTool}
         */        
        this.copyAndSnapAboveTool = new DigitalCoreTable.IntervalTool(this, 'Copy and Snap Above');
        this.copyAndSnapAboveTool.url = './images/mouseicons/Mouse_top_angle.png';
        /**
         * Copy from another track and snap below
         * @type {DigitalCoreTable.IntervalTool}
         */        
        this.copyAndSnapBelowTool = new DigitalCoreTable.IntervalTool(this, 'Copy and Snap Below',true);
        this.copyAndSnapBelowTool.url = './images/mouseicons/Mouse_bottom_angle.png';
        /**
         * Copy from another track and fill between
         * @type {DigitalCoreTable.IntervalTool}
         */        
        this.copyAndFillBetweenTool = new DigitalCoreTable.IntervalTool(this, 'Copy and Fill Between');
        this.copyAndFillBetweenTool.url = './images/mouseicons/Mouse_top_bottom.png';
        /**
         * Delete interval
         * @type {DigitalCoreTable.IntervalTool}
         */        
        this.deleteTool = new DigitalCoreTable.IntervalTool(this, 'Delete');                        
        this.deleteTool.url = './images/mouseicons/Delete.png';
        /**
         * Resize an existing interval
         */
        this.resizeTool = new DigitalCoreTable.IntervalToolOriented(this, 'Resize');
        this.resizeTool.unrotatedCursor = 'ns-resize';
        this.resizeTool.rotatedCursor = 'ew-resize';


        /**
         * Currently selected tool
         * @type {DigitalCoreTable.IntervalTool}
         */
        this.currentTool = null;
        /**
         * The various interval tools
         * @type {DigitalCoreTable.IntervalTool}
         */
        this.tools = [this.bothSidesTool, this.snapAboveTool, this.snapBelowTool, this.fillBetweenTool, this.copyAndSnapAboveTool, this.copyAndSnapBelowTool, this.copyAndFillBetweenTool, this.deleteTool];   

        // disable context menu events. We'll use the mouse tracker nonPrimaryPress/Release handlers instead
        this._fillerContextMenuFunction = function(e){ 
            e.preventDefault();            
        };
    }

    getCurrentToolWithKeyboardModifiers(eventData){
        if(eventData.originalEvent.ctrlKey){
            return this.resizeTool;
        }
        return this.currentTool;
    }
    
    enableDrawingOnTracks(trackNames){     
        let addon = this;
        let updateSelection = this.segmentEventLayer.updateSelection;

        let commonF = (eventData, element, segment) => {
            eventData.track = segment.trackTube.track;
        };
        updateSelection = updateSelection.filter(segment => trackNames.indexOf(segment.trackTube.track.name) !== -1);
        updateSelection.each(function (segment) {
            let element = this;
            if(element.mouseTracker == null){
                element.mouseTracker = new OpenSeadragon.MouseTracker({ element: element });
            }
            element.mouseTracker.dblClickHandler = eventData => {
                commonF(eventData, element, segment);
                addon._dblClickEventHandler(eventData, element, segment);
            };
            element.mouseTracker.dragHandler = eventData => {
                commonF(eventData, element, segment);
                addon._startOrContinueDragHandler(eventData, element, segment);
            };
            element.mouseTracker.dragEndHandler = eventData => {
                commonF(eventData, element, segment);
                addon._endDragEventHandler(eventData, element, segment);
            };
            element.mouseTracker.clickHandler = eventData => {
                commonF(eventData, element, segment);
                addon._clickEventHandler(eventData, element, segment);
            };
            element.mouseTracker.enterHandler = eventData => {
                commonF(eventData, element, segment);
                addon._enterHandler(eventData, element, segment);
            };
            element.mouseTracker.exitHandler = eventData => {
                commonF(eventData, element, segment);
                addon._exitHandler(eventData, element, segment);
            };
            element.mouseTracker.moveHandler = eventData => {
                commonF(eventData, element, segment);
                addon._moveHandler(eventData, element, segment);
            };            
            element.mouseTracker.nonPrimaryPressHandler = eventData => {
                commonF(eventData, element, segment);
                addon._nonPrimaryPressHandler(eventData, element, segment);
            };
            element.mouseTracker.nonPrimaryReleaseHandler = eventData => {
                commonF(eventData, element, segment);
                addon._nonPrimaryReleaseHandler(eventData, element, segment);
            };
            element.addEventListener('contextmenu', addon._fillerContextMenuFunction);
        });                
    }    

    stopDrawingOnSegments(){
        let self = this;
        let updateSelection = this.segmentEventLayer.updateSelection;
        updateSelection.each(function(segment) {
            if(this.mouseTracker != null)
                this.mouseTracker.destroy();
            this.mouseTracker = null;
            this.removeEventListener('contextmenu', self._fillerContextMenuFunction);            
        }).style('cursor', 'default');
    }

    onIntervalDrawn(){
        let updateF = aTable => {            
            if (aTable.intervalAddon != null) {
                aTable.intervalAddon.update();
            }
        };
        
        let table = this.intervalAddon.table;
        let tablesToUpdate = [table];
        if (table.childTablesAddon != null) {
            table.childTablesAddon.striplogChildren.forEach(child => {
                tablesToUpdate.push(child.table);
            });
            
        }
        if (table.parentTable != null) {
            tablesToUpdate.push(table.parentTable);
        }

        tablesToUpdate.forEach(t => updateF(t));
    }    

    _enterHandler(eventData, element, segment){ 
        this._changeCursor(eventData, element, segment);
    }

    _exitHandler(eventData, element, segment){

    }

    _moveHandler(eventData, element, segment){
        this._changeCursor(eventData, element, segment);
    }

    _nonPrimaryPressHandler(eventData, element, segment){
        // Create context menu
        let drawingHelper = new DigitalCoreTable.DrawingHelperAddon(this.intervalAddon.table);        
        if(eventData.parentSelection != null){
            drawingHelper.parentSelection = eventData.parentSelection;
        }
        else
            drawingHelper.parentSelection = this.table.svg;

        let pviewport = this.table.pointFromPixel(new OpenSeadragon.Point(eventData.originalEvent.offsetX, eventData.originalEvent.offsetY));        
        let mouseDepth = this.getMouseDepth(eventData, segment);
        let results = drawingHelper.parentSelection.selectAll('path,circle').filter(src => src!= null && src.id != '' && src.id != null).filter(src => {
            if (src.interval.groupName != eventData.track.name) {
                return false;
            }
            //check if it is point interval
            return (src.interval.start <= mouseDepth && src.interval.stop > mouseDepth) ||
                (table.mode == null && src.interval.start == src.interval.stop && mouseDepth >= src.interval.start - 0.02 && mouseDepth <= src.interval.start + 0.02) ||
                (table.mode == 'striplog' && src.interval.start == src.interval.stop && mouseDepth >= src.interval.start - 4 && mouseDepth <= src.interval.start + 4);
        });        
        if(results.nodes().length === 0){
            return;
        }        

        // this looks stupid, but if there is a src with the same segment we clicked on, then use that. If not, just use any result.
        let moreSpecificResults = results.filter(src => src.segment === segment);
        if(moreSpecificResults.nodes().length > 0){
            results = moreSpecificResults;
        }

        let intervalElement = results.nodes()[0];        
        let src = results.data()[0];
        let windowPosition = this.table.viewer.viewport.viewportToWindowCoordinates(new OpenSeadragon.Point(pviewport.x, pviewport.y))
        let templateOptions = {
            addon: this,
            ed: eventData,
            el: element, seg: segment,
            intervalElement: intervalElement,
            src: src,
            windowPosition: windowPosition,
            dh: drawingHelper
        };

        let srcId = src.interval.isAccessoryTrack ? src.id : 'lith_' + src.id;
        //removing the contextmenu
        let elemString = 'path#' + srcId + '_' + src.intervalGroupIndex; 

        $(elemString).off('contextmenu');
        $(elemString).data('templateOptions', templateOptions);
        $.contextMenu({
            selector: elemString,
            trigger: 'left',
            build: function ($trigger, e) {
                e.preventDefault();
                let items = $trigger.data('templateOptions').addon._buildContextMenuItems();
                let templateOptions = {
                    callback: function (key, options) {
                        var inputValue = $.contextMenu.getInputValues(options);
                        $.contextMenu.setInputValues(options, inputValue);
                        let item = options.items[key];
                        item.function(options);
                    },
                    items: items,
                    addon: $trigger.data('templateOptions').addon,
                    dt: $trigger.data('templateOptions')
                };
                $trigger.data('templateOptions', templateOptions);
                //populate the fields in slidecontroladdon
                //if (table.mode == 'striplog' && table.parentTable != null) {
                //    table.parentTable.viewer.raiseEvent('populateIntervalEditFields', { interval: templateOptions.dt.src.interval, tblReference: table, track: templateOptions.dt.src.track })
                //}
                //else
                //    table.viewer.raiseEvent('populateIntervalEditFields', { interval: templateOptions.dt.src.interval, tblReference: table, track: templateOptions.dt.src.track })

                // pull a callback from the trigger
                return $trigger.data('templateOptions');
            }
        });
        $(elemString).trigger('click');
        //drawingHelper.showEditFields(intervalElement, src, false, windowPosition);
    }

    _buildContextMenuItems() {
        let addon = this;
        let items = [
        {
                name: 'Delete',
                function: (opt) => {
                    opt.addon._removeAtMouse(opt.dt.ed, opt.dt.element, opt.dt.seg);
                    //if (table.mode == 'striplog' && table.parentTable != null) {
                    //    opt.dt.addon.table.parentTable.viewer.raiseEvent('populateIntervalEditFields', { interval: null })
                    //}
                    //else
                    //    opt.dt.addon.table.viewer.raiseEvent('populateIntervalEditFields', { interval: null })
            }
        },
        //{
        //    name: 'Edit',
        //    function: (opt) => {
        //        //make slide a different color to show it is in edit mode
        //        $('div#menuLogging').find("fieldset, textarea, input").each(function () {
        //            $(this).css('background-color', '#99e6ff');
        //        });
        //        //populate the fields in slidecontroladdon
        //        if (table.mode == 'striplog' && table.parentTable != null) {
        //            opt.dt.addon.table.parentTable.viewer.raiseEvent('populateIntervalEditFields', { interval: opt.dt.src, tblReference : table })
        //        }
        //        else
        //            opt.dt.addon.table.viewer.raiseEvent('populateIntervalEditFields', { interval: opt.dt.src, tblReference: table })
        //                //opt.dt.dh.showEditFields(opt.dt.intervalElement, opt.dt.src, false, opt.dt.windowPosition);
        //    }
        //}
        ];
        return items;
        $('path#'+src.id).trigger('click');
        //drawingHelper.showEditFields(intervalElement, src, false, windowPosition);
    }

    _nonPrimaryReleaseHandler(eventData, element, segment){
        // Create context menu
        let e = eventData.originalEvent;
        e.preventDefault();
        e.stopPropagation();
    }



    _startOrContinueDragHandler(eventData, element, segment){        
        if(this._newInterval.inProgress || this._resizeInterval.inProgress){
            this._continueDragEventHandler(eventData, element, segment);
        }
        else{
            this._startDragEventHandler(eventData, element, segment);
        }
    }  

    _startDragEventHandler(eventData, element, segment) {
        if (this.activeTrack != null && this.activeTrack.name.slice(0, -1) !== eventData.track.name.slice(0, -1))
            return;
        if (this.activeTrack == null)
            return;

        let track = eventData.track;
        //disable drawing on Alteration1 in casino
        if (table.userGroup == 'Casino' && track.name == 'Alteration1')
            return;

        //make segment current tile the same as active track's
        if (this.activeTrack != null) {
            track.currentTile = this.activeTrack.currentTile;
            track.textureFillsId = this.activeTrack.textureFillsId;
            track.description = this.activeTrack.description;//sync description
        }
        this.drawingInProgressTool = this.getCurrentToolWithKeyboardModifiers(eventData);
        switch (this.drawingInProgressTool) {
            //we pass the index of button to each function, so we know which button called it(to chasnge the image for cursor)
            case this.resizeTool:
                this._startResizeInterval(eventData, element, segment);
                break;
            case this.bothSidesTool:
                this._bothSides(eventData, element, segment);
                break;
            case this.snapAboveTool:
                this._snapAbove(eventData, element, segment);
                break;
            case this.snapBelowTool:
                this._snapBelow(eventData, element, segment);
                break;
            case this.copyAndSnapAboveTool:
                this._copyAndSnapAbove(eventData, element, segment);
                break;
            case this.copyAndSnapBelowTool:
                this._copyAndSnapBelow(eventData, element, segment);
                break;
        }
    };    

    _continueDragEventHandler(eventData, element, segment){
        switch (this.drawingInProgressTool) {
            case this.resizeTool:
                this._continueResizeInterval(eventData, element, segment);
                break;            
            case this.bothSidesTool:
            case this.snapAboveTool:
            case this.snapBelowTool:
            case this.copyAndSnapAboveTool:
            case this.copyAndSnapBelowTool:
                this._continueInterval(eventData, element, segment, this.tools.indexOf(this.currentTool));
                break;
        }
    };

    _endDragEventHandler(eventData, element, segment){
        switch (this.drawingInProgressTool) {
            case this.resizeTool:
                this._endResizeInterval(eventData, element, segment);
                break;                        
            case this.bothSidesTool:
            case this.snapAboveTool:
            case this.snapBelowTool:
            case this.copyAndSnapAboveTool:
            case this.copyAndSnapBelowTool:
                this._endInterval(eventData, element, segment);
                break;
            //case this.deleteTool:
            //    this._removeAtMouse(eventData, element, segment);
            //    break;
        }
        this.drawingInProgressTool = null;
    };  

    _dblClickEventHandler(eventData, element, segment) {
        //get the interval from segment
        let mouseDepth = this.getMouseDepth(eventData, segment);
        let track = eventData.track;
        let uwi = segment.trackTube.tubeGroup.well.uwi;
        let interval = this.intervalAddon.getIntervalAtDepth(mouseDepth, uwi, track.name);
        if (interval != null)
            this.table.viewer.raiseEvent('select_tablefill_from_id', { name: interval.fill.Name });
    }

    _clickEventHandler(eventData, element, segment){
        if (!eventData.quick) {
            return;
        }
        //check if we here on interval and show description on slide in case
        let mouseDepth = this.getMouseDepth(eventData, segment);
        let track = eventData.track;
        //disable drawing on Alteration1 in casino
        if (table.userGroup == 'Casino' && track.name == 'Alteration1')
            return;

        let uwi = segment.trackTube.tubeGroup.well.uwi;
        let interval = this.intervalAddon.getIntervalAtDepth(mouseDepth, uwi, track.name);
        if (interval != null) {
            //populate the fields in slidecontroladdon
            if (table.mode == 'striplog' && table.parentTable != null) {
                table.parentTable.viewer.raiseEvent('populateIntervalEditFields', { interval: interval, tblReference: table, isEdit: false, track: track })
            }
            else
                table.viewer.raiseEvent('populateIntervalEditFields', { interval: interval, tblReference: table, isEdit: false, track: track })
        }
        //make segment current tile the same as active track's
        if (this.activeTrack != null) {
            track.currentTile = this.activeTrack.currentTile;
            track.textureFillsId = this.activeTrack.textureFillsId;
        }
        this.drawingInProgressTool = this.getCurrentToolWithKeyboardModifiers(eventData);
        switch (this.drawingInProgressTool) {
            //we pass the index of button to each function, so we know which button called it(to chasnge the image for cursor)
            case this.snapAboveTool:
                this._snapAbove(eventData, element, segment);
                this._endDragEventHandler(eventData, element, segment);
                break;
            case this.snapBelowTool:
                this._snapBelow(eventData, element, segment);
                this._endDragEventHandler(eventData, element, segment);
                break;
            case this.copyAndSnapAboveTool:
                if (this.copyTrackSelected != null) {
                    this._copyAndSnapAbove(eventData, element, segment);
                    this._endDragEventHandler(eventData, element, segment);
                }
                break;
            case this.copyAndSnapBelowTool:
                if (this.copyTrackSelected != null) {
                    this._copyAndSnapBelow(eventData, element, segment);
                    this._endDragEventHandler(eventData, element, segment);
                }
            case this.fillBetweenTool:
                this._fillBetween(eventData, element, segment);
                break;            
            case this.copyAndFillBetweenTool:
                if (this.copyTrackSelected != null) {
                    this._copyAndFillBetween(eventData, element, segment);
                }
                break;
            case this.deleteTool:
                this._removeAtMouse(eventData, element, segment);
                break;
            case this.bothSidesTool: // if user only clicks on accessory track, it means creating only circle as point data
                if (track.isAccessoryTrack && interval==null) {
                    this._startDragEventHandler(eventData, element, segment);
                    this._endDragEventHandler(eventData, element, segment);
                }
                break;
        }
    }     
    
    _changeCursor(eventData, element, segment){ 
        // Set cursor
        let addon = this;     
        let currentTool = addon.getCurrentToolWithKeyboardModifiers(eventData);
        let track = eventData.track;
        let uwi = segment.trackTube.tubeGroup.well.uwi;
        //if there is no track selected to snap to , then make currentTool as null
        if ((currentTool == this.copyAndSnapBelowTool ||
            currentTool == this.copyAndSnapAboveTool ||
            currentTool == this.copyAndFillBetweenTool) && $('div#menuLogging select#select_trackNames').val() == null)
            currentTool = null;
        let noShow = currentTool == null;
        if(currentTool != null && !currentTool.anywhere){
            let mouseDepth = this.getMouseDepth(eventData, segment);
            let interval = this.intervalAddon.getIntervalAtDepth(mouseDepth, uwi, track.name);                
            noShow = noShow || interval == null;
        }
        if (noShow){
            $(element).css('cursor', 'default');
        }            
        else{
            //let basename = _isAccessoryTrack(currentTool.intervalAddon.activeTrack,currentTool.intervalAddon.activeTrack.name) ? _getBaseNameFromAccessoryTrackName(currentTool.intervalAddon.activeTrack.name) :
            //    currentTool.intervalAddon.activeTrack.name;
            let basename = currentTool.intervalAddon.activeTrack.isAccessoryTrack ? _getBaseNameFromAccessoryTrackName(currentTool.intervalAddon.activeTrack.name) :
                currentTool.intervalAddon.activeTrack.name;
            let basenameEventData = eventData.track.isAccessoryTrack ? _getBaseNameFromAccessoryTrackName(eventData.track.name) : eventData.track.name;
            if (/*segment.getBaseName()*/basenameEventData == basename && currentTool.name != 'Delete') {
                $(element).css('cursor', currentTool.cursor);
            }
            else
                $(element).css('cursor', 'default');
        }
    }

    _fillBetween(eventData, element, segment, trackToCopyFrom){
        let mouseDepth = this.getMouseDepth(eventData, segment);

        let track = eventData.track;                
        let uwi = segment.trackTube.tubeGroup.well.uwi;        
        let trackName = track.name;        
        let trackToSearch = trackToCopyFrom || track;
        let trackToSearchName = trackToSearch.name;        
        let fillId = track.currentTile.Id; 
        let d1 = 0;
        let d2 = 0;
        let intervalAtMouse = this.intervalAddon.getIntervalAtDepth(mouseDepth, uwi, trackToSearchName);
        let previousInterval = this.intervalAddon.getIntervalBeforeDepth(mouseDepth, uwi, trackToSearchName);
        let nextInterval = this.intervalAddon.getIntervalAfterDepth(mouseDepth, uwi, trackToSearchName);
        if(intervalAtMouse != null){
            d1 = intervalAtMouse.start;
            d2 = intervalAtMouse.stop;
        }
        else {
            //could be case when no interval is present, empty track
            if (previousInterval == null && nextInterval == null)
                return;
            let segments = _(segment.trackTube.tubeGroup.well.getSegments()).orderBy(s => s.getTopDepth()).value();
            if(previousInterval != null){
                d1 = previousInterval.stop;                
            }
            else{
                d1 = segments[0].getTopDepth();
            }
            if(nextInterval != null){
                d2 = nextInterval.start;
            }
            else{
                d2 = segments[segments.length-1].getBaseDepth();
            }
        }

        //for oil sands layout we need to check where the cursor is clicked related to grain sizes
        let subPoints = null;
        let closestGrain = this._getClosestGrainSize(eventData, segment);
        if (this.activeTrack.hasX) {
            subPoints = [];
            subPoints.push({ value: closestGrain != null ? closestGrain.ratio * 100 : 100, depth: d2 })
        }

        //if (this.table.isOilSandsLayout) {
        //    let closestGrain = this._getClosestGrainSize(eventData, segment);
        //    if (this.activeTrack.hasX) {
        //        subPoints = [];
        //        subPoints.push({ value: closestGrain != null ? closestGrain.ratio*100 : 100, depth: d2 })
        //    }
        //}
       
        let secondFillId = track.secondFill != null ? track.secondFill.Id : null;
        //build typeTrackObj to pass to function
        let typeTrackObj = {
            isSampleTrack: track.isSampleTrack,
            isAccessoryTrack: track.isAccessoryTrack,
            isLithologyTrack: track.isLithologyTrack
        }

        //in case of accessory track, the extendedParameters should be taken out of first track ONLY
        let exParamsObj = track.isAccessoryTrack ? table.tracks.find(o => o.name == track.baseName + '0') ?.extendedParametersObj :
            track.extendedParametersObj;

        //in case of custom alteration track for casino we need to duplicate drawing on primary to overprinting
        if (table.userGroup == 'Casino' && track.name == 'Alteration0' && secondFillId != null) {
            if (track.extendedParametersObj == null)
                track.extendedParametersObj = {};
            track.extendedParametersObj.OverprintingAssemblage = secondFillId;
            this.intervalAddon.addInterval(uwi, d1, d2, fillId, trackName, subPoints, this.activeTrack.currentContact, this.activeTrack.textureFillsId, typeTrackObj, null, secondFillId, track.percentage, true, track.description,track.extendedParametersObj);
            this.intervalAddon.addInterval(uwi, d1, d2, secondFillId, 'Alteration1', subPoints, this.activeTrack.currentContact, this.activeTrack.textureFillsId, typeTrackObj, null, secondFillId, track.percentage, true, track.description,track.extendedParametersObj);
        }
        else
            this.intervalAddon.addInterval(uwi, d1, d2, fillId, trackName, subPoints, this.activeTrack.currentContact, this.activeTrack.textureFillsId, typeTrackObj, null, secondFillId, track.percentage, true, track.description,exParamsObj);
        this.onIntervalDrawn();
    }

    _snapAbove(eventData, element, segment, trackToCopyFrom){
        this._stopDrawing();
        let mouseDepth = this.getMouseDepth(eventData, segment);
        let uwi = segment.trackTube.tubeGroup.well.uwi;
        let track = trackToCopyFrom || eventData.track;
        let trackName = track.name;        
        let intervalAtDepth = this.intervalAddon.getIntervalAtDepth(mouseDepth, uwi, trackName);
        let previousInterval = this.intervalAddon.getIntervalBeforeDepth(mouseDepth, uwi, trackName);

        let d2 = 0;
        if(intervalAtDepth != null){            
            d2 = intervalAtDepth.start;
            if(intervalAtDepth.subPoints != null){
                let p = _(intervalAtDepth.subPoints).findLast(sp => sp.depth < mouseDepth);
                d2 = p != null ? p.depth : d2;
            }
        }
        else if(previousInterval != null){
            d2 = previousInterval.stop;
        } else{            
            d2 = _(segment.trackTube.tubeGroup.well.getSegments())
            .orderBy(s => s.getTopDepth())
            .find()
            .getTopDepth();
        }        
        this._startInterval(eventData, element, segment, d2);   
    } 

    _snapBelow(eventData, element, segment, trackToCopyFrom){    
        this._stopDrawing();    
        let mouseDepth = this.getMouseDepth(eventData, segment);
        let uwi = segment.trackTube.tubeGroup.well.uwi;
        let track = trackToCopyFrom || eventData.track;
        let trackName = track.name;      
        let intervalAtDepth = this.intervalAddon.getIntervalAtDepth(mouseDepth, uwi, trackName);  
        let nextInterval = this.intervalAddon.getIntervalAfterDepth(mouseDepth, uwi, trackName);

        let d1 = 0;
        if(intervalAtDepth != null){
            d1 = intervalAtDepth.stop;
            if(intervalAtDepth.subPoints != null){
                let p = _(intervalAtDepth.subPoints).find(sp => sp.depth > mouseDepth);
                d1 = p != null ? p.depth : d1;
            }            
        }
        else if(nextInterval != null){
            d1 = nextInterval.start;
        } else{            
            d1 = _(segment.trackTube.tubeGroup.well.getSegments())
            .orderBy(s => s.getTopDepth())
            .findLast()
            .getBaseDepth();
        }        

        this._startInterval(eventData, element, segment, d1);    
    }       

    _copyAndSnapAbove(eventData, element, segment){       
        this._snapAbove(eventData, element, segment, this.copyTrackSelected);
    }    

    _copyAndSnapBelow(eventData, element, segment){       
        this._snapBelow(eventData, element, segment, this.copyTrackSelected);
    }        

    _copyAndFillBetween(eventData, element, segment){       
        this._fillBetween(eventData, element, segment, this.copyTrackSelected);
    }        

    _removeAtMouse(eventData, element, segment) {
        this._stopDrawing();
        let mouseDepth = this.getMouseDepth(eventData, segment);
        let uwi = segment.trackTube.tubeGroup.well.uwi;
        let track = eventData.track;
        //in case of custom alteration track in casino remove on both lanes
        let numberOfIterations = table.userGroup == 'Casino' && (track.name == 'Alteration0' || track.name == 'Alteration1') ? 2 : 1;
        for (let i = 0; i < numberOfIterations; i++) {
            let trackName = i == 0 ? track.name : i == 1 ? track.name == 'Alteration0' ? 'Alteration1' : 'Alteration0' : track.name;
            let interval = this.intervalAddon.getIntervalAtDepth(mouseDepth, uwi, /*track.name*/trackName);
            if (interval != null) {
                //before removal find the split_pttrn in case of sample and remove as well
                let splitpattern_fill = $("path[id^=lith_" + interval.id + "]").css('fill');
                if (splitpattern_fill != null) {
                    if (splitpattern_fill.includes('url')) {
                        let pttrn_name = splitpattern_fill.split('url("#')[1].slice(0, -2);
                        $("pattern[id^=" + pttrn_name + "]").remove();
                    }
                    $("path[id^=lith_" + interval.id + "]").remove();
                }

                this.intervalAddon.removeInterval(interval);
                //call update for childtables
                this.onIntervalDrawn();
                new DigitalCoreTable.DrawingHelperAddon(this.intervalAddon.table).hideToolTips();
                //deselect all the slide logging parameters
                if (this.intervalAddon.table.parentTable != null)
                    this.intervalAddon.table.parentTable.slideControlAddon._triggerCancelUpdate();
                else
                    this.intervalAddon.table.slideControlAddon._triggerCancelUpdate();
                //if it is sample, execute update
                //if (interval.groupName == 'Sample') {
                //    this.intervalAddon.sampleAddon.update();
                //}
            }
            else {
                if (element.localName == 'image') {
                    //here we have point interval , we need different method to get it
                    let interval = this.intervalAddon.getPointIntervalAtDepth(mouseDepth, uwi, /*track.name*/trackName);
                    if (interval != null) {
                        this.intervalAddon.removeInterval(interval);
                        this.onIntervalDrawn();
                        new DigitalCoreTable.DrawingHelperAddon(this.intervalAddon.table).hideToolTips();
                    }
                }
                //element.remove();
            }
        }
    }
   
    _bothSides(eventData, element, segment){
        this._stopDrawing();
        let initialDepth = this.getMouseDepth(eventData, segment);
        this._startInterval(eventData, element, segment, initialDepth);        
    }

    _startInterval(eventData, element, segment, initialDepth) {
        this.isDrawingInProgress = true;
        this._newInterval.initialXDomain = this._getMouseXDomain(eventData, segment);
        this._newInterval.initialDepth = initialDepth;
        this._newInterval.inProgress = true;
        this._newInterval.track = eventData.track;
        this._newInterval.initialSegment = segment;
        this._newInterval.subPoints = [];
        if(this.activeTrack.hasX){
            this._newInterval.subPoints.push({value: this._newInterval.initialXDomain, depth: this._newInterval.initialDepth})
        }        
        this._continueInterval(eventData, element, segment);
    }

    _continueInterval(eventData, element, segment){
        let secondSegment = this._getSecondSegment(eventData, this._newInterval.initialSegment);
        if(secondSegment == null)
            return;

        let ppx = new OpenSeadragon.Point(eventData.originalEvent.offsetX, eventData.originalEvent.offsetY);                                
        let pviewport = table.pointFromPixel(ppx);                

        let mouseDepth = this.getMouseDepth(eventData, secondSegment);

        let mouseXDomain = this._getMouseXDomain(eventData, segment);
        let initialDepth = this._newInterval.initialDepth;

        if(this.activeTrack.hasX){
            this._newInterval.subPoints.push({value: mouseXDomain, depth: mouseDepth});        
            this._newInterval.subPoints = _(this._newInterval.subPoints)
                .filter(p => p.depth >= Math.min(mouseDepth, initialDepth) && p.depth <= Math.max(mouseDepth, initialDepth))
                .orderBy(p => p.depth)
                .value();

            // simplify is a 3rd party library I'm using to reduce the number of points
            // it expects points in an {x:num, y:num} fashion
            // Higher tolerance means fewer points. seems like 0 - 5 are normalish values?
            // I see no evidence of high quality really doing anything but I set it to true.
            // http://mourner.github.io/simplify-js/
            let highQuality = false;
            let tolerance = 0.005;
            let allPoints = this._newInterval.subPoints.map(p => { return { x: p.value, y: p.depth}; });
            let simplifiedPoints = simplify(allPoints, tolerance, highQuality);         
            this._newInterval.subPoints = simplifiedPoints.map(p => { return {value: p.x, depth: p.y};});
        }
        
        let depth1 = Math.min(initialDepth, mouseDepth);
        let depth2 = Math.max(initialDepth, mouseDepth);
        
        let uwi = secondSegment.trackTube.tubeGroup.well.uwi;                        
        let groupName = segment.trackTube.track.name;
        let potentialSegments = this.table.getSegments()
            .filter(s => s.trackTube.tubeGroup.well.uwi === uwi && s.trackTube.track.name === groupName);        
        let activeSegments = potentialSegments.filter(s => depth1 < s.getBaseDepth() && depth2 > s.getTopDepth());
        if(activeSegments.length === 0 && potentialSegments.length > 0){
            if(depth1 <= potentialSegments[0].getTopDepth()){
                activeSegments = [potentialSegments[0]];
            }
            else{
                activeSegments = [potentialSegments[potentialSegments.length-1]];
            }
        }

        let fill = this._newInterval.track.currentTile;        
        let interval = new DigitalCoreTable.Interval(uuidv1(), uwi, depth1, depth2, fill, groupName);        
        interval.subPoints = this._newInterval.subPoints.map(x => x); // to make copy        
        interval.contact = this._newInterval.track.currentContact;
        interval.textureId = this._newInterval.track.textureFillsId;
        interval.isAccessoryTrack = false; // to avoid not being able to see preview

        let srcs = _(this.intervalAddon.getSrcsForInterval(interval, activeSegments)).orderBy(x => x.x).value();          
        
        let drawingHelper = new DigitalCoreTable.DrawingHelperAddon(table);
        
        // eventData.parentSelection is a custom property to control the parent container of the drawing
        // eg - set in striplogIntervalAddon
        if(eventData.parentSelection != null){            
            drawingHelper.parentSelection = eventData.parentSelection;
        }        
        drawingHelper.drawBlockLeftPath(srcs, this._newInterval.elementClass); 
    }    

    _endInterval(eventData, element, segment) { 
        try {
            this._stopDrawing();
            this.isDrawingInProgress = false;
            let secondSegment = this._getSecondSegment(eventData, this._newInterval.initialSegment);
            //return in case secondSegment is null
            if (secondSegment == null)
                return;
            let d1 = this._newInterval.initialDepth;
            let d2 = this.getMouseDepth(eventData, secondSegment);
            let uwi = this._newInterval.initialSegment.trackTube.tubeGroup.well.uwi;
            let subPoints = this._newInterval.subPoints;
            //check if lithology and there is second fill
            let secondFillId = this._newInterval.track.secondFill != null ? this._newInterval.track.secondFill.Id : null;
            //build typeTrackObj to pass to function
            let typeTrackObj = {
                isSampleTrack: this._newInterval.track.isSampleTrack,
                isAccessoryTrack: this._newInterval.track.isAccessoryTrack,
                isLithologyTrack: this._newInterval.track.isLithologyTrack
            }

            //in case of accessory track, the extendedParameters should be taken out of first track ONLY
            let exParamsObj = this._newInterval.track.isAccessoryTrack ? table.tracks.find(o => o.name == this._newInterval.track.baseName + '0') ?.extendedParametersObj :
                this._newInterval.track.extendedParametersObj;
            //in case of custom alteration track for casino we need to duplicate drawing on primary to overprinting
            if (table.userGroup == 'Casino' && this._newInterval.track.name == 'Alteration0' && secondFillId != null) {
                if (this._newInterval.track.extendedParametersObj == null)
                    this._newInterval.track.extendedParametersObj = {};
                this._newInterval.track.extendedParametersObj.OverprintingAssemblage = secondFillId;
                this.intervalAddon.addInterval(uwi, Math.min(d1, d2), Math.max(d1, d2), this._newInterval.track.currentTile.Id, this._newInterval.track.name, subPoints, this._newInterval.track.currentContact, this._newInterval.track.textureFillsId, typeTrackObj, null, secondFillId, this._newInterval.track.percentage, true, this._newInterval.track.description,this._newInterval.track.extendedParametersObj);
                this.intervalAddon.addInterval(uwi, Math.min(d1, d2), Math.max(d1, d2), secondFillId, 'Alteration1', subPoints, this._newInterval.track.currentContact, this._newInterval.track.textureFillsId, typeTrackObj, null, null, this._newInterval.track.percentage, true, this._newInterval.track.description,this._newInterval.track.extendedParametersObj);
            }
            else
                this.intervalAddon.addInterval(uwi, Math.min(d1, d2), Math.max(d1, d2), this._newInterval.track.currentTile.Id, this._newInterval.track.name, subPoints, this._newInterval.track.currentContact, this._newInterval.track.textureFillsId, typeTrackObj, null, secondFillId, this._newInterval.track.percentage, true, this._newInterval.track.description,exParamsObj);
            //update top/bottom inputs on master table
            let mstrTbl = table.parentTable != null ? table.parentTable : table;

            mstrTbl.slideControlAddon._updateTopBottomDepth(Math.min(d1, d2).toFixed(4), Math.max(d1, d2).toFixed(4), this._newInterval.track);
            //deselect tool button to exit drawing mode
            //table.slideControlAddon._setDrawingToolInactive();
            //assign that interval to selectedInterval in slidecontrolAddon in order to be able to edit it
            let intervalJustDrawn = this.intervalAddon.intervals.find(o => o.start == Math.min(d1, d2) && o.stop == Math.max(d1, d2) && o.groupName == this._newInterval.track.name);
            table.slideControlAddon.selectedInterval = intervalJustDrawn;
            if (table.mode == 'striplog' && table.parentTable != null)
                table.parentTable.slideControlAddon.selectedInterval = intervalJustDrawn;
            else if (table.childTablesAddon != null){
                table.childTablesAddon.striplogChildren[0].table.slideControlAddon.selectedInterval = intervalJustDrawn;
            }
            this.onIntervalDrawn();
        }
        catch{
            this.intervalAddon.saveWellIntervals(table.wells[0].uwi, null);
        }
    }

    _startResizeInterval(eventData, element, segment){
        this._endResizeInterval(eventData, element, segment);

        const isTouchingThreshold = 0.00001;
        const minIntervalSize = 0.01;
        let currentTrack = eventData.track;
        let groupName = currentTrack.name;
        let initialDepth = this.getMouseDepth(eventData, segment);     
        let intervals = _(this.intervalAddon.intervals).filter(interval => interval.groupName === groupName)
            .orderBy(interval => interval.start)
            .value();  
        //in case of special track alteration1 in casino
        let intervalsAlteration1 = _(this.intervalAddon.intervals).filter(interval => interval.groupName === 'Alteration1')
            .orderBy(interval => interval.start)
            .value();  
        let roundFunc = num => Math.round(num * 100)/100;
        let intervalClickedOn = intervals.find(interval => roundFunc(interval.start) <= roundFunc(initialDepth) && roundFunc(interval.stop) >= roundFunc(initialDepth));                    
        if(intervalClickedOn == null){
            return;
        }

        this._resizeInterval.initialDepth = initialDepth;
        this._resizeInterval.inProgress = true;
        this._resizeInterval.track = eventData.track;
        this._resizeInterval.initialSegment = segment;          

        let isStartCloser = Math.abs(intervalClickedOn.start - initialDepth) < Math.abs(intervalClickedOn.stop - initialDepth);
        let boundaryDepth = isStartCloser ? intervalClickedOn.start : intervalClickedOn.stop;

        // handle interval above the line we're moving
        let previousInterval = _(intervals).findLast(interval => interval.stop <= boundaryDepth);
        //special alteration1 interval
        let previousIntervalAlteration1 = table.userGroup == 'Casino' ? _(intervalsAlteration1).findLast(interval => interval.stop <= boundaryDepth) : null;
        if(previousInterval != null && Math.abs(previousInterval.stop - boundaryDepth) <= isTouchingThreshold){
            this._resizeInterval.aboveInterval = previousInterval;
            this._resizeInterval.aboveIntervalAlteration1 = previousIntervalAlteration1 != null && Math.abs(previousIntervalAlteration1.stop - boundaryDepth) <= isTouchingThreshold ?
                previousIntervalAlteration1 : null;
            this._resizeInterval.minDepth = previousInterval.start + minIntervalSize;
        }
        else if(previousInterval != null){
            this._resizeInterval.aboveInterval = null;
            this._resizeInterval.aboveIntervalAlteration1 = null;
            this._resizeInterval.minDepth = previousInterval.stop;
        }
        else{
            this._resizeInterval.aboveInterval = null;
            this._resizeInterval.aboveIntervalAlteration1 = null;
            this._resizeInterval.minDepth = -Infinity;            
        }

        // handle interval below the line we're moving
        let nextInterval = _(intervals).find(interval => interval.start >= boundaryDepth);
        let nextIntervalAlteration1 = table.userGroup == 'Casino' ? _(intervalsAlteration1).find(interval => interval.start >= boundaryDepth) : null;
        if(nextInterval != null && Math.abs(nextInterval.start - boundaryDepth) <= isTouchingThreshold){
            this._resizeInterval.belowInterval = nextInterval;
            this._resizeInterval.belowIntervalAlteration1 = nextIntervalAlteration1 != null && Math.abs(nextIntervalAlteration1.start - boundaryDepth) <= isTouchingThreshold ?
                nextIntervalAlteration1 : null;
            this._resizeInterval.maxDepth = nextInterval.stop - minIntervalSize;
        }
        else if(nextInterval != null){
            this._resizeInterval.belowInterval = null;
            this._resizeInterval.belowIntervalAlteration1 = null;
            this._resizeInterval.maxDepth = nextInterval.start;
        }
        else{
            this._resizeInterval.belowInterval = null;
            this._resizeInterval.belowIntervalAlteration1 = null;
            this._resizeInterval.maxDepth = Infinity;            
        }

        // handle interval above the line we're moving

        this._continueResizeInterval(eventData, element, segment);
    }       

    _continueResizeInterval(eventData, element, segment){
        let secondSegment = this._getSecondSegment(eventData, this._resizeInterval.initialSegment);
        if(secondSegment == null)
            return;
        
        let ppx = new OpenSeadragon.Point(eventData.originalEvent.offsetX, eventData.originalEvent.offsetY);                                
        let pviewport = table.pointFromPixel(ppx);                
        let mouseDepth = this.getMouseDepth(eventData, secondSegment);
        let newDepth = Math.min(mouseDepth, this._resizeInterval.maxDepth);
        newDepth = Math.max(newDepth, this._resizeInterval.minDepth);

        if(this._resizeInterval.aboveInterval != null){
            this._resizeInterval.aboveInterval.stop = newDepth;

            if (this._resizeInterval.aboveIntervalAlteration1 != null)
                this._resizeInterval.aboveIntervalAlteration1.stop = newDepth;
        }
        if (this._resizeInterval.belowInterval != null) {
            if (this._resizeInterval.belowIntervalAlteration1 != null)
                this._resizeInterval.belowIntervalAlteration1.start = newDepth;

            this._resizeInterval.belowInterval.start = newDepth;
        }
        
        this.onIntervalDrawn();
    }   
    
    _endResizeInterval(eventData, element, segment){        
        if(this._resizeInterval.aboveInterval != null){
            this.intervalAddon.saveWellIntervalsDelayed(this._resizeInterval.aboveInterval.uwi, this._resizeInterval.aboveInterval.groupName);
        }
        else if(this._resizeInterval.belowInterval != null){
            this.intervalAddon.saveWellIntervalsDelayed(this._resizeInterval.belowInterval.uwi, this._resizeInterval.belowInterval.groupName);
        }

        this._resizeInterval.initialDepth = 0;
        this._resizeInterval.inProgress = false;
        this._resizeInterval.track = null;
        this._resizeInterval.initialSegment = null;  
        this._resizeInterval.aboveInterval = null;
        this._resizeInterval.belowInterval = null;
        this._resizeInterval.maxDepth = Infinity;     
        this._resizeInterval.minDepth = -Infinity;             
    }    

    _getSecondSegment(eventData, initialSegment){
        let ppx = new OpenSeadragon.Point(eventData.originalEvent.offsetX, eventData.originalEvent.offsetY);                        
        let pviewport = this.table.pointFromPixel(ppx);        
        let mouseX = pviewport.x;
        let mouseY = pviewport.y;
        let well = initialSegment.trackTube.tubeGroup.well;

        let tubeGroup = _(well.tubeGroups).filter(x => x.getSegments().length > 0)
            .findLast(tg => mouseX >= tg.x);
        if(tubeGroup == null){
            tubeGroup = well.tubeGroups[0];            
        }        
        let trackTube = tubeGroup.trackTubes.find(x => x.track.name === initialSegment.trackTube.track.name);        
        let secondSegment = _(trackTube.segments).findLast(s => mouseY > s.y);
        if(secondSegment == null){
            secondSegment = trackTube.segments[0];
        }
        return secondSegment;  
    }         

    getMouseDepth(eventData, segment){                         
        let ppx = new OpenSeadragon.Point(eventData.originalEvent.offsetX, eventData.originalEvent.offsetY);                        
        let pviewport = table.pointFromPixel(ppx);        
        let mouseY = pviewport.y;    
        let depth = segment.getDepthFromY(mouseY);
        depth = Math.max(depth, segment.getTopDepth());
        depth = Math.min(depth, segment.getBaseDepth());
        return depth;
    }

    /*
     * Applicable for oil sands layout. We need to know what closest grain size the cursor is clicked on
     * @param {any} eventData
     * @param {any} segment
     */
    _getClosestGrainSize(eventData, segment) {
        let mouseXDomain = this._getMouseXDomain(eventData, segment);
        let xMin = DigitalCoreTable.settings.intervalXMin;
        let xMax = DigitalCoreTable.settings.intervalXMax;
        let goalRatio = (mouseXDomain - xMin)/(xMax - xMin);

        let ppx = new OpenSeadragon.Point(eventData.originalEvent.offsetX, eventData.originalEvent.offsetY);
        let findClosest = function (x, arr) {
            var indexArr = arr.map(function (k) { return Math.abs(k.ratio - x) })
            var min = Math.min.apply(Math, indexArr)
            return arr[indexArr.indexOf(min)]
        }
        return findClosest(goalRatio, DigitalCoreTable.grainLabels); 
    }

    _getMouseXDomain(eventData, segment){
        let ppx = new OpenSeadragon.Point(eventData.originalEvent.offsetX, eventData.originalEvent.offsetY);                        
        let pviewport = table.pointFromPixel(ppx);
        let mouseX = pviewport.x;
        let xMin = DigitalCoreTable.settings.intervalXMin;
        let xMax = DigitalCoreTable.settings.intervalXMax;
        let mouseXDomain = segment.getDomainValueFromXCustomScale(mouseX, xMin, xMax);
        mouseXDomain = Math.max(xMin, mouseXDomain);
        mouseXDomain = Math.min(xMax, mouseXDomain);
        return mouseXDomain;
    }    

    _stopDrawing(){
        this._newInterval.inProgress = false;
        this._resizeInterval.inProgress = false;
        d3.selectAll('.' + this._newInterval.elementClass)
            .remove();
    }      

    getIntervalSrcs(groupName){
        return this.intervalAddon.getIntervalSrcs(groupName);
    }    

    drawAll(){
        let parentSelection = this.table.svg;
        let intervalSrcs = this.getIntervalSrcs().filter(x => x);     
        this.draw(intervalSrcs, parentSelection)
    }

    /**
     * Update the interval elements on screen(position, dimensions, delete old, add new, etc).
     */
    draw(intervalSrcs, parentSelection) {                
        let addon = this;
        let intervalClass = 'dctInterval';        

        let drawingHelper = new DigitalCoreTable.DrawingHelperAddon(table);
        drawingHelper.parentSelection = parentSelection;
        let nonAccessoryTracks = intervalSrcs.filter(is => !is.interval.isAccessoryTrack);
        let intervalSelections = drawingHelper.drawBlockLeftPath(nonAccessoryTracks, intervalClass);

        //draw samples from sampleAddon        
        let sampleIntervalSrcs = intervalSrcs.filter(o => o.interval.isSampleTrack);
        drawingHelper.drawSamples(sampleIntervalSrcs, 'dctSampleCount');
        //filter the samples , we don't want the NA and Core be split
        let notAnalyzedFill = this.table.fills.find(o => o.Name == 'NA');
        let filteredIntervalCoordSrcs = sampleIntervalSrcs.filter(o => o.interval.sample != null && o.interval.sample.sharedFill != null && o.interval.sample.sharedFill != notAnalyzedFill);
        drawingHelper._drawSharedSamplesPattern(filteredIntervalCoordSrcs);



        drawingHelper.fillSelectionWithPattern(intervalSelections.updateSelection, 'lith_texture', 'lith', true);
        drawingHelper.drawCenterAlignedLabels(nonAccessoryTracks.filter(o => !o.interval.isSampleTrack), 'dctIntervalLabels');

        let lithologyIntervalSrcs = intervalSrcs.filter(src => src.interval.isLithologyTrack);
        this.intervalAddon.contactHelper.drawContacts(lithologyIntervalSrcs, parentSelection);

        if (this.table.isOilSandsLayout) {
            //extended lithology drawing if oil sands layout, gradients the existing interval and puts a box behind it, filters and there is no second fill as well
            let extLithologySrcs = lithologyIntervalSrcs.filter(t => t.interval.lithologyExtended!=null);

            //let extLithologySrcs = lithologyIntervalSrcs.filter(t => this.intervalAddon.lithologiesExtended.some(r => r.IntervalId == t.interval.id) && t.secondFill != null);
            //we got the srcs for those extended lithologies, now we need to group them by src.interval.id and calculate the data
            // for the gradient. We will use the function from helperAddon
            //$('rect[id^=rectbehind]').remove();
            let grds = _createGradientFromSrcs(extLithologySrcs);
            drawingHelper.fillSelectionWithGradientColor1(extLithologySrcs, grds, 'dctExtendedLithologyInterval');

            //if (extLithologySrcs.length > 0) {
            //    let grds = _createGradientFromSrcs(extLithologySrcs);
            //    drawingHelper.fillSelectionWithGradientColor1(extLithologySrcs, grds, 'dctExtendedLithologyInterval');
            //}
        }

        //texture is behind whole interval and not only circle
        //let accessorySelections = drawingHelper.drawBlockLeftPath(intervalSrcs.filter(is => is.interval.isAccessoryTrack && (is.interval.groupName.includes('Majors') || is.interval.groupName.includes('Minors'))), intervalClass);
        this._drawPatternsOnAccessoryTracks(intervalSrcs, parentSelection);
        //drawingHelper.fillSelectionWithPattern(accessorySelections.updateSelection, 'acc_texture_1', 'acc', true);

        this._drawGuideLinesForLithology();
        this.table.descriptionTracks.forEach(dt => {
            let descrtrack = this.table.getTrackByName(dt.name);
            intervalSrcs = descrtrack != null && descrtrack.isVisible ? intervalSrcs : [];
            if (this.table.striplogAddon == null)
                drawingHelper.drawDescription(intervalSrcs.filter(o => dt.tracksForDescription.some(x => x == o.interval.groupName)));
        })
    }

    drawDescription(intervalSrcs, parentSelection) {
        let drawingHelper = new DigitalCoreTable.DrawingHelperAddon(table);
        drawingHelper.parentSelection = parentSelection;
        drawingHelper.drawDescription(intervalSrcs);
    }

    _drawGuideLinesForLithology(){
        // i didn't have time to clean this up and remove copy paste before I left
        let gClass = 'dctlithologyguidelines';
        let trackTubes = this.table.getTrackTubes().filter(x =>  x.track.isVisible && x.track.hasX);

        let tubeWidth = 1; //defaults
        let tubeHeight = 1; //defaults

        // Guide Lines
        let patternId = gClass + 'pattern';
        let defsSel = table.svg
            .select('defs');
        //defsSel.selectAll('#' + patternId)
        //    .remove();
        //let patternSel = defsSel.append('svg:pattern')
        //    .classed(patternId,true)
        //    .attr('id', patternId)
        //    .attr('patternContentUnits', 'objectBoundingBox')
        //    .attr('patternUnits', 'objectBoundingBox')                            
        //    .attr('x', 0)
        //    .attr('y', 0)
        //    .attr('width', tubeWidth)
        //    .attr('height', tubeHeight)
        //    .attr('opacity', 1);
        //DigitalCoreTable.grainLabels.forEach(category => {
        //    let w = category.ratio * tubeWidth;
        //    patternSel.append('line')
        //        .attr('x1', w)
        //        .attr('x2', w)
        //        .attr('shape-rendering', "crispEdges")
        //        .attr('y1', 0)
        //        .attr('y2', tubeHeight)
        //        .attr('stroke', '#000000')
        //        .attr('stroke-dasharray', '0.005,0.005')
        //        .attr('stroke-width', tubeWidth / 100);            
        //});    
        let srcs = trackTubes.filter(o => o.segments.length > 0).map(trackTube => {
            let ystart = trackTube.segments != null && trackTube.segments.length > 0 ? trackTube.segments[0].y : trackTube.y;
            let lastsegment = trackTube.segments[trackTube.segments.length - 1];
            let src = {
                y: ystart,
                x: trackTube.x,
                height: lastsegment.y + lastsegment.height, // to prevent going off the trackTube
                width: trackTube.width,
                fill: 'url(#' + 'dctgrainsizepattern' + ')',
                stroke: 'none',
            };
            return src;
        });

        if (table.striplogAddon != null) {
            //assign width to the pattern and the path
            if (trackTubes.length > 0) {
                $('.dctgrainsizepattern').attr('width', srcs[0].width);
                DigitalCoreTable.grainLabels.forEach(category => {
                    let r = category.ratio * srcs[0].width;
                    let pth = 'M' + r + ',0L' + r + ',' + srcs[0].height + 'z';
                    $('.dctgrainsizepattern path#' + category.name).attr('d', pth);
                    $('.dctgrainsizepattern path#' + category.name).attr('stroke-width', trackTubes[0].width / 200);
                });
            }
        }
        let newsrcs = []
        //get unique values from array filtered on x
        let unique_values = _unique(srcs.map(function (d) { return d.x }))

        unique_values.forEach(function (d) {
            let a = srcs.find(o => o.x == d)
            if (a != null)
                newsrcs.push(a)
        })

        let drawingHelper = new DigitalCoreTable.DrawingHelperAddon(this.table);
        //for strip log we need to take total height
        if (table.striplogAddon != null && newsrcs.length >0) {
            newsrcs[0].height = table.striplogAddon.getDisplayHeightOSD()
        }
         
        drawingHelper.drawRect(newsrcs, gClass, true);     
    }    

    _drawPatternsOnAccessoryTracks(intervalSrcs, parentSelection) {
        let addon = this;
        //we need to distinguish track that will use only circle pattern
        let allTracks = table.getAccessoryTracks();
        //let accessorySrcs = intervalSrcs.filter(src => src.interval.isAccessoryTrack);// || this.getIntervalSrcs(allTracks);
        let accessorySrcs = intervalSrcs.filter(src => src.interval.isAccessoryTrack && src.interval.fill != null && src.interval.fill.Abbr != 'LC');
        let drawingHelper = new DigitalCoreTable.DrawingHelperAddon(table);
        if (parentSelection != null) {
            drawingHelper.parentSelection = parentSelection;
        }
        let structurenames = this.table.tracklayouts.find(o => o.TrackTypeName == 'Structure').Names.split(";");//.some(nm => nm == baseName);
        let nonStructureSrcs = accessorySrcs.filter(src => !structurenames.some(o => o == _getBaseNameFromAccessoryTrackName(src.interval.groupName)));
        drawingHelper.drawOnAccessoryTrack(accessorySrcs, 'dctAccessoryPath');
        if (!table.isOilSandsLayout) {
            let structureSrcs = accessorySrcs.filter(src => structurenames.some(o => o == _getBaseNameFromAccessoryTrackName(src.interval.groupName)));
            //drawingHelper.drawCenterAlignedLabels(structureSrcs, 'dctAccessoryLabels');
            drawingHelper.drawCenterAlignedLabels(accessorySrcs, 'dctAccessoryLabels');
            //draw circle only on point intervals
            drawingHelper.drawCirclePatternOnAccessoryTracks(accessorySrcs.filter(seg=>seg.interval.start == seg.interval.stop), 'dctTextInCircle');
            //let updateSelection = drawingHelper.drawCirclePatternOnAccessoryTracks(nonStructureSrcs, 'dctTextInCircle');
        }
        else {
            //drawingHelper.drawCenterAlignedLabels(/*this.getIntervalSrcs(allTracks.filter(a => a.includes('Ichnofossils')))*/intervalSrcs.filter(src => src.interval.isAccessoryTrack && src.interval.groupName == 'Ichnofossils'), 'dctAccessoryLabels');            
            drawingHelper.drawCenterAlignedLabels(accessorySrcs.filter(o => _getBaseNameFromAccessoryTrackName(o.interval.groupName) == 'Ichnofossils'), 'dctAccessoryLabels');            
            //let oilSandsAccessoriesSrcs = intervalSrcs.filter(src => src.interval.groupName.includes('Structure') || src.interval.groupName.includes('Accessories'));
            let oilSandsAccessoriesSrcs = accessorySrcs.length > 0 ? accessorySrcs.filter(o => o.interval.fill != null && o.interval.fill.ResourceStretch != null) : [];
            let sel = drawingHelper.drawCenterAlignedImage(oilSandsAccessoriesSrcs, 'dctAccessoryImage');
        }
    }


}