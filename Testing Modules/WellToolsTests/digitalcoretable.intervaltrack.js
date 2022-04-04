var DigitalCoreTable = DigitalCoreTable || {};
/**
 * A simple interval track, could be RGB without tools and tiles
 */
DigitalCoreTable.IntervalTrack = class IntervalTrack extends DigitalCoreTable.Track{
    constructor(name, tiles, tools){
        super(name);
        /**
         * The tileset (check drawingtiles/tileset.js) is an image and a color that is tiled. Like sand and etc.
         */      
        this.tiles = tiles != null ? tiles : [];

        /**
         * @type {Array.DigitalCoreTable.IntervalTool} 
         */
        this.tools = tools; // i'm setting this elsewhere

        /**
         * @type {DigitalCoreTable.IntervalTool} 
        */
        this.currentTool = null;

        /**
         * Currently selected tile
         */
        this.currentTile = this.tiles != null ? this.tiles[0] : null;
    
        /**
         * Callbacks that are called when open or close
         * @callback openCloseCallback
         * @param {DigitalCoreTable.IntervalTrack} thisTrack this track
         */             
        this._openHandlers = [];
        this._closeHandlers = [];
        /**
         * Callbacks that are called when open or close
         * @callback selectionCallback
         * @param {string} selectedString value of selection box
         * @param {DigitalCoreTable.IntervalTrack} thisTrack this track
         */             
        this._selectionHandlers = [];        
        /**
         * Holds the dialogs by their order of appearance
         */
        this.dlgs = [];         
        /**
         * Holds the arguments received upon action
         */
        this.args = null;
        /*
         * This is the table reference that we get from floating header
         */
        this.table = null;

        /**
         * This interval has an x axis like lithology or is simple like alteration
         * @type {boolean}
         */
        this.hasX = false;

        /**
         * For dynamic resizing
         * @type {number}
         */
        this.minWidthPx = DigitalCoreTable.settings.trackMinWidthPx;
        /**
         * For dynamic resizing
         * @type {number}
         */
        this.maxWidthPx = DigitalCoreTable.settings.trackMaxWidthPx;
        /**
         * For dynamic resizing
         * @type {number}
         */
        this.desiredWidthPx = DigitalCoreTable.settings.trackDesiredWidthPx;
        this.abundance = 2; // by default 2 means solid line
        this.textureFillsId = null; 
        this.isAccessoryTrack = false;
        this.isSampleTrack = false;
        this.uwi = null;
        this.isAdmin = false;// set to true only when there is parameter in url for admin=true
        this.selectedFillsIndex = -1; // we need that in order to store selected Fill in popup
        this.description = null;//gets text from Description textarea
        this._initializeExtendedParameters();
    }

    //initializing extended parameters based on userGroup
    _initializeExtendedParameters() {
        this.extendedParametersObj = null;

        switch (table.userGroup) {
            case 'Barrick':
                this.extendedParametersObj = {
                    Text1: null,
                    Text2: null,
                    Text3: null,
                    Text5: null,
                    Text6: null,
                    Text7: null,
                    Text8: null,
                    Text9: null,
                    Text10: null,
                    Text11: null,
                    Text12: null,
                    IntNumber1: null,
                    IntNumber2: null,
                    IntNumber3: null,
                    IntNumber4: null,
                    DoubleNumber:null
                }
                break;
            case 'Casino':
                this.extendedParametersObj = {
                    PrimaryOccurance: null,
                    OverprintingOccurance: null,
                    OverprintingAssemblage: null,
                    DominantAssemblage: null,
                    StructIntvlAlphaTop: null,
                    StructIntvlAlphaBot: null
                };
                break;
            case 'Kirkland':
                this.extendedParametersObj = {
                    Mineralization1: null,
                    Mineralization2: null,
                    Texture1: null,
                    Texture2: null,
                    Amount1: null,
                    Amount2: null,
                    Angle: null,
                    Zone: null,
                    Type: null,
                    Alteration: null,
                    VeinType: null,
                    VeinStyle: null,
                    VeinPCT: null,
                    VeinTCA: null,
                    CoreAngle: null,
                    PCT: null
                };
                break;
            case 'CleanAir':
                this.extendedParametersObj = {
                    Mineralization1: null,
                    Mineralization2: null,
                    Style: null,
                    Shape: null,
                    Roughness: null,
                    AngleAlpha: null,
                    AngleBeta: null,
                    Reading: null,
                    Conductivity: null
                };
                break;
            case 'Rio':
                this.extendedParametersObj = {
                    Style: null,
                    PCT: 0
                };
                break;
            case 'UpperBeaver':
                this.extendedParametersObj = {
                    Style: null,
                    Colour: null,
                    Intensity: 0,
                    Grainsize: null,
                    Percent: 0,
                    Angle: 0,
                    AngleAlpha: 0,
                    AngleBeta: 0,
                    AngleGamma: 0,
                    Width: 0,
                    Texture: null,
                    MnzType: null,
                    MnzType2: null,
                    MnzType3: null,
                    MnzType4: null,
                    MnzPercent: 0,
                    MnzPercent2: 0,
                    MnzPercent3: 0,
                    MnzPercent4: 0
                };
                break;
            default: break;
        }
    }

    /**
     * Adds a callback that is called when the menu is closed
     * @param {openCloseCallback} openHandler callback called on open
     */
    addOpenHandler(openHandler){
        this._openHandlers.push(openHandler);
    }

    /**
     * Adds a callback that is called when the menu is closed
     * @param {openCloseCallback} closeHandler callback called on open
     */
    addCloseHandler(closeHandler){
        this._closeHandlers.push(closeHandler);
    }

    /**
     * Adds a callback that is called a selection is made
     * @param {selectionCallback} selectionHandler callback called on selection
     */
    addSelectionHandler(selectionHandler) {
        this._selectionHandlers.push(selectionHandler);
    }

    SetPointerEventsOnOff(element_index, toggle) {
        let str = toggle ? 'all' : 'none';
        $("text[id*='lblhdr" + element_index + "'").css('pointer-events', str);
        $("rect[id*='recthdr" + element_index + "'").css('pointer-events', str);
    }

    accessoryTrackRowSelectionHandler() {
        //as accessory can come without abundance we check for its existance
        let tAbundance = $('#tableAbundance > tbody');
        let abundance = 2;
        if (tAbundance[0] != null) { // we have table now check for selection
            let tAbundanceCell = $('#tableAbundance > tbody > tr.selected');
            if (tAbundanceCell[0] != null)
                abundance = tAbundanceCell[0].rowIndex;
            else
                abundance = tAbundance[0].rows.length - 1;
        }

        table.viewer.raiseEvent('update_accessory_params', {
            abundance: abundance,
            textureId: this._getTextureSelection()
            });

       // if (tAbundanceCell.length != 0) {
            //table.viewer.raiseEvent('update_accessory_params', {
            //    abundance: tAbundanceCell.length != 0 ? tAbundanceCell[0].parentElement.rowIndex, // weak - 0,moderate - 1,strong - 2
            //    textureId: this._getTextureSelection()
            //});
      //  }
    }

    _getTextureSelection() {
        let textureId = null;
        let tTextureCell = $('#Iframe').contents().find('#tableTexture > tbody > tr.selected > td');
        let textureName = tTextureCell.length == 0 ? null : tTextureCell[1].innerText;
        if (textureName != null) {
            let found = this.tiles.find(f => f.Name == textureName);
            textureId = found != null ? found.Id : null;
        }
        return textureId;
    }

    veinRowSelectionHandler(){
    //raise event to be caught in rgbAddon that updates active parameters for drawing
    let tHalosCell = $('#Iframe').contents().find('#tableHalo > tbody > tr.selected > td');
    let tTimingCell = $('#Iframe').contents().find('#tableTiming > tbody > tr.selected > td');
    let tTextureCell = $('#Iframe').contents().find('#tableTexture > tbody > tr.selected > td');
    let tFillsCell = $('#Iframe').contents().find('#tableMinerology > tbody > tr.selected > td');

        table.viewer.raiseEvent('update_active_params_vein', {
            activeFill_color_rgb: tFillsCell[0].style.backgroundColor, // we know for sure that row is selected
            activeHalo_color_rgb: tHalosCell.length == 0 ? tFillsCell[0].style.backgroundColor : tHalosCell[0].style.backgroundColor, // if halo is not selected , use minerology selection
            activeTiming_index: tTimingCell.length == 0 ? 0 : tTimingCell[0].parentElement.rowIndex,
            activeTexture_name: tTextureCell.length == 0 ? null : tTextureCell[1].innerText,
            isHaloSelected: tHalosCell.length != 0, // if halo is not selected , use minerology selection
            isClassification: false
     });
    }

    veinExtRowSelectionHandler(fillsRow,isXRD) {
        let intervalTrack = this;
        //raise event to be caught in rgbAddon that updates active parameters for drawing
        //let tFillsCell = $('#tableLithology > tbody > tr.selected > td');
        let colorCell = $(fillsRow).find("td:first");
        let nameCell = $(fillsRow).find("td:nth-child(2)");
        table.viewer.raiseEvent('update_active_params_vein', {
            activeFill_color_rgb: colorCell.css('background-color'),
            name: nameCell.text(),
            isClassification: true,
            isXRD: isXRD,
            uwi: intervalTrack.uwi
        });
    }

    _expandShrinkLithologyTrack(isExpand) {
        if (this.table.striplogAddon != null) {
            let lithtrack = this.table.striplogAddon.curvePlot.logChartModel.Tracks.find(o => o.Name == 'Lithology');
            lithtrack.Width = isExpand ? DigitalCoreTable.settings.striplogWideInUseTrackWidth : DigitalCoreTable.settings.striplogNotInUseTrackWidth;
            this.table.striplogAddon.curvePlot.update();
        }
        else {
            this.width = isExpand ? 1350 : 450;
            this.table.update();
        }
    }

    action(arg) {
        //we initialize the parameters
        var intervalTrack = this;
        var itAddon = this;
        var appendedParameters = '';
        this.args = arg;
        this.table = arg.tblReference;
        this.uwi = arg.tblReference.wells[0].uwi;
        //we can end up without niceName(if it comes from striplog), in that case generate it
        if (this.niceName == '' && this.isAccessoryTrack)
            this.niceName = _getBaseNameFromAccessoryTrackName(this.name);
        //check for Sampling Rules frame, if it is open then return
        if ($("#IframeSR")[0] != null)
            return;
        //we can click on different track header and it will automatically close the open dialog and open another one according to the header
        if ($("#Iframe")[0] != null) // we need to close it and return pointer events to that index (done in close function)
        {
            jQuery(document).find('div#PopupForm').dialog('close');
        }

        //upon header click open the slide control and put the track selection for that track
        //if (this.table.striplogAddon != null)
        //    return;
        //in case of there is only striplog, without parent Table then open separately


        if (table.mode == 'striplog' && table.parentTable == null || table.mode == null) {
            $('#slideControlHolder').show("slide", { direction: "right" }, 1000);
            $('a[href="#menuLogging"]').tab('show');
            $('select#trackSelectionSC').val(this.niceName);
            $('select#trackSelectionSC').trigger('change');
        }
        else if (table.mode == 'striplog' && table.parentTable != null) {
            table.parentTable.striplogHeaderTrackClicked(this.niceName);
            $('a[href="#menuLogging"]').tab('show');
        $('select#trackSelectionSC').val(this.niceName);
        $('select#trackSelectionSC').trigger('change');

        }

        intervalTrack._closeHandlers.forEach(f => {
            f(intervalTrack);
        });

        intervalTrack._openHandlers.forEach(f => {
            f(intervalTrack);
        });

        //$('#slideControlHolder').show("slide", { direction: "right" }, 1000);
        //$('a[href="#menuLogging"]').trigger('click');
        //$('select#trackSelectionSC').val(this.niceName);
        //$('select#trackSelectionSC').trigger('change');


        //we store the snapto track selection
        let snapTrack = $('select#select_trackNames').val();
        let selectedTrack = this.table.tracks.find(t => t.name === snapTrack);
        table.intervalAddon.intervalDrawing.copyTrackSelected = selectedTrack;
        if (table.parentTable != null)
            table.parentTable.intervalAddon.intervalDrawing.copyTrackSelected = selectedTrack;
        //if (table.parentTable == null)
        //if (table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0)
        //    table.childTablesAddon.striplogChildren[0].table.intervalAddon.intervalDrawing.copyTrackSelected = selectedTrack;
        //else
        //    table.intervalAddon.intervalDrawing.copyTrackSelected = selectedTrack;

        return;
    }

    action_slide(arg) {
        //we initialize the parameters
        var intervalTrack = this;
        var appendedParameters = '';
        this.args = arg;
        this.table = arg.tblReference;
        this.uwi = arg.tblReference.wells[0].uwi;
        this.currentTool = null;
        //we can end up without niceName(if it comes from striplog), in that case generate it
        if (this.niceName == '' && this.isAccessoryTrack)
            this.niceName = _getBaseNameFromAccessoryTrackName(this.name);
        //check for Sampling Rules frame, if it is open then return
        if ($("#IframeSR")[0] != null)
            return;
        //we can click on different track header and it will automatically close the open dialog and open another one according to the header
        if ($("#Iframe")[0] != null) // we need to close it and return pointer events to that index (done in close function)
        {
            jQuery(document).find('div#PopupForm').dialog('close');
        }

        ////remove the pointer events for recthdr and lblhdr for specific index
        //intervalTrack.SetPointerEventsOnOff(arg.index_current, false);
        //if (arg.index_previous != arg.index_current)
        // intervalTrack.SetPointerEventsOnOff(arg.index_previous, true);

        //expanding LIthology track
        if (this.constructor.name == 'LithologyTrack') {
            this._expandShrinkLithologyTrack(true);
        }
        // we determine which html we should open according to the header clicked
        let nm_uppercase = this.niceName.toUpperCase();
        var url = '';
        let mainFills = [];
        if (nm_uppercase == 'HIRES') {
            mainFills = intervalTrack.table.isCurrentLayoutClassification() ? intervalTrack.table.classifiers : this.tiles.filter(f => f.Group.toUpperCase() == 'RGB_VEIN')
        }
        else {
            mainFills = this.fills;
        }

        mainFills.forEach(function CombineUrl(tile, index) {
            appendedParameters += (index == 0 ? "c=" : "&c=") + tile.Color + '&n=' + tile.Name;
        });

        let textureFills = [];

        //this includes RGB and others, we don't need to include them and therefore use table._defaultTracks instead
        table._defaultTracks.map(o => o.name).sort().forEach(track => {
            //skip trackName that is the same as the name of window it is in
            if (track.toUpperCase() != nm_uppercase)
             appendedParameters += "&tnm=" + track;
        })

        //send the name of the accessed track as well
        appendedParameters += "&ATN=" + this.niceName; // active track name (ATN)
        ////combine intensities/abundances if exist
        //this.intensities.forEach(function (intensity) {
        //    appendedParameters += "&intens=" + intensity;
        //}); 

        url = arg.url;

        let title = intervalTrack.niceName.replace('HIRES', intervalTrack.table.isCurrentLayoutClassification() ? 'Classification' : 'Vein Map');

        var dialogHeight = 400;
        if (nm_uppercase == 'HIRES' && intervalTrack.table.isCurrentLayoutVein())
            dialogHeight = 640;
        else if (this.name != 'Lithology' && textureFills.length == 0) // no textures, then don't need tall window
            dialogHeight = 280;
        else if (this.isSampleTrack)
            dialogHeight = 320;

        var dialogWidth = arg.width
        if (title == 'Classification') {
            dialogWidth = 240;
        }
        else if (dialogWidth == null && nm_uppercase != 'HIRES') {
            dialogWidth = 360;
        }
        else {
            dialogWidth = 410;
        }
        //var dialogWidth = 600;
        arg.currentTubeWidth = 76; // make this hardcoded for now
        //add undo/redo buttons
        var uiDialogTitlebarUndo = $("<button type='button' class='ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-undo'></button>");
        var uiDialogTitlebarRedo = $("<button type='button' class='ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-redo'></button>");

        $('.ui-dialog-titlebar.ui-widget-header.ui-helper-clearfix').append(uiDialogTitlebarUndo);
        $('.ui-dialog-titlebar.ui-widget-header.ui-helper-clearfix').append(uiDialogTitlebarRedo);

        uiDialogTitlebarUndo.click(function () {
            intervalTrack.table.viewer.raiseEvent('request_to_undo', { track: intervalTrack.niceName });
        });

        uiDialogTitlebarRedo.click(function () {
            intervalTrack.table.viewer.raiseEvent('request_to_redo', { track: intervalTrack.niceName });
        });

        // lock unlock buttons
        this._createLockUnlockButtons();

        if (!intervalTrack.isAdmin) {
            //first we need to hide the vein container
            if (intervalTrack.niceName == 'HIRES') {
                $('div#ribbonContainer').addClass('divHidden');
                $('div#ribbonContainerVein').removeClass('divHidden');
                if (intervalTrack.table.isCurrentLayoutClassification()) {
                    //$('div#rcvein').removeClass('divHidden');
                    $('div.divbtnxrd').addClass('divHidden');
                    $('div.divbtnclassification').removeClass('divHidden');
                }
                else if (intervalTrack.table.isCurrentLayoutXRD()){
                    //$('div#rcvein').addClass('divHidden');
                    $('div.divbtnclassification').addClass('divHidden');
                    $('div.divbtnxrd').removeClass('divHidden');
                }
            }
            else {
                $('div#ribbonContainer').removeClass('divHidden');
                $('div#ribbonContainerVein').addClass('divHidden');
            }
            let elementTools = [];
            elementTools = nm_uppercase != 'HIRES' ? [
                { elementId: 'btnNormal', tool: intervalTrack.tools[0] },
                { elementId: 'btnPointerTop', tool: intervalTrack.tools[1] },
                { elementId: 'btnPointerBottom', tool: intervalTrack.tools[2] },
                { elementId: 'btnPointerUpDown', tool: intervalTrack.tools[3] },
                { elementId: 'btnPointerTopAngle', tool: intervalTrack.tools[4] },
                { elementId: 'btnPointerBottomAngle', tool: intervalTrack.tools[5] },
                { elementId: 'btnPointerTopBottom', tool: intervalTrack.tools[6] },
                { elementId: 'btnDelete', tool: intervalTrack.tools[7] },
            ] : intervalTrack.table.isXrdSetting ? 
                    [
                        {
                            elementId: 'btnPoint', tool: intervalTrack.tools[1]
                        },
                        { elementId: 'btnDeleteClassification', tool: intervalTrack.tools[3] },
                    ] :
                [
                    {
                        elementId: 'btnLine', tool: intervalTrack.tools[0]
                    },
                    //{
                    //    elementId: 'btnPoint', tool: intervalTrack.tools[1]
                    //},
                    {
                        elementId: 'btnShape', tool: intervalTrack.tools[2]
                    },
                    { elementId: (intervalTrack.table.isCurrentLayoutVein() ? 'btnDelete' : 'btnDeleteClassification'), tool: intervalTrack.tools[3] }
                    // { elementId: (!intervalTrack.table.isOilSandsLayout ? 'btnDelete' : 'btnDeleteClassification'), tool: intervalTrack.tools[3] }
                ];

            // handle tool buttons
            elementTools.forEach(elementTool => {
                //upon each track selection tool should be set to inactive unless clicked on fill row or tool itself
                elementTool.tool.setActive(false);
                $('#' + elementTool.elementId).off().on('click',function () {

                    // it was false, but I changed it because veins could never deselect - not sure if this is right                        
                    let toggle = intervalTrack.name !== "HIRES";
                    intervalTrack._toolButtonPress_slide(elementTool.elementId, elementTool.tool, toggle);
                    // intervalTrack._toolButtonPress_slide(elementTool.elementId, elementTool.tool,false);
                    let striplogTable = table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0 ? table.childTablesAddon.striplogChildren[0].table : null;
                    if (striplogTable != null && table.mode != 'striplog') {
                        let dockedStriplog = $('div#striplogDockPanel > iframe');
                        if (dockedStriplog.length > 0) {
                            let btnTool = dockedStriplog.contents().find('div#ribbonContainer button#' + elementTool.elementId);
                            btnTool.trigger('click');
                        }
                    }
                });
            });

            //get the selection if we've been on that track before
            let foundSel = intervalTrack.table.selectedInPopupIframe.find(o => o.track == intervalTrack.name);
            if (foundSel != null) {
                let selectedTool = elementTools.find(o => o.tool == foundSel.selectedTool);
                if (selectedTool != null)
                    document.getElementById('#' + selectedTool.elementId).click();
                if (intervalTrack.selectedFillsIndex != -1) {
                    //select the fill that was previously selected
                    $('.tblMainFillsClass > tbody > tr')[intervalTrack.selectedFillsIndex].className = 'selected';
                }
            }

            $('#btnExportCsv').click(function () {
                intervalTrack.table.viewer.raiseEvent('request_to_export_csv', null);
            });

            $('#btnAddClassifier').css('display', (intervalTrack.niceName == 'HIRES' && intervalTrack.table.isCurrentLayoutClassification() ? 'block' : 'none'));
            // $(this).contents().find('#btnAddClassifier').css('display', (intervalTrack.niceName == 'HIRES' && intervalTrack.table.isOilSandsLayout ? 'block' : 'none'));
            $('#btnDeleteClassifier').css('display', (intervalTrack.niceName == 'HIRES' && intervalTrack.table.isCurrentLayoutClassification() ? 'block' : 'none'));
            // $(this).contents().find('#btnDeleteClassifier').css('display', (intervalTrack.niceName == 'HIRES' && intervalTrack.table.isOilSandsLayout ? 'block' : 'none'));
            $('#btnGenerateFile').css('display', (intervalTrack.niceName == 'HIRES' && intervalTrack.table.isCurrentLayoutClassification() ? 'block' : 'none'));
            // $(this).contents().find('#btnGenerateFile').css('display', (intervalTrack.niceName == 'HIRES' && intervalTrack.table.isOilSandsLayout ? 'block' : 'none'));

            $('#btnDeleteClassifier').click(function () {
                let rowSelected = $('div#menuLogging #tableLithology > tbody > tr.selected');
                if (rowSelected.length != 0) {
                    intervalTrack.table.viewer.raiseEvent('delete_classifier', { deleted: rowSelected[0].cells[1].innerText, uwi: intervalTrack.uwi });
                    rowSelected.remove();
                }
            });

            $('#btnGenerateFile').click(function () {
                intervalTrack.table.viewer.raiseEvent('request_to_export_classification', null);
            });

            $('#btnEditRule').click(function () {
                //get the selected rule

                let rulename = $('#Iframe').contents().length != 0 ? $('#Iframe').contents().find("#SampleRuleSelect")[0].selectedOptions[0].text :
                    $("#SampleRuleSelect")[0].selectedOptions[0].text;
                let samplerule = intervalTrack.table.samplingRules.filter(o => o.Name == rulename)[0];
                intervalTrack._openSamplingRulesDialog(appendedParameters, samplerule);
            });

            $('#btnDeleteRule').click(function () {
                //get the selected rule
                let rulename = $("#SampleRuleSelect")[0].selectedOptions[0].text;
                let samplerule = intervalTrack.table.samplingRules.filter(o => o.Name == rulename)[0];
                intervalTrack.table.viewer.raiseEvent('delete_rule', { ruleToDelete: samplerule });
            });

            //this is general track select for all popup windows
            $("#select_trackNames").change(function (option) {
                let opt = $(this)[0].selectedOptions[0].text;
                let striplogTable = table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0 ? table.childTablesAddon.striplogChildren[0].table : null;
                if (striplogTable != null && table.mode != 'striplog') {
                    let dockedStriplog = $('div#striplogDockPanel > iframe');
                    if (dockedStriplog.length > 0) {
                        let sel = dockedStriplog.contents().find('div#ribbonContainer select#select_trackNames');
                        sel.val(opt);
                    }
                }
                intervalTrack._selectionHandlers.forEach(f => {
                    f(intervalTrack, opt);
                });
            });

            //check if we have docked striplog and duplicate selection
            var dockedStriplogContents = null;
            var striplogTable = table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0 ? table.childTablesAddon.striplogChildren[0].table : null;
            if (striplogTable != null && table.mode != 'striplog') {
                let dockedStriplog = $('div#striplogDockPanel > iframe');
                if (dockedStriplog.length > 0) {
                    dockedStriplogContents = dockedStriplog.contents();
                }
            }

            //in order to dublicate same selection in striplog
            $('div#menuLogging select').on('change', function (option) {
                //let opt = $(this)[0].selectedOptions[0].text;
                let val = $(this).val();
                if (dockedStriplogContents != null) {
                    let elem = dockedStriplogContents.find('select#' + this.id).val(val);
                    elem[0].dispatchEvent(new Event('change'));
                }
            })

            $('div#menuLogging input:not(#inputReplaceIntervalsTrackFromFile,#inputMergeIntervalsTrackFromFile)').on('change textInput input', function (option) {
                let val = $(this).val();
                if (dockedStriplogContents != null) {
                    let elem = dockedStriplogContents.find('input#' + this.id).val(val);
                    elem[0].dispatchEvent(new Event('change'));
                }
            })

            /*Adding sync for Textarea description*/
            $('div#menuLogging textarea#intervalDescription').on('change input', function () {
                intervalTrack.description = $(this).val();
                //check if we have docked iframe for striplog
                let striplogTable = table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0 ? table.childTablesAddon.striplogChildren[0].table : null;
                if (striplogTable != null) {
                    let striplogTrack = striplogTable.tracks.find(o => o.name == intervalTrack.name);
                    if (striplogTrack != null)
                        striplogTrack.description = $(this).val();
                }
            })

            /*Row Click Event for any fieldset table row*/
            $('fieldset:not(#intervalTracksDescription) table tbody').off().on('click', 'tr', function () {
                //needed to check for Classification track 
                if (this.textContent == '')
                    return;
                if (DigitalCoreTable.settings.isLocked)//in case of locked well 
                    return;
                //clear top/bottom fields in interval if different fill is clicked
                if ($(this).attr('id').startsWith('fill')) {
                    if (table.parentTable != null && !table.parentTable.slideControlAddon.isEditMode)//if no edit mode
                        table.parentTable.slideControlAddon.clearTrackFields();
                    else if (!table.slideControlAddon.isEditMode)
                        table.slideControlAddon.clearTrackFields();
                    intervalTrack.description = null;//reset description
                }
                //in case of custom alteration track
                if (table.userGroup == 'Casino' && $(this).parents('table').attr('id') == 'tableLithology2') {
                    let firstFills = $(this).parents('fieldset').siblings('fieldset#intervalFillsFldst');
                    //check if any selected otherwise return
                    let selection = firstFills.find('table#tableLithology').find('tr.selected');
                    if (selection.length == 0) {
                        //deselect the tableLithology2
                        $(this).parents('table').find('tr.selected').removeClass('selected')
                        return;
                    }
                }
                //check if we got here because of logging screen
                if (!$('div#menuLogging').hasClass('active'))
                    return;
                //check if we have docked iframe for striplog
                let striplogTable = table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0 ? table.childTablesAddon.striplogChildren[0].table : null;
                if (striplogTable != null) {
                    let dockedStriplog = $('div#striplogDockPanel > iframe');
                    if (dockedStriplog.length > 0) {
                        //let's find fieldset
                        let rowString = 'div#menuLogging fieldset#' + $(this).closest('fieldset')[0].id +
                            ' table#' + $(this).closest('table')[0].id + ' tr#' + this.id;
                        let selectedRow = dockedStriplog.contents().find(rowString);
                        //double check if we got here in circle
                        //if (!selectedRow.hasClass('selected'))
                        selectedRow.trigger('click');
                    }
                }
                // if (nm_uppercase == 'HIRES' && !intervalTrack.table.isOilSandsLayout && ($('#Iframe').contents().find('#tableMinerology > tbody > tr.selected').length == 0 || $('#Iframe').contents().find('#tableTiming > tbody > tr.selected').length == 0)) {
                if (nm_uppercase == 'HIRES' && intervalTrack.table.isCurrentLayoutVein() && ($('#Iframe').contents().find('#tableMinerology > tbody > tr.selected').length == 0 || $('#Iframe').contents().find('#tableTiming > tbody > tr.selected').length == 0)) {
                    return;
                }

                let tblMainFillsClassSelectedRow = $('.tblMainFillsClass > tbody > tr.selected');
                let fillsIndex = tblMainFillsClassSelectedRow.length > 0 ? tblMainFillsClassSelectedRow[0].rowIndex : 0;
                intervalTrack.selectedFillsIndex = fillsIndex == 0 ? -1 : fillsIndex;
                let tAbundanceSelectedRow = $('#tableAbundance > tbody > tr.selected');

                //in future, use with group filter
                let secondLithologyRowSelected = $('#tableLithology2 > tbody > tr.selected');
                let percentageLith2RowSelected = $('#tablePercentage > tbody > tr.selected');

                // find the current tool
                //let currentElementTool = intervalTrack.name === "HIRES" && intervalTrack.table.isCurrentLayoutXRD() ?
                //    elementTools.find(et => et.elementId == 'btnPoint') :
                //    elementTools.find(et => intervalTrack.currentTool == et.tool);
                let currentElementTool = elementTools.find(et => intervalTrack.currentTool == et.tool);
                // default if there isn't one selected
                if (intervalTrack.currentTool == null || intervalTrack.currentTool.name == 'Delete') {
                    currentElementTool = elementTools[0];
                    intervalTrack.currentTool = currentElementTool.tool;
                }
                let toggle = false;//intervalTrack.name != "HIRES";
                intervalTrack._toolButtonPress_slide(currentElementTool.elementId, currentElementTool.tool, toggle);
                //if main fill was deselected then dehighlight the drawing tool
                if (tblMainFillsClassSelectedRow.length == 0)
                    intervalTrack._deselectToolButton();

                //raise event to be caught in rgbAddon that updates active parameters for drawing
                if (nm_uppercase == 'HIRES') {
                    if (intervalTrack.table.isCurrentLayoutVein())
                        intervalTrack.veinRowSelectionHandler();
                    else
                        intervalTrack.veinExtRowSelectionHandler(this, intervalTrack.table.isCurrentLayoutXRD());
                }
                else if (intervalTrack.isAccessoryTrack) {
                    intervalTrack.accessoryTrackRowSelectionHandler();
                }

                intervalTrack.textureFillsId = intervalTrack._getTextureSelection();

                //we need to filter the tiles and order them , otherwise we get incorrect tiles
                let orderedTiles = intervalTrack.tiles.filter(f => f.Group.toUpperCase() == nm_uppercase).sort(function (a) { return a.Order });
                intervalTrack.currentTile = orderedTiles[/*tblMainFillsClassSelectedRow.length == 0 ? 0 : tblMainFillsClassSelectedRow[0].rowIndex*/fillsIndex];
                intervalTrack.abundance = tAbundanceSelectedRow.length == 0 ? 2 : tAbundanceSelectedRow[0].rowIndex;

                //if the track is LithologyTrack then assign its percentage
                if (intervalTrack.constructor.name == 'LithologyTrack') {
                    //if deselcted second lith , deselect the percentage as well
                    if (secondLithologyRowSelected.length == 0)
                        intervalTrack.secondFill = null;
                    if (percentageLith2RowSelected.length != 0) {
                        intervalTrack.percentage = 10 + (percentageLith2RowSelected[0].rowIndex * 10);
                        //check second lithology fill
                        intervalTrack.secondFill = orderedTiles[secondLithologyRowSelected.length == 0 ? null : secondLithologyRowSelected[0].rowIndex];
                    }
                    //else {
                    //    intervalTrack.percentage = 100;
                    //    intervalTrack.secondFill = intervalTrack.currentTile;
                    //}
                }
                else { // in case of custom alteration track for casino
                    intervalTrack.secondFill = orderedTiles[secondLithologyRowSelected.length == 0 ? null : secondLithologyRowSelected[0].rowIndex];
                }
            });

            if (intervalTrack.isSampleTrack) {
                // add event of onchange for select
                // populate SampleRuleSelect from table.samplingRules
                //let filteredSamplingRules = intervalTrack.table.samplingRules/*.filter(s => s.Uwi == intervalTrack.uwi)*/;
                //make event on clicking on New * to open Sampling Rules window
                //do it only once
                if (intervalTrack.table.parentTable == null) {
                    $('select#SampleRuleSelect').change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        if (opt == 'New *') {
                            //close the first dialog
                            intervalTrack._openSamplingRulesDialog(appendedParameters);
                        }
                    });
                }
                //remove all options, add New * option
                $('select#SampleRuleSelect').empty().append('<option value="" selected disabled hidden>Select Sampling Rule</option>');
                $('select#SampleRuleSelect').append(new Option('New *'));
                $.each(intervalTrack.table.samplingRules, function (key, val) {
                    $('select#SampleRuleSelect').append(new Option(val.Name, val.Name));
                });
                //let activeRule = filteredSamplingRules.find(o => o.IsActive);
                if (intervalTrack.table.sampleAddon.activeRule != null)
                    $('select#SampleRuleSelect').val(intervalTrack.table.sampleAddon.activeRule.Name);
                else
                    $('select#SampleRuleSelect').val('');
                $('select#SampleRuleSelect').trigger('change');
            }
            // this is the unlock
            //$currentIFrame.contents().find("#btnPointer").on('click', function () {
            //    intervalTrack.tools.forEach(tool => {
            //        tool.setActive(false)
            //    });
            //    intervalTrack._setButtonHighlight_slide('btnRibbon');
            //    // intervalTrack.currentTile = intervalTrack.tiles[this.rowIndex];
            //});
            // });


            intervalTrack._closeHandlers.forEach(f => {
                f(intervalTrack);
            });

            intervalTrack._openHandlers.forEach(f => {
                f(intervalTrack);
            });
        }
    }


    _createLockUnlockButtons(){
        // lock unlock buttons
        //var uiDialogTitlebarLock = $("<button type='button' class='ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-unlock'></button>");
        //var uiDialogTitlebarUnlock = $("<button type='button' class='ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-lock'></button>");
        //$('.ui-dialog-titlebar.ui-widget-header.ui-helper-clearfix').append(uiDialogTitlebarLock);
        //$('.ui-dialog-titlebar.ui-widget-header.ui-helper-clearfix').append(uiDialogTitlebarUnlock);
        var lockButton = $('div#menuLogging button#btnLock');
        var unlockButton = $('div#menuLogging button#btnUnlock');
        let groupName = this.name;        
        
        let updateLockButton = () => {
            let isLocked = this.table.intervalAddon.intervals.some(x => x.groupName === groupName && x.startTubeIndex != '' && x.startTubeIndex != null);
            lockButton.css('display', isLocked ? 'none' : 'block');
            unlockButton.css('display', isLocked ? 'block' : 'none');  
            //$('#PopupForm').css('opacity', isLocked ? '0.4' : '');
            //$('#PopupForm').css('pointer-events', isLocked ? 'none' : '');
        };
        updateLockButton();

        lockButton.click(() => {
            this.table.intervalAddon.lockIntervalsToImages(groupName);
            updateLockButton();
        });

        unlockButton.click(() => {
            this.table.intervalAddon.unlockIntervalsToImages(groupName);
            updateLockButton();         
        });        
    }

    _openSamplingRulesDialogRio(appendedParameters, ruleBeingEdit) {
        //check if the form is already opened
        let frm = $('div#SRPopupForm');
        if (frm.length > 0)
            return;
        let intervalTrack = this;
        let dialogHeight = 480;//20px is the titlebar itself
        let dialogWidth = 900;
        let url = DigitalCoreTable.prefixes.popupWindowsPrefix + '/PopupWindows/SamplingRules_Rio.html?';
        if (ruleBeingEdit != null) {
            this.uwi = ruleBeingEdit.Uwi;
        }
        let isEditMode = ruleBeingEdit != null;

        var $SRdialog = $('<div id="SRPopupForm" style = "position:absolute;left:0px;width:100%;" ></div > ')
            .html('<iframe id="IframeSR" width="' + dialogWidth + '" scrolling="no" height="95%" src=' + url + encodeURIComponent(appendedParameters) + '></iframe>')
            .dialog({
                close: function () {
                    //check if button is disabled
                    let rulename = '';
                    if (!$('#IframeSR').contents().find('#btnSaveRules')[0].disabled) {
                        //get the name of the sampling rule and add as an option to SampleRuleSelect
                        rulename = $('#IframeSR').contents().find('#enter_name_input').val();
                    }
                    $(this).dialog('destroy').remove();
                    intervalTrack.tools[0].setActive(false);
                    //jQuery(document).find('div#PopupForm').dialog("open");
                    //if (!isEditMode) {
                    //    $('select#SampleRuleSelect').append(new Option(rulename, rulename, true));
                    //}
                },
                position: {
                    my: "left top",
                    at: "left top",
                    of: intervalTrack.dlgs[0],
                    collision: "none"
                },
                draggable: true,
                autoOpen: false,
                modal: false,
                width: dialogWidth,
                height: dialogHeight,
                title: 'Sampling Rules',
            });
        $SRdialog.dialog("open");
        intervalTrack.dlgs[1] = $SRdialog;

        $('#IframeSR').on('load', function () {
            jQuery(document).find('div#PopupForm').dialog("close");

            let $iframe_content = $(this).contents();
            //put here variables
            let sample1arr = [];
            let sample2arr = [];
            let sample3arr = [];
            let sample4arr = [];
            let appliedTracks = 
                intervalTrack.table._defaultTracks.filter(tr => tr.name == 'Lithology' || tr.name == 'Mineralized')
            appliedTracks.forEach(track => {
                //skip trackName that is the same as the name of window it is in
                var table;
                if (track.name == 'Lithology') {
                    $iframe_content.find('#tableFills tr').remove();
                    $iframe_content.find('#tbSample1 tr').remove();
                    $iframe_content.find('#tbSample2 tr').remove();
                    table = $iframe_content.find('#tableFills tbody')[0];
                }
                else {
                    $iframe_content.find('#tableFills2 tr').remove();
                    $iframe_content.find('#tbSample3 tr').remove();
                    $iframe_content.find('#tbSample4 tr').remove();
                    table = $iframe_content.find('#tableFills2 tbody')[0];
                }

                var fills = intervalTrack.tiles.filter(f => f.Group.toUpperCase() == track.name.toUpperCase());
                //in case of oilSands layout add sandstone/shale combinations
                if (intervalTrack.table.isOilSandsLayout && intervalTrack.table.hasLithologyTrack) {
                    fills.push({ Name: 'SS/Sh: ' });
                }

                fills.map(o => o.Name).forEach(fill => {
                    var tr = document.createElement('tr');

                    var nameCell = document.createElement('td');
                    var text = document.createTextNode(fill);

                    nameCell.appendChild(text);
                    if (fill == 'SS/Sh: ')
                        tr.className = 'grain';
                    tr.appendChild(nameCell);
                    table.appendChild(tr);
                });

                var tr = $("tr.grain:first", table)[0];
                if (tr != null) {
                    var optCell = document.createElement('td');
                    var sel = document.createElement('select');
                    for (var h = 10; h <= 90; h += 10) {
                        var opt = document.createElement('option');
                        // create text node to add to option element (opt)
                        opt.appendChild(document.createTextNode(h + "%"));
                        // set value property of opt
                        opt.value = 'option value';
                        opt.selected = false;
                        // add opt to end of select box (sel)
                        sel.appendChild(opt);
                    }

                    //nameCell.appendChild(text);
                    optCell.appendChild(sel);
                    tr.appendChild(optCell);
                    table.appendChild(tr);
                }
            })


            $iframe_content.find('#hiddenBtn').click(function () {
                //if there is error label text , don't execute below
                if ($iframe_content.find('#errorLabel')[0].innerHTML != '')
                    return;
                // we need to get the fills from of Sample1 and Sample 2 table
                // and according to their respective min/max draw on Sample track
                // for each interval on chosen track

                intervalTrack._populateSampleTablesInSR('#tbSample1', sample1arr);
                intervalTrack._populateSampleTablesInSR('#tbSample2', sample2arr);
                intervalTrack._populateSampleTablesInSR('#tbSample3', sample3arr);
                intervalTrack._populateSampleTablesInSR('#tbSample4', sample4arr);

                if (sample1arr.length == 0 && sample2arr.length == 0)
                    return;
                //we raise the event that is caught by SampleAddon
                // we need to pass the name of the track, the fills and min/max in both Sample1 and Sample2
                intervalTrack.table.viewer.raiseEvent('populate_samples_rio', {
                    sampleTrackName: intervalTrack.name,
                    arrSample1: sample1arr,
                    arrSample2: sample2arr,
                    arrSample3: sample3arr,
                    arrSample4: sample4arr,
                    s1min: parseFloat($iframe_content.find('#sample1_min_input')[0].value),
                    s1max: parseFloat($iframe_content.find('#sample1_max_input')[0].value),
                    s2min: parseFloat($iframe_content.find('#sample2_min_input')[0].value),
                    s2max: parseFloat($iframe_content.find('#sample2_max_input')[0].value),
                    ruleName: $('#IframeSR').contents().find('#enter_name_input').val(),
                    uwi: intervalTrack.uwi,
                    needsToBeSaved: true,
                    blkStartSample: parseFloat($iframe_content.find('#blk_startsample')[0].value),
                    stdStartSample: parseFloat($iframe_content.find('#std_startsample')[0].value),
                    dupStartSample: parseFloat($iframe_content.find('#dup_startsample')[0].value),
                    blkRepeat: parseInt($iframe_content.find('#blk_repeat')[0].value),
                    stdRepeat: parseInt($iframe_content.find('#std_repeat')[0].value),
                    dupRepeat: parseInt($iframe_content.find('#dup_repeat')[0].value),
                    canCrossLC: $iframe_content.find('input#canCrossLC').prop('checked'),
                    maxLCLength: parseFloat($iframe_content.find('input#maxLCLength')[0].value),
                });

                //close the dialog
                $SRdialog.dialog('close');
            });
            if (ruleBeingEdit != null) {
                $iframe_content.find('#sample1_min_input').val(ruleBeingEdit.Sample1Min);
                $iframe_content.find('#sample1_max_input').val(ruleBeingEdit.Sample1Max);
                $iframe_content.find('#sample2_min_input').val(ruleBeingEdit.Sample2Min);
                $iframe_content.find('#sample2_max_input').val(ruleBeingEdit.Sample2Max);
                $iframe_content.find('#blk_startsample').val(ruleBeingEdit.BlkStartSample);
                $iframe_content.find('#blk_repeat').val(ruleBeingEdit.BlkRepeat);
                $iframe_content.find('#std_startsample').val(ruleBeingEdit.StdStartSample);
                $iframe_content.find('#dup_startsample').val(ruleBeingEdit.DupStartSample);
                $iframe_content.find('#std_repeat').val(ruleBeingEdit.StdRepeat);
                $iframe_content.find('#dup_repeat').val(ruleBeingEdit.DupRepeat);
                $iframe_content.find('input#canCrossLC').prop('checked', ruleBeingEdit.CanCrossLC);
                $iframe_content.find('input#maxLCLength').val(ruleBeingEdit.MaxLCLength);
                //Lithology&Overburden;Mineralized&NO
                let decode = ruleBeingEdit.Sample1Fills.split(";");
                decode.forEach(de => {
                    if (de != '') {
                        //split for & and find the track
                        let tr = de.split("&");//the fills will be separated by @
                        let elem = tr[0] == 'Lithology' ? '#tbSample1 > tbody' : '#tbSample3 > tbody';
                        tr[1].split("@").forEach(fill => {
                            if(fill!='')
                               $('IFrame').contents().find(elem).append("<tr><td>" + fill + "</td></tr>");
                        })
                    }
                })
                decode = ruleBeingEdit.Sample2Fills.split(";");
                decode.forEach(de => {
                    if (de != '') {
                        //split for & and find the track
                        let tr = de.split("&");//the fills will be separated by @
                        let elem = tr[0] == 'Lithology' ? '#tbSample2 > tbody' : '#tbSample4 > tbody';
                        tr[1].split("@").forEach(fill => {
                            if (fill != '')
                                $('IFrame').contents().find(elem).append("<tr><td>" + fill + "</td></tr>");
                        })
                    }
                })
                $iframe_content.find('#enter_name_input').val(ruleBeingEdit.Name);
                $iframe_content.find('#enter_name_input').focus();
                //LEAVE ONLY THOSE THAT ARE NOT PRESENT IN BOTH TABLES
                $iframe_content.find('#tableFills tr').each(function () {
                    if (ruleBeingEdit.Sample1Fills.split(';').some(r => r.includes(this.innerText)) ||
                        ruleBeingEdit.Sample2Fills.split(';').some(r => r.includes(this.innerText)))
                        $(this).remove();
                });
            }
            //enable div holder for imperial in case of that user group
            $('div#imperialExtensionHolder').toggle(intervalTrack.table.userGroup == 'Imperial');
        });
    }

    _openSamplingRulesDialog(appendedParameters, ruleBeingEdit) {
        //check if the form is already opened
        let frm = $('div#SRPopupForm');
        if (frm.length > 0)
            return;
        let intervalTrack = this;
        let dialogHeight = 480;//20px is the titlebar itself
        let dialogWidth = 900;
        let url = DigitalCoreTable.prefixes.popupWindowsPrefix +'/PopupWindows/SamplingRules.html?';
        if (ruleBeingEdit != null) {
            this.uwi = ruleBeingEdit.Uwi;
        }
        let isEditMode = ruleBeingEdit != null;

        var $SRdialog = $('<div id="SRPopupForm" style = "position:absolute;left:0px;width:100%;" ></div > ')
            .html('<iframe id="IframeSR" width="' + dialogWidth + '" scrolling="no" height="95%" src=' + url + encodeURIComponent(appendedParameters) + '></iframe>')
            .dialog({
                close: function () {
                    //check if button is disabled
                    let rulename = '';
                    if (!$('#IframeSR').contents().find('#btnSaveRules')[0].disabled) {
                        //get the name of the sampling rule and add as an option to SampleRuleSelect
                        rulename = $('#IframeSR').contents().find('#enter_name_input').val();
                    }
                    $(this).dialog('destroy').remove();
                    intervalTrack.tools[0].setActive(false);
                    //jQuery(document).find('div#PopupForm').dialog("open");
                    //if (!isEditMode) {
                    //    $('select#SampleRuleSelect').append(new Option(rulename, rulename,true));
                    //}
                    //else {
                    //    //might just save as different name, check for it
                    //    if (intervalTrack.table.samplingRules.map(o => o.Name).some(k => k == rulename))
                    //        return;
                    //    var o = new Option(rulename, "value", true);
                    //    /// jquerify the DOM object 'o' so we can use the html method
                    //    $(o).html(rulename);
                    //    $("#SampleRuleSelect").append(o);
                    //}
                },
                position: {
                    my: "left top",
                    at: "left top",
                    of: intervalTrack.dlgs[0],
                    collision: "none"
                },
                draggable: true,
                autoOpen: false,
                modal: false,
                width: dialogWidth,
                height: dialogHeight,
                title: 'Sampling Rules',
            });
        $SRdialog.dialog("open");
        intervalTrack.dlgs[1] = $SRdialog;

        $('#IframeSR').on('load', function () {
            jQuery(document).find('div#PopupForm').dialog("close");

            let $iframe_content = $(this).contents();
            //put here variables
            let sample1arr = [];
            let sample2arr = [];
            var selectedTrack = null;

            //populate tableTracks
            var container = $iframe_content.find('table#tableTracks tbody');
            var $trs = $();
            let descNames = intervalTrack.table.descriptionTracks.map(o => o.name);

            let appliedTracks = intervalTrack.table._defaultTracks.filter(tr => !tr.isAccessoryTrack && tr.name != intervalTrack.name && !descNames.includes(tr.name)).map(o => o.name).sort();
            appliedTracks.forEach(track => {
                //skip trackName that is the same as the name of window it is in
                let $tr = $('<tr/>', { class: 'table-row' });
                $tr.on('click', function () {
                    $(this).addClass("selected").siblings().removeClass("selected");

                    $iframe_content.find('#tableFills tr').remove();
                    $iframe_content.find('#tbSample1 tr').remove();
                    $iframe_content.find('#tbSample2 tr').remove();
                    selectedTrack = this.innerText;
                    //check for accessory track
                    let condition = intervalTrack.table.getAccessoryTracks().some(o => o == this.innerText);
                    let basename = condition ? _getBaseNameFromAccessoryTrackName(this.innerText) : this.innerText;
                    var fills = intervalTrack.tiles.filter(f => f.Group.toUpperCase() == basename.toUpperCase());
                    //in case of oilSands layout add sandstone/shale combinations
                    if (intervalTrack.table.isOilSandsLayout && intervalTrack.table.hasLithologyTrack) {
                        fills.push({ Name: 'SS/Sh: ' });
                    }
                    var table = $iframe_content.find('#tableFills tbody')[0];

                    fills.map(o => o.Name).forEach(fill => {
                        var tr = document.createElement('tr');

                        var nameCell = document.createElement('td');
                        var text = document.createTextNode(fill);

                        nameCell.appendChild(text);
                        if (fill == 'SS/Sh: ')
                            tr.className = 'grain';
                        tr.appendChild(nameCell);
                        table.appendChild(tr);
                    });

                    var tr = $("tr.grain:first", table)[0];
                    if (tr != null) {
                        var optCell = document.createElement('td');
                        var sel = document.createElement('select');
                        for (var h = 10; h <= 90; h += 10) {
                            var opt = document.createElement('option');
                            // create text node to add to option element (opt)
                            opt.appendChild(document.createTextNode(h + "%"));
                            // set value property of opt
                            opt.value = 'option value';
                            opt.selected = false;
                            // add opt to end of select box (sel)
                            sel.appendChild(opt);
                        }

                        //nameCell.appendChild(text);
                        optCell.appendChild(sel);
                        tr.appendChild(optCell);
                        table.appendChild(tr);
                    }
                })
                $tr.append($('<td />', { text: track }));
                if (ruleBeingEdit != null) {
                    if (track.toUpperCase() == ruleBeingEdit.TrackName)
                        $tr.click();
                }
                $trs = $trs.add($tr);
            })
            //Append all TRs to the container.
            container.append($trs);


            $iframe_content.find('#hiddenBtn').click(function () {
                //if there is error label text , don't execute below
                if ($iframe_content.find('#errorLabel')[0].innerHTML != '')
                    return;
                // we need to get the fills from of Sample1 and Sample 2 table
                // and according to their respective min/max draw on Sample track
                // for each interval on chosen track

                intervalTrack._populateSampleTablesInSR('#tbSample1', sample1arr);
                intervalTrack._populateSampleTablesInSR('#tbSample2', sample2arr);

                if (sample1arr.length == 0 && sample2arr.length == 0)
                    return;

                //populate the rule name as an option
                var rulename = $('#IframeSR').contents().find('#enter_name_input').val();
                $('select#SampleRuleSelect').append(new Option(rulename, rulename, true));

                //we raise the event that is caught by SampleAddon
                // we need to pass the name of the track, the fills and min/max in both Sample1 and Sample2
                let evname = intervalTrack.table.userGroup == 'Barrick' ? 'populate_samples_barrick' :
                    intervalTrack.table.userGroup.startsWith('Agnico') || intervalTrack.table.userGroup == 'UpperBeaver' ? 'populate_samples_agnico' : 'populate_samples';
                intervalTrack.table.viewer.raiseEvent(evname, {
                    sampleTrackName: intervalTrack.name,
                    trackName_upper: $iframe_content.find('#tableTracks tr.selected')[0].innerText.toUpperCase(),
                    arrSample1: sample1arr,
                    arrSample2: sample2arr,
                    s1min: parseFloat($iframe_content.find('#sample1_min_input')[0].value),
                    s1max: parseFloat($iframe_content.find('#sample1_max_input')[0].value),
                    s2min: parseFloat($iframe_content.find('#sample2_min_input')[0].value),
                    s2max: parseFloat($iframe_content.find('#sample2_max_input')[0].value),
                    ruleName: rulename,
                    uwi: intervalTrack.uwi,
                    needsToBeSaved: true,
                    blkStartSample: parseFloat($iframe_content.find('#blk_startsample')[0].value),
                    stdStartSample: parseFloat($iframe_content.find('#std_startsample')[0].value),
                    dupStartSample: parseFloat($iframe_content.find('#dup_startsample')[0].value),
                    blkRepeat: parseInt($iframe_content.find('#blk_repeat')[0].value),
                    stdRepeat: parseInt($iframe_content.find('#std_repeat')[0].value),
                    dupRepeat: parseInt($iframe_content.find('#dup_repeat')[0].value),
                    canCrossLC: $iframe_content.find('input#canCrossLC').prop('checked'),
                    maxLCLength: parseFloat($iframe_content.find('input#maxLCLength')[0].value),
                });

                //close the dialog
                $SRdialog.dialog('close');
            });
            if (ruleBeingEdit != null) {
                $iframe_content.find('#sample1_min_input').val(ruleBeingEdit.Sample1Min);
                $iframe_content.find('#sample1_max_input').val(ruleBeingEdit.Sample1Max);
                $iframe_content.find('#sample2_min_input').val(ruleBeingEdit.Sample2Min);
                $iframe_content.find('#sample2_max_input').val(ruleBeingEdit.Sample2Max);
                $iframe_content.find('#blk_startsample').val(ruleBeingEdit.BlkStartSample);
                $iframe_content.find('#blk_repeat').val(ruleBeingEdit.BlkRepeat);
                $iframe_content.find('#std_startsample').val(ruleBeingEdit.StdStartSample);
                $iframe_content.find('#dup_startsample').val(ruleBeingEdit.DupStartSample);
                $iframe_content.find('#std_repeat').val(ruleBeingEdit.StdRepeat);
                $iframe_content.find('#dup_repeat').val(ruleBeingEdit.DupRepeat);
                $iframe_content.find('input#canCrossLC').prop('checked' , ruleBeingEdit.CanCrossLC);
                $iframe_content.find('input#maxLCLength').val(ruleBeingEdit.MaxLCLength);
                ruleBeingEdit.Sample1Fills.split(';').sort().forEach(function (smp) {
                    $('IFrame').contents().find('#tbSample1 > tbody').append("<tr><td>" + smp + "</td></tr>");
                });
                ruleBeingEdit.Sample2Fills.split(';').sort().forEach(function (smp) {
                    $('IFrame').contents().find('#tbSample2 > tbody').append("<tr><td>" + smp + "</td></tr>");
                });
                $iframe_content.find('#enter_name_input').val(ruleBeingEdit.Name);
                $iframe_content.find('#enter_name_input').focus();
                //$iframe_content.find('#tableTracks tr').each(function () {
                //    if (this.innerText.toUpperCase() == ruleBeingEdit.TrackName)
                //        $(this).addClass('selected');
                //    //$(this).click();
                //});
                //LEAVE ONLY THOSE THAT ARE NOT PRESENT IN BOTH TABLES
                $iframe_content.find('#tableFills tr').each(function () {
                    if (ruleBeingEdit.Sample1Fills.split(';').some(r => r.includes(this.innerText)) ||
                        ruleBeingEdit.Sample2Fills.split(';').some(r => r.includes(this.innerText)))
                        $(this).remove();
                });
            }
            //enable div holder for imperial in case of that user group
            $('div#imperialExtensionHolder').toggle(intervalTrack.table.userGroup == 'Imperial');
        });
    }

    _populateSampleTablesInSR(elemstringId, sampleArr) {
        let rows = $('#IframeSR').contents().find(elemstringId)[0].rows;
        for (let row of rows) {
            if (row.className.includes('grain'))
                sampleArr.push(row.cells[0].innerText + (row.cells[1].getElementsByTagName('select')[0].selectedIndex * 10 + 10));
            else
                sampleArr.push(row.cells[0].innerText);

        }
    }

    _deselectToolButton() {
        if (this.currentTool != null) {
            this.currentTool.setActive(false);
            this.currentTool = null;
            this._setButtonHighlight_slide('btnRibbon', null);
        }
    }

    _toolButtonPress(id, tool, toggle){                    
        if(toggle == null)
            toggle = true;
        if(tool.isActive && toggle){
            tool.setActive(false);
            this.currentTool = null;
            this._setButtonHighlight('btnRibbon', null);
        }else{
            tool.setActive(true);
            this.currentTool = tool;
            this._setButtonHighlight('btnRibbon', id);
        }
        //this.currentTile = this.tiles[this.rowIndex];     
        
    }

    _toolButtonPress_slide(id, tool, toggle) {
        if (toggle == null)
            toggle = true;
        if (tool.isActive && toggle) {
            tool.setActive(false);
            this.currentTool = null;
            this._setButtonHighlight_slide('btnRibbon', null);
        } else {
            tool.setActive(true);
            this.currentTool = tool;
            this._setButtonHighlight_slide('btnRibbon', id);
        }
    }

    _setButtonHighlight(theClass, theId){
        $('#Iframe').contents().find('.' + theClass)
            .removeClass('intervalControlsHighlighted');
        if(theId != null){
            $('#Iframe').contents().find('#' + theId).addClass('intervalControlsHighlighted');
        }
    }

    _setButtonHighlight_slide(theClass, theId) {
        //that one highlights the current page. IF it is striplog, we need to 
        //send it to parentTable
        $('.' + theClass)
            .removeClass('intervalControlsHighlighted');
        if (theId != null) {
            $('#' + theId).addClass('intervalControlsHighlighted');
        }
        //let pt = this.table.parentTable;
        //if (this.table.mode == 'striplog' && pt != null)
        //    pt.slideControlAddon.setButtonHighlightFromStriplog(theClass, theId);
    }

}