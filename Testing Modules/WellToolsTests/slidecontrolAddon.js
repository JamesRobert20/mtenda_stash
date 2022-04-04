var DigitalCoreTable = DigitalCoreTable || {};

DigitalCoreTable.SlideControlAddon = class SlideControlAddon {
    /**
     * Create and attach the addon
     * @param {DigitalCoreTable.Table} table 
     */
    constructor(table) {
        if (!SlideControlAddon.instance) {
            this.table = table;
            SlideControlAddon.instance = this;
        }
        this.table.slideControlAddon = this;
        d3.select('.btnSettingsFixed')
            .on('click', function () {
                $(this).toggleClass('c-sidebar-show');
                if ($(this).hasClass('c-sidebar-show')) {
                    SlideControlAddon.instance._showSlide();
                }
                else {
                    SlideControlAddon.instance._hideSlide();
                }
            })
        this.trackSelection = null;
        this.currentFill = null;
        this.selectedTrackName = null;
        this.selectedIntervalTrack = null;
        this.selectedInterval = null;//changed when left click on interval from interval drawing
        this.selectedLogger = null;
        this.exParamsObj = {};
        this.trackGroups = _.groupBy(this.table.tracks.filter(o => !o.isPhoto || o.name == 'HIRES'), x => (x.name != null && x.name.slice(-1) >= '0' && x.name.slice(-1) <= '9') ? _getBaseNameFromAccessoryTrackName(x.name) : x.name)
        this.sampleTracks = this.table.tracks.filter(o => o.isSampleTrack);
        this.scrollingIndex = 0;
        this.previousSelectedInterval = null;//when using page up/down to higlight the interval 
        //storing top/bottom typed
        this._top = null;
        this._bottom = null;
        this.isEditMode = false;
        this._populateTracks();
        this._elementsHandler();
        //this._populateExportCsv();
        this._populateExportCsvND();
        if (table.userGroup == 'Rio' || table.userGroup.toLowerCase().startsWith('barrick'))
            this._populateExportSampleSheet();

        this._buttonClickHandler();
        this._adminButtonClickHandler();
        this._jumpToSectionHandler();

        this._roundTo2 = num => +(Math.round(num + "e+2") + "e-2");
        this.table.viewer.addHandler('populateIntervalEditFields', this.populateIntervalEditFields.bind(this));
        $('input#offsetXRD').on('change', function () {
            table.veinAddon.offsetXRD = Number($(this).val());
        })

        //get the instances of table from ct and striplogs
        this.tableInstances = [];
        if (table.mode == null) {
            this.tableInstances.push(table);//push ct table by default
            //all the striplog table instances we will add to that array from childTablesAddon
        }

        return SlideControlAddon.instance;
    }

    _hideSlide() {
        $('#slideControlHolder').hide();
        let container = $('div.container-fluid > ul.templatesContainer');
        let w1 = container.css('height');
        container.css('right', w1);
        $('.btnSettingsFixed').css('right', 0);//going back to 0 position
        $('.btnSettingsFixed i').toggleClass('cil-arrow-thick-left cil-arrow-thick-right');
        //$('button.btnSettingsFixed').css('background-image', 'url("/digitalcoretable/images/SlideControl/LeftArrow.png")');
    }

    _setDrawingToolInactive() {
        //set drawing tool to inactive
        var tablesArr = [];
        tablesArr.push(table);//push ct table by default
        if (table.mode == 'striplog' && table.parentTable != null)
            tablesArr.push(table.parentTable)
        else {
            if (table.childTablesAddon != null)
                table.childTablesAddon.striplogChildren.forEach(sc => {
                    tablesArr.push(sc.table);
                })
        }
        tablesArr.forEach(tbl => {
            tbl.slideControlAddon.selectedIntervalTrack._deselectToolButton();
        })
    }

    _triggerCancelUpdate() {
        $('div#menuLogging button#btnCancelUpdate').trigger('click');
    }

    _showSlide() {
        if ($('#slideControlHolder').is(":hidden")) {
            $('#slideControlHolder').show("slide", { direction: "right" }, 0, function () {
                let container = $('div.container-fluid > ul.templatesContainer');
                let w1 = container.css('height');
                let w2 = $('div#slideControlHolder').css('width');
                container.css('right', parseFloat(w1) + parseFloat(w2));
                $('.btnSettingsFixed').css('right', w2);
                $('.btnSettingsFixed i').toggleClass('cil-arrow-thick-left cil-arrow-thick-right');
            });
        }
    }

    _populateExportCsv() {
        var $trs = $();
        let container = $('table#tableCsvExportTracks tbody');
        Object.keys(this.trackGroups).forEach(groupname => {
            var tr = document.createElement('tr');
            var checkCell = document.createElement('td');
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = groupname;
            checkbox.className += 'lithRectangle';
            checkbox.addEventListener('click', function () {
                if (this.checked)
                    table.tracksForCsvExport.push(this.name);
                else {
                    let i = table.tracksForCsvExport.indexOf(this.name);
                    if (i != -1)
                        table.tracksForCsvExport.splice(i, 1);
                }
                table.viewer.raiseEvent('update_description_track', {
                    trackName: this.name,
                    isChecked: this.checked
                });
            })

            var nameCell = document.createElement('td');
            var text = document.createTextNode(groupname);
            checkCell.append(checkbox);
            nameCell.appendChild(text);
            tr.appendChild(checkCell);
            tr.appendChild(nameCell);

            container.append(tr);
        });
    }

    _populateExportSampleSheet() {
        let container = $('ul.c-sidebar-nav-dropdown-items#csvExportSampleSheetItems');
        let data = this.sampleTracks.map(track => {
            return {
                name: track.name,
                color: 'black',
                obj: track,
                type: 'checkbox',
                selected: false,
                isActive: d => {
                    //return table.tracksForCsvExport.some(i => i == groupname)
                },
                onSelected: d => {
                    //add data to button
                    let dt = $('div#menuExport button#btnExportSampleSheet').data();
                    if (dt.tracks == null)
                        dt.tracks = [];
                    let index = dt.tracks.indexOf(track.name)
                    if (index == -1)
                        dt.tracks.push(track.name)
                    else
                        dt.tracks.splice(index, 1);

                    //$('div#menuExport button#btnExportSampleSheet').data({ sampletracks: })
                },
            }
        })

        table.createButtonSetSlideND(data, 'csvExportSampleSheetItems', null, null, 'div#menuExport');
        //append button for export
        let $btnExport = $('<button class="btn btn-info" id="btnExportSampleSheet" >Rio Export</button >');
        if (table.userGroup == 'Rio')
            $btnExport.html('Rio Export');
        else if (table.userGroup.toLowerCase().startsWith('barrick'))
            $btnExport.html('Barrick Export');
        $btnExport.on('click', function () {
            if(table.userGroup == 'Rio')
                table.viewer.raiseEvent('request_to_export_samplesheet', null);
            else if (table.userGroup.toLowerCase().startsWith('barrick'))
                table.viewer.raiseEvent('request_to_export_samplesheet_barrick', null);
        })
        container.append($('<li class="c-sidebar-nav-item"></li >').add($btnExport));
    }

    _populateExportCsvND() {
        var $trs = $();
        let container = $('ul.c-sidebar-nav-dropdown-items#csvExportTrackItems');
        let data = Object.keys(this.trackGroups).map(groupname => {
            return {
                name: groupname,
                color: 'black',
                obj: this.trackGroups[groupname],
                type: 'checkbox',
                selected: false,
                isActive: d => {
                    return table.tracksForCsvExport.some(i => i == groupname)
                },
                onSelected: d => {
                    let i = table.tracksForCsvExport.indexOf(groupname);
                    if (i != -1)
                        table.tracksForCsvExport.splice(i, 1);
                    else
                        table.tracksForCsvExport.push(groupname);
                },
            }
            })

        table.createButtonSetSlideND(data, 'csvExportTrackItems', null, null, 'div#menuExport');
        //append button for export
        let $btnExport = $('<button class="btn btn-info" id="btnSelectionExportCsv" > Export Tracks to CSV</button >');
        $btnExport.on('click', function () {
            table.viewer.raiseEvent('exportTracks_to_csv', { tracks: table.tracksForCsvExport, userGroup: table.userGroup });
        })
        container.append($('<li class="c-sidebar-nav-item"></li >').add($btnExport));
    }

    _jumpToFunction() {
        //check what is not empty
        let jtTube = $('fieldset#fldstJumpTo input#jumpToTube').val();
        let jtDepth = Number($('fieldset#fldstJumpTo input#jumpToDepth').val());
        let segments = _(table.getSegmentsOfType('HIRES')).orderBy(x => x.topDepth).value();

        let segment = null;
        if (jtTube != '') {
            //find segment with that tube
            segment = segments.find(o => o.getTubeIndex().endsWith(jtTube));
        }
        else if (jtDepth != 0)
            segment = segments.find(o => o.topDepth >= jtDepth);
        if (segment != null) {
            let bounds = table.viewer.viewport.getBounds();
            table.viewer.viewport.panTo(new OpenSeadragon.Point(segment.x, bounds.y + bounds.height / 2), true)
        }
    }

    _jumpToSectionHandler() {
        //initialize unit
        var addon = this;
        $('label#labelJumpToDepthUnit').text('[' + DigitalCoreTable.settings.distanceUnit + ']');
        $('button#btnJumpTo').on('click', function () {
            addon._jumpToFunction();
        })
        $('input#jumpToDepth,input#jumpToTube').keypress(function (event) {
            var keycode = (event.keyCode ? event.keyCode : event.which);
            if (keycode == '13') {
                addon._jumpToFunction();
            }
        });
    }

    _extendedParametersElementsHandler() {
        let addon = this;
        switch (table.userGroup) {
            case 'Kirkland':
                if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName.endsWith('Structure')) {
                    //add properties to interval
                    $("#selectMineralization1").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Mineralization1 = opt;
                    });
                    $("#selectMineralization2").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Mineralization2 = opt;
                    });
                    $("#selectTexture1").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Texture1 = opt;
                    });
                    $("#selectTexture2").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Texture2 = opt;
                    });
                    $("#selectAmount1").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Amount1 = opt;
                    });
                    $("#selectAmount2").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Amount2 = opt;
                    });
                    $('input#angle').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.Angle = $(this).val();
                    })
                }
                break;
            case 'Rio':
                if(this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName.endsWith('Mineralization')) {
                    //add properties to interval
                    $("#selectStyle").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Style = opt;
                    });
                    $('input#pct').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.PCT = Number($(this).val());//may return string instead, need to cast
                    })
                }
                break;
            case 'Casino':
                if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Structure') {
                    //add properties to interval
                    $("select#selectStructureType").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.StructureType = opt;
                    });
                    $('input#alphaTop').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.AlphaTop = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#alphaBottom').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.AlphaBottom = Number($(this).val());//may return string instead, need to cast
                    })
                }
                else if (this.selectedIntervalTrack.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(this.selectedIntervalTrack.name) == 'Alteration') {
                    $("select#selectOAO").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.OverprintingOccurance = opt;
                    });
                    $("select#selectPAO").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.PrimaryOccurance = opt;
                    });
                    $("select#selectDA").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.DominantAssemblage = opt;
                    });
                }
                else if (this.selectedIntervalTrack.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(this.selectedIntervalTrack.name) == 'Structure') {
                    //add properties to interval
                    $('input#alphaTop').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.StructIntvlAlphaTop = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#alphaBottom').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.StructIntvlAlphaBot = Number($(this).val());//may return string instead, need to cast
                    })
                }
                break;
            //case 'Agnico_AK':
            //    if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Structure') {
            //        //add properties to interval
            //        $('input#ubsAngleAlpha').change(function () {
            //            addon.selectedIntervalTrack.extendedParametersObj.AngleAlpha = Number($(this).val());//may return string instead, need to cast
            //        })
            //        $('input#ubsAngleBeta').change(function () {
            //            addon.selectedIntervalTrack.extendedParametersObj.AngleBeta = Number($(this).val());//may return string instead, need to cast
            //        })
            //        $('input#ubsAngleGamma').change(function () {
            //            addon.selectedIntervalTrack.extendedParametersObj.AngleGamma = Number($(this).val());//may return string instead, need to cast
            //        })
            //    }
            //    break;
            case 'UpperBeaver': case 'Agnico_AK':
                if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Mineralization') {
                    //add properties to interval
                    $("select#selectUBMStyle").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Style = opt;
                    });
                    $("select#selectUBMColour").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Colour = opt;
                    });
                    $("select#selectUBMGrainsize").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Grainsize = opt;
                    });
                    $('input#ubmPercent').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.Percent = Number($(this).val());//may return string instead, need to cast
                    })
                }
                else if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Vein') {
                    //add properties to interval
                    $('input#ubvAngle').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.Angle = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubvAngleAlpha').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.AngleAlpha = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubvAngleBeta').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.AngleBeta = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubvAngleGamma').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.AngleGamma = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubvWidth').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.Width = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubvTexture').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.Texture = $(this).val();//may return string instead, need to cast
                    })
                    $('input#ubvMnz1').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.MnzPercent = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubvMnz2').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.MnzPercent2 = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubvMnz3').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.MnzPercent3 = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubvMnz4').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.MnzPercent4 = Number($(this).val());//may return string instead, need to cast
                    })

                    $("select#selectUBVMnzType1").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.MnzType = opt;
                    });
                    $("select#selectUBVMnzType2").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.MnzType2 = opt;
                    });
                    $("select#selectUBVMnzType3").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.MnzType3 = opt;
                    });
                    $("select#selectUBVMnzType4").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.MnzType4 = opt;
                    });
                    $("select#selectUBVColour").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Colour = opt;
                    });
                    $('input#ubvPercent').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.Percent = Number($(this).val());//may return string instead, need to cast
                    })
                }
                else if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Structure') {
                    //add properties to interval
                    $('input#ubsAngleAlpha').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.AngleAlpha = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubsAngleBeta').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.AngleBeta = Number($(this).val());//may return string instead, need to cast
                    })
                    $('input#ubsAngleGamma').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.AngleGamma = Number($(this).val());//may return string instead, need to cast
                    })
                }
                else if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Alteration') {
                    //add properties to interval
                    $('input#ubaStyle').change(function () {
                        addon.selectedIntervalTrack.extendedParametersObj.Style = $(this).val();//may return string instead, need to cast
                    })
                }
                break;
            case 'Barrick': case 'barrick-training':
                if (this.selectedIntervalTrack.name == 'MajorLith' || this.selectedIntervalTrack.name == 'MinorLith') {
                    //add properties to interval
                    $("input#textBarrickColour").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text1 = $(this).val();
                    });
                    $("select#selectBarrickGrainsize").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Text2 = opt;
                    });
                    $("select#selectBarrickTexture").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Text3 = opt;
                    });
                    $("select#selectBarrickTexture2").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Text4 = opt;
                    });
                    $("select#selectBarrickTexture3").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Text5 = opt;
                    });
                    $("select#selectBarrickTextureIntensity").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text6 = $(this).val();
                    });
                    $("select#selectBarrickTextureIntensity2").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text7 = $(this).val();
                    });
                    $("select#selectBarrickTextureIntensity3").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text8 = $(this).val();
                    });
                    $("input#textBarrickBedding").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text9 = $(this).val();
                    });
                    $("input#textBarrickClastComp").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text10 = $(this).val();
                    });
                    $("input#textBarrickClastRoundness").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text11 = $(this).val();
                    });
                    $("input#textBarrickClastSize").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text12 = $(this).val();
                    });
                }
                else if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Mineralization') {
                    $("input#numBarrickMineralizationIntensity").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.DoubleNumber = Number($(this).val());
                    });
                    $("input#textBarrickMineralizationMode").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text1 = $(this).val();
                    });
                }
                else if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Alteration') {
                    $("select#selectBarrickIntensity").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Text1 = opt;
                    });
                    $("input#textBarrickAlterationMode").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text2 = $(this).val();
                    });
                }
                else if (this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Structure') {
                    $("select#selectBarrickStructureSubType").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text1 = $(this).val();
                    });
                    $("select#selectBarrickStructureInfill").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text2 = $(this).val();
                    });
                    $("input#numBarrickStructureRoughness").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.IntNumber1 = Number($(this).val());
                    });
                    $("input#numBarrickStructureAlpha").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.IntNumber2 = Number($(this).val());
                    });
                    $("input#numBarrickStructureBeta").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.IntNumber3 = Number($(this).val());
                    });
                    $("select#selectBarrickGangMineral1").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Text3 = opt;
                    });
                    $("select#selectBarrickGangMineral2").change(function (option) {
                        let opt = $(this)[0].selectedOptions[0].text;
                        addon.selectedIntervalTrack.extendedParametersObj.Text4 = opt;
                    });
                    $("input#numBarrickStructureStructureThickness").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.DoubleNumber = Number($(this).val());
                    });
                    $("input#textBarrickStructureConfidence").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text5 = $(this).val();
                    });
                    $("input#textBarrickStructureOrientationConfidence").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text6 = $(this).val();
                    });
                    $("input#numBarrickStructureFoliationType").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.IntNumber4 = Number($(this).val());
                    });
                    $("input#textBarrickStructureVeinType").change(function (option) {
                        addon.selectedIntervalTrack.extendedParametersObj.Text7 = $(this).val();
                    });
                }
                break;
            default: break;
        }
    }

    _adminButtonClickHandler() {
        let addon = this;
        $('#btnReplaceIntervalsFromFile').click(function () {
            $('#inputReplaceIntervalsFromFile').trigger('click');
        });
        $('#btnMergeIntervalsFromFile').click(function () {
            $('#inputMergeIntervalsFromFile').trigger('click');
        });
        $('#btnReplaceFillsFromFile').click(function () {
            $('#inputReplaceFillsFromFile').trigger('click');
        });
        $('#btnMergeFillsFromFile').click(function () {
            $('#inputMergeFillsFromFile').trigger('click');
        });
        $('#btnReplaceIntervalsFromFileOvbFacies').click(function () {
            $('#inputReplaceIntervalsFromFileOvbFacies').trigger('click');
        });
        $('#btnExportFills').click(function () {
            table.viewer.raiseEvent('exportFillsClicked', null);
        });
        $('#btnJsonFile').click(function () {
            $('input#inputJsonFile').trigger('click');
        });


        $('#btnAddQcRules').click(function () {
            $('input#inputQCRulesFromFile').trigger('click');
        });
        $('button#btnAddTracks').on('click', function () {
            table.viewer.raiseEvent('addTracksButtonClicked', null);
        });        

        $('#inputReplaceFillsFromFile').change(function () {
            addon.table.viewer.raiseEvent('request_to_replace_intervals', { isMerge: false, files: this.files, command: 'Fills' });
        });
        $('#inputMergeIntervalsFromFile').change(function () {
            addon.table.viewer.raiseEvent('request_to_replace_intervals', { isMerge: true, files: this.files, command: 'Intervals' });
        });
        $('#inputReplaceIntervalsFromFile').change(function () {
            addon.table.viewer.raiseEvent('request_to_replace_intervals', { isMerge: false, files: this.files, command: 'Intervals' });
        });
        $('#inputMergeFillsFromFile').change(function () {
            addon.table.viewer.raiseEvent('request_to_replace_intervals', { isMerge: true, files: this.files, command: 'Fills' });
        });
        $('#inputReplaceIntervalsFromFileOvbFacies').change(function () {
            addon.table.viewer.raiseEvent('request_to_replace_intervals', { isMerge: false, files: this.files, command: 'Intervals', trackName:'Facies', fileFormat:'csv' });
        });

        $('#inputQCRulesFromFile').change(function () {
            //check that file name is same as a project name, otherwise return
            if (this.files[0].name.replace(/\.[^/.]+$/, "") != table.projectName) {
                alert('Cannot upload file, file name is different than the project')
                return;
            }
            let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Upload/UploadExcelDocument';
            // Now create our form data to send to the server
            var fd = new FormData();
            fd.append("file", this.files[0]);
            fd.append("filename", this.files[0].name);


            let p = fetch(url, {
                method: 'post',
                body: fd
            });
            return p;

            //addon.table.viewer.raiseEvent('request_to_import_qcrules', { files: this.files });
        });
        $('input#inputJsonFile').change(function () {          
            addon.table.viewer.raiseEvent('request_to_import_json_file', { files: this.files });
        })
        //populating trackTypes
        let container = $('div#trackTypesDiv');
        var $links = $();

        this.table.tracklayouts.forEach(tl => {
            let $a = $("<a href='#' class='dropdown-item'> " + tl.TrackTypeName + "</a >");
            $a.on('click', function () {
                $('button#trackTypesDD').text($(this).text()).append(' <span class="caret"></span>');
                $('div#accessoryTrackExtensionDiv').toggle($(this).text().trim() == 'Accessory')
                //validation
                if ($('fieldset#createTrackFS input#trackname').val() != '' && $('button#trackTypesDD').text() != 'Select Type')
                    $('button#createTrackButton').show();
                else
                    $('button#createTrackButton').hide();
            })
            $links = $links.add($a);
        })
        container.append($links);

        $('fieldset#createTrackFS button#createTrackButton').on('click', function () {
            //add the name to layout table and tracknames_tracktypes
            //check if name already exists
            let trackName = $('fieldset#createTrackFS input#trackname').val().trim();
            let selectedTypeTracks = addon.table.tracklayouts.find(o => o.TrackTypeName == $('button#trackTypesDD').text().trim());
            let arr = selectedTypeTracks.Names.split(";");
            let found = arr.find(o => o == trackName);
            if (found == null) {
                let url = DigitalCoreTable.prefixes.serverPrefix + '/api/TrackLayout/Save?trackToSave=' + trackName + '&trackType=' + selectedTypeTracks.TrackType;
                let p = fetch(url, {
                    method: 'post',
                    headers: { 'Content-Type': 'text/json' },
                    body: ''
                });
                return p;

            }
        })

        var $trs = $();
        container = $('ul.c-sidebar-nav-dropdown-items#exportFillsItems');
        var tracksForFillsExport = [];
        let data = Object.keys(this.trackGroups).map(groupname => {
            return {
                name: groupname,
                color: 'black',
                obj: this.trackGroups[groupname],
                type: 'checkbox',
                selected: false,
                isActive: d => {
                    return false;
                },
                onSelected: d => {
                    let i = tracksForFillsExport.indexOf(groupname);
                    if (i != -1)
                        tracksForFillsExport.splice(i, 1);
                    else
                        tracksForFillsExport.push(groupname);
                },
            }
        })

        table.createButtonSetSlideND(data, 'exportFillsItems', null, null, 'div#menuAdminSettings');
        //append button for export
        let $btnExport = $('<button class="btn btn-info" id="btnSelectionExportFills" >Export Fills</button >');
        $btnExport.on('click', function () {
            table.viewer.raiseEvent('exportFillsClicked', { tracks: tracksForFillsExport });
        })
        container.append($('<li class="c-sidebar-nav-item"></li >').add($btnExport));
    }

    _buttonClickHandler() {
        let addon = this;
        //we assign the events on button clicks that shold fire event to other addons
        //$('a[href="#menuDC"]').on('click', function () {
        //    table.viewer.raiseEvent('menuDCButtonClicked', null);
        //});
        $('a.c-sidebar-nav-dropdown-toggle').on('click', function () {
            if (this.id == 'ctCurveDD')
                table.createCurveButtons();
            else if (this.id == 'ctTrackDD')
                table._createTrackButtons();
            else if (this.id == 'ctOverlayDD')
                table._createOverlayButtonsND();
        })

        $('a[href^="#menu"]').on('click', function () {
            //disable drawing for previously selected track
            let menuName = $(this).attr('href');
            //there is some glitch when switching between dc and any other and back,so to assure only one is active
            let contentName = menuName.replace('#', '');
            $('div.tab-content > div:not([id=' + contentName + '])').removeClass('active show');
            $('div.tab-content > div#' + contentName).addClass('active show');

            if (menuName != '#menuLogging' && addon.selectedTrackName != null) {
                //do it for every table
                let tablesArr = [];
                tablesArr.push(addon.table);//push ct table by default
                let striplogTable = addon.table.childTablesAddon != null && addon.table.childTablesAddon.striplogChildren.length > 0 ? addon.table.childTablesAddon.striplogChildren[0].table : null;
                if (striplogTable != null) {
                    tablesArr.push(striplogTable);
                }
                tablesArr.forEach(tbl => {
                    tbl.intervalAddon.intervalDrawing.activeTrack = null;
                    tbl.setScreenPositionLock(false);
                    tbl.intervalAddon.intervalDrawing.stopDrawingOnSegments();
                })
            }
            else if (addon.selectedIntervalTrack != null) {
                //enable drawing on track, check if track not null to be sure
                addon.selectedIntervalTrack._openHandlers.forEach(f => {
                    f(addon.selectedIntervalTrack);
                });
            }
            if (menuName == '#menuAdminSettings') {
                table.viewer.raiseEvent('menuAdminSettingsClicked', { });
                return;
            }
            //if (menuName == '#menuLogging') {
            //    table.viewer.raiseEvent('menuLoggingClicked', {});
            //    return;
            //}
            table.viewer.raiseEvent('menuDCButtonClicked', { name: menuName });
        });
        $('div#menuDC input').on('change', function () {
            table.viewer.raiseEvent('menuDC_input_changed', { element: this, name: $(this)[0].name });
        })        
        $('div#menuDC button, #depthBlockDepth').on('click', function () {
            table.viewer.raiseEvent('menuDC_button_clicked', { element: this, name: $(this)[0].name });
        })
        $('button#btnExportPdf').on('click', function () {
            table.viewer.raiseEvent('exportPdfButtonClicked', null);
        });
        $('button#btnResample').on('click', function () {
            table.viewer.raiseEvent('resampleButtonClicked', null);
        });  


        $('button.templateFunctions').on('click', function () {
            let tbl = table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0 ?
                table.childTablesAddon.striplogChildren[0].table : table;
            tbl.viewer.raiseEvent('buttonTemplateFunctionsClicked', { functionName: $(this).attr('id') });
        });
        //$('div#menuExport button#btnSelectionExportCsv').on('click', function () {
        //    table.viewer.raiseEvent('exportTracks_to_csv', { tracks: table.tracksForCsvExport });
        //})
    /*Buttons in Logging menu*/
        $('div#menuLogging button#btnUndo').on('click', function () {
            table.viewer.raiseEvent('request_to_undo', { track: table.slideControlAddon.selectedIntervalTrack });
        })
        $('div#menuLogging button#btnCancelUpdate').on('click', function () {
            //return color to white
            $('div#menuLogging').find("fieldset,textarea").each(function () {
                $(this).css('background-color', 'rgb(15, 34, 45)');
            });
            $('div#menuLogging').find("input:not(.legendColorFill)").each(function () {
                $(this).css('background-color', 'white');
            });

            //empty selections/inputs
            $('div#menuLogging fieldset table tbody tr.selected').removeClass('selected');
            $('div#menuLogging input, textarea').val('');
            $('div#menuLogging select:not([class*=notToBeEmptied])').val('');
            //$('div#menuLogging textarea#intervalDescription').text('');
            //get the data from the update button and execute removal of context for interval.id
            let dt = $('button#btnUpdateEdit').data();
            if (dt != null && dt.interval != null)
                table.slideControlAddon.tableInstances.forEach(tbl => {
                    tbl.removeContextMenuFromIntervalId(dt.interval.id);
                    //deselect the interval
                    tbl.deselectDecoratedInterval(dt.interval);
                })
            else {
                table.slideControlAddon.tableInstances.forEach(tbl => {
                    tbl.removeContextMenuFromIntervalId(null);
                })
            }
            $('div#intervalEditDiv').hide();
            $('table#editXrdTable').hide();
            //$('select#selectLogger').val(table.slideControlAddon.selectedLogger || table.slideControlAddon._getLastLogger(table.slideControlAddon.selectedIntervalTrack));
        })
        $('div#menuLogging button#btnUpdateEdit').on('click', function () {
            let dt = $(this).data();
            SlideControlAddon.instance._updateOrEditInterval(dt);
            $('div#menuLogging button#btnCancelUpdate').trigger('click');
        })
        $('div#menuLogging button#btnAddClassifier').on('click', function () {
            let name = prompt('Enter classifier name', "pyrite");
            if (name == null) { // cancel
                return;
            }

            let color = '#ffffff';
            let confirmed = false;
            $(document.body).spectrum({
                type: "flat",
                showPaletteOnly: false,
                hideAfterPaletteSelect:true,
                togglePaletteOnly: false,
                color: 'blanchedalmond',
                palette: [
                    ["#000", "#444", "#666", "#999", "#ccc", "#eee", "#f3f3f3", "#fff"],
                    ["#f00", "#f90", "#ff0", "#0f0", "#0ff", "#00f", "#90f", "#f0f"],
                    ["#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9", "#ead1dc"],
                    ["#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
                    ["#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0"],
                    ["#c00", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6", "#674ea7", "#a64d79"],
                    ["#900", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#0b5394", "#351c75", "#741b47"],
                    ["#600", "#783f04", "#7f6000", "#274e13", "#0c343d", "#073763", "#20124d", "#4c1130"]
                ]  ,         
                hide: (e) => {
                    $(document.body).spectrum('destroy');
                    color = '#' + e.toHex();
                    //check that we don't have same color
                    let isColorExist = addon.table.classifiers.map(o => o.Color.toLowerCase()).some(g => g == color.toLowerCase());
                    if (isColorExist) {
                        alert('The color already exist in the list, please, choose another one...')
                        return;
                    }
                    let table = $('div#menuLogging fieldset#intervalFillsFldst table#tableLithology')[0];
                    //let table = document.getElementById("tableLithology");
                    let row = table.insertRow(table.rows.length);
                    row.setAttribute('class', 'table-row');
                    row.setAttribute('id', 'fill' + table.rows.length-1);
                    let cell1 = row.insertCell(0);
                    cell1.setAttribute("class", "lithRectangle");
                    cell1.style.backgroundColor = color;
                    let cell2 = row.insertCell(1);
                    cell2.textContent = name;
                    row.addEventListener('click', function () {
                        //adding class to highlight the selection
                        $(this).addClass("selected").siblings().removeClass("selected");
                        $('#btnLine').removeClass("tooltipToolBtn");
                        $('#btnLine').attr('disabled', false);
                        $('#btnShape').removeClass("tooltipToolBtn");
                        $('#btnShape').attr('disabled', false);
                        $('#btnPoint').removeClass("tooltipToolBtn");
                        $('#btnPoint').attr('disabled', false);
                    })
                    row.click();
                    let container = table.parentElement;
                    container.scroll(0, container.scrollHeight);
                },

                // change: (e) =>{
                //     if(e != null){
                //          color = '#' + e.toHex();
                //          addClassifier(name, color);             
                //     }
                // }
            });
        })
        $('div#menuLogging button#btnLostCore').click(function () {
            addon.table.viewer.raiseEvent('populate_lostcore', {
                track: addon.selectedIntervalTrack.name,
                uwi: addon.selectedIntervalTrack.uwi,
                isAccessoryTrack: addon.selectedIntervalTrack.isAccessoryTrack,
                isSampleTrack: addon.selectedIntervalTrack.isSampleTrack,
                isLithologyTrack: addon.selectedIntervalTrack.isLithologyTrack
            });
        });
        $('div#menuLogging button#btnReplaceIntervalsTrackFromFile').click(function () {
            $('div#menuLogging #inputReplaceIntervalsTrackFromFile').val('');
            $('div#menuLogging #inputReplaceIntervalsTrackFromFile').trigger('click');
        });
        $('div#menuLogging button#btnMergeIntervalsTrackFromFile').click(function () {
            $('div#menuLogging #inputMergeIntervalsTrackFromFile').val('');
            $('div#menuLogging #inputMergeIntervalsTrackFromFile').trigger('click');
        });
        $('div#menuLogging #inputMergeIntervalsTrackFromFile').change(function () {
            addon.table.viewer.raiseEvent('request_to_replace_intervals', { isMerge: true, files: this.files, command: 'Intervals', trackName: addon.selectedTrackName, isAccessoryTrack: addon.selectedIntervalTrack.isAccessoryTrack });
        });
        $('div#menuLogging #inputReplaceIntervalsTrackFromFile').change(function () {
            addon.table.viewer.raiseEvent('request_to_replace_intervals', { isMerge: false, files: this.files, command: 'Intervals', trackName: addon.selectedTrackName, isAccessoryTrack: addon.selectedIntervalTrack.isAccessoryTrack, isSampleTrack: addon.selectedIntervalTrack.isSampleTrack });
        });
        /*Sample track button events*/
        $('div#menuLogging button#btnSampleNumbering').click(function () {
            addon.table.viewer.raiseEvent('renumber_samples', { track: addon.selectedIntervalTrack.name });
        });
        $('div#menuLogging button#btnPopulateRule').click(function () {
            //deselect interval if was selected
            addon.tableInstances.forEach(tbl => {
                tbl.deselectDecoratedInterval(this.selectedInterval);
                //tbl.slideControlAddon.scrollingIndex = 0;
                //tbl.slideControlAddon.selectedInterval = null;
            })

            //handle the read from table.SamplingRules filtering by the name of rule
            //in select or rule name
            var rulename = $("#SampleRuleSelect option:selected").text();
            //let rulename = $("#SampleRuleSelect")[0].selectedOptions[0].text
            let samplerules = addon.table.samplingRules.filter(o => o.Name == rulename)[0];
            let evname = addon.table.userGroup == 'Barrick' ? 'populate_samples_barrick' :
                addon.table.userGroup.startsWith('Agnico') || addon.table.userGroup == 'UpperBeaver' ? 'populate_samples_agnico' : 'populate_samples';
            addon.table.viewer.raiseEvent(evname, {
                sampleTrackName: addon.selectedTrackName,
                trackName_upper: samplerules.TrackName.toUpperCase(),
                arrSample1: samplerules.Sample1Fills.split(';'),
                arrSample2: samplerules.Sample2Fills.split(';'),
                s1min: samplerules.Sample1Min,
                s1max: samplerules.Sample1Max,
                s2min: samplerules.Sample2Min,
                s2max: samplerules.Sample2Max,
                ruleName: rulename,
                uwi: table.wells[0].uwi,
                needsToBeSaved: false, // don't write to db
                blkStartSample: samplerules.BlkStartSample,
                blkRepeat: samplerules.BlkRepeat,
                stdStartSample: samplerules.StdStartSample,
                stdRepeat: samplerules.StdRepeat,
                dupStartSample: samplerules.DupStartSample,
                dupRepeat: samplerules.DupRepeat,
                canCrossLC: samplerules.CanCrossLC,
                maxLCLength: samplerules.MaxLCLength
            });
        });
        $('div#menuLogging button#btnPrintTags').click(function () {
            //table.setLoading(true);
            table.exporterHelperAddon._exportXLS();
            //table.viewer.raiseEvent('request_to_export_xls', null);
        });

        //specific logic for Description track
        $('#descriptionTrack').on('click', 'input', function () {
            table.viewer.raiseEvent('update_description_track', {
                trackName: this.name,
                isChecked: this.checked,
                descriptionTrackName: addon.selectedIntervalTrack.name
            });
        })





    /*Buttons in Export menu*/
        $('div#menuExport button#btnBoxExport').on('click', function () {
            table.rqdAddon.exportBoxEndsTool.setActive(true);
        })
        $('div#menuExport button#btnTubeDepths').on('click', function () {
            table.rqdAddon.exportTubeDepthTool.setActive(true);
        })
        $('div#menuExport button#btnSegmentDepths').on('click', function () {
            table.rqdAddon.exportDepthCorrectionTool.setActive(true, true);
        })
        $('div#menuExport button#btnImportDrillerDepths').on('click', function () {
            table.depthCorrectionDrillerBlockAddon.importDrillerBlockTool.setActive(true);
        })
        $('div#menuExport button#btnExportDepthCorrection').on('click', function () {
            table.rqdAddon.exportDepthCorrectionTool.setActive(true);
        })
        $('div#menuExport button#btnExportRqd').on('click', function () {
            table.depthCorrectionDrillerBlockAddon.depthCorrectionExportRqdTool.setActive(true);
        })
        $('div#menuExport button#btnExportLithoRqd').on('click', function () {
            table.depthCorrectionDrillerBlockAddon.depthCorrectionExportLithoRqdTool.setActive(true);
        })
        $('div#menuExport button#btnExportFracturePerM').on('click', function () {
            table.depthCorrectionDrillerBlockAddon.depthCorrectionExportFracturePerMTool.setActive(true);
        })
        $('div#menuExport button#btnExportFractureDepth').on('click', function () {
            table.depthCorrectionDrillerBlockAddon.depthCorrectionExportFractureDepthTool.setActive(true);
        })
        /*
        $('div#menuExport button#btnExportTest').on('click', function () {
            table.depthCorrectionDrillerBlockAddon.depthCorrectionExportTestTool.setActive(true);
        })
        */
        $('div#menuExport button#btnExportXrdDepths').on('click', function () {
            table.veinAddon.exportXRD();
            //table.depthCorrectionDrillerBlockAddon.depthCorrectionExportRqdTool.setActive(true);
        })
        $('div#menuExport button#btnExportClassification').on('click', function () {
            table.viewer.raiseEvent('request_to_export_classification', null);
        })

    /*Buttons in Settings menu*/
        $('div#menuSettings button#btnHelpQC').on('click', function () {
            alert("*Check for gaps\n Select the track to test for gaps: (All tracks are available to check off)\n" +
         "*Check LC Intervals\n Do the LC intervals in track ______ match that the LC the striplog ? (User can select one or more tracks to test from a dropdown)\n" +
        "*Check for Intervals crossing another Tracks boundaries\n Do __ cross __ boundaries ? (User can select one or more tracks to test from a dropdown, an example would be do samples cross facies boundaries)\n"+
                "*Check Interval Lengths. Identify intervals shorter than ___m(user enters length) in the____ track(dropdown of tracks).This will mostly be used in the sample track so we need the option to skip NA and LC, I see\n" +
                "this as 2 boxes to check off under this tool.\n" +
                "*Check Facies match Member\n The user selects what facies go with what member.So that facies interval must fall within that member's interval. This is why the file needs to be saveable, because it will take a long time\n" +
                "to assign each facies to a member."+
        "*Check Fines match Facies\n To be used once we have PSD results loaded.Each facies has a certain allowable fines upper and lower limit.If the predicted fines in a sample fall outside that range for that facies they should be flagged.\n"+ 
         "*Check Bitumen match Facies\n Same as above but with BIT")
        })

        $('button#btnTrackPositionController').on('click', function () {
            let dockedStriplog = $('div#striplogDockPanel > iframe');
            if (dockedStriplog.length > 0) {
                table.childTablesAddon.striplogChildren[0].table.striplogAddon._createStriplogTrackControl();

                dockedStriplog.contents().find('table#tblTrackPositionControl').show();
            }
        })
    }

    _getClassName() {
        return _isAccessoryTrack(this.trackSelection.value, this.trackSelection.text) ? 'abbrRectangle' : 'lithRectangle';
    }

    setButtonHighlightFromStriplog(className, id) {
        $('.' + className)
            .removeClass('intervalControlsHighlighted');
        if (id != null) {
            $('#' + id).addClass('intervalControlsHighlighted');
        }
    }

    _populateFills(track) {
        var addon = this;
        var container = track.constructor.name == 'LithologyTrack' ? this.table.isOilSandsLayout ? $('div#lithologySuncor .tblMainFillsClass tbody') :
            $('div#lithologyGeneral .tblMainFillsClass tbody') : $('div#intervalTracksHolder .tblMainFillsClass tbody');
        //we may have two or more containers with fills, we need to loop thru them otherwise we will end up with same ids
        container.each(function (index) {
            var $trs = $();
            var index = 0;
            $(this).empty();
            track.fills.forEach(fill => {
                let a = $(this).parent();
                //Create TR and append TDs to it
                let $tr = $('<tr/>', { class: 'table-row', id: a.attr('id').endsWith('2') ? 'fill_b' + index : 'fill' + index });
                if (track.isAccessoryTrack) {
                    if (fill.ResourceStretch == null) {
                        $tr.append($('<td style="padding:0"/>').addClass('lithCircle').css('backgroundColor', fill.Color)
                            .append($('<input class="legendColorFill lithCircle" readonly="true"></input>').css({ 'backgroundColor': fill.Color, 'height': '100%' })).add($('<td/>').text(fill.Name + '(' + fill.Abbr + ')')));
                        $tr.data(fill);
                    }
                    else {
                        $tr.append($('<td style="padding:0"/>').addClass('abbrRectangle').html("<img width='30' class='imgRectangle' height='20' src='" + fill.ResourceStretch + "'></img > ")
                            .append($('<input class="legendColorFill" readonly="true"></input>').css({ 'backgroundColor':fill.Color, 'height':'100%' }))
                            .add($('<td/>').text(fill.Name + '(' + fill.Abbr + ')')));
                        $tr.data(fill);
                    }

                    //$tr.append($('<td/>').addClass('abbrRectangle').html(fill.ResourceStretch == null ? fill.Abbr :
                    //    "<img width='30' class='imgRectangle' height='20' src='" + fill.ResourceStretch + "'></img > ").
                    //    add($('<td/>').text(fill.Name + '(' + fill.Abbr + ')')));
                }
                else if (track.name == 'HIRES') {
                    $tr.append($('<td style="padding:0"/>').addClass('lithRectangle').css('backgroundColor', fill.Color)
                        .append($('<input class="legendColorFill" readonly="true"></input>').css({ 'backgroundColor': fill.Color, 'height': '100%' }))
                        .add($('<td/>').text(fill.Name)));
                    $tr.data(fill);
                }
                else {
                    $tr.append($('<td style="padding:0"/>').addClass('lithRectangle').css('backgroundColor', fill.Color)
                        .append($('<input class="legendColorFill" readonly="true"></input>').css({ 'backgroundColor': fill.Color, 'height': '100%' }))
                        .add($('<td/>').text(fill.Name + '(' + fill.Abbr + ')')));
                    $tr.data(fill);
                }


                //Add each tr to the container
                addon._assignRowClickEvent($tr);
                $tr.find('input.legendColorFill').on('click', function (event) {

                    var fillColor = $(this).css("background-color");
                    let $element = $(this);
                    $(document.body).spectrum({
                        type: "flat",
                        showInitial:true,
                        showPaletteOnly: false,
                        togglePaletteOnly: false,
                        showSelectionPalette: true,
                        color: fillColor,
                        hide: function (e) {
                            $(document.body).spectrum('destroy');
                        },
                        change: (e) => {
                            $(document.body).spectrum('destroy');
                            let color = '#' + e.toHex();
                            //check that we don't have same color
                            let isColorExist = addon.selectedIntervalTrack?.fills.map(o => o.Color.toLowerCase()).some(g => g == color.toLowerCase());
                            if (isColorExist) {
                                alert('The color already exist in the list, please, choose another one...')
                                return;
                            }
                            //update the color
                            $element.css('background-color', color);
                            let filldata = $element.parents('tr[id^=fill]').data();
                            let foundfill = table.fills.find(o => o.Id == filldata.Id)
                            if (foundfill != null) {
                                foundfill.Color = color;
                                if (table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0) {
                                    let foundStriplogFill = table.childTablesAddon.striplogChildren[0].table.fills.find(o => o.Id == filldata.Id)
                                    foundStriplogFill.Color = color;
                                }
                                $element.parents('tr[id^=fill]').data(foundfill);
                                if (addon.selectedIntervalTrack.name == 'HIRES')
                                    table.viewer.raiseEvent('update_active_params_vein', {
                                        isClassification: true,
                                        isUpdate: true,
                                        classifier: fill,
                                        activeFill_color_rgb: color, // we know for sure that row is selected
                                        activeHalo_color_rgb: color, // if halo is not selected , use minerology selection
                                        activeTiming_index: 0,
                                        activeTexture_name: null,
                                        isHaloSelected: false, // if halo is not selected , use minerology selection
                                    });
                                else {
                                    let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Fills/Update';
                                    let p = fetch(url, {
                                        method: 'post',
                                        headers: { 'Content-Type': 'text/json' },
                                        body: JSON.stringify(fill)
                                    })
                                        .then(d => {
                                            confirm('Color changed');
                                        });
                                }
                            }                       
                        },

                        // change: (e) =>{
                        //     if(e != null){
                        //          color = '#' + e.toHex();
                        //          addClassifier(name, color);             
                        //     }
                        // }
                    });

                })
                $trs = $trs.add($tr);
                index++;
            });
            //Append all TRs to the container.
            $(this).append($trs);
        })
    }

    _populateContacts(track) {
        track.editWindow(document);
    }
    _populateAbundance(track) {
        if (track.intensities.length == 0)
            return;
        let container = $('#tableAbundance tbody');

        var $trs = $();
        var index = 0;
        track.intensities.forEach(intensity => {
            //Create TR and append TDs to it
            let $tr = $('<tr/>', { class: 'table-row', id: "abun"+index });
            $tr.append($('<td/>').text(intensity));
            //Add each tr to the container
            this._assignRowClickEvent($tr);
            $trs = $trs.add($tr);
            index++;
        });
        //Append all TRs to the container.
        container.append($trs);
        $('#intervalAbundanceFldst').show();
    }

    _assignRowClickEvent(row) {
        let addon = this;
        row.on('click', function () {
            if ($(this).hasClass('selected'))
                $(this).removeClass("selected").siblings().removeClass("selected");
            else
                $(this).addClass("selected").siblings().removeClass("selected");
            $('#btnLine').removeClass("tooltipToolBtn");
            $('#btnLine').attr('disabled', false);
            $('#btnShape').removeClass("tooltipToolBtn");
            $('#btnShape').attr('disabled', false);
            $('#btnPoint').removeClass("tooltipToolBtn");
            $('#btnPoint').attr('disabled', false);
        });
        row.on('contextmenu', function (event) {
            //confirm, check for other holes fill
            if (window.event.ctrlKey) {
                let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Fills/CheckFillToRemove?fillId=' + $(this).data().Id;
                event.preventDefault();
                var fill = $(this).data();
                let p = fetch(url).then(d => d.json())
                    .then(d => {
                        //returns list of uwis, if list is empty than it is already deleted
                        $.confirm({
                            boxWidth: '50%',
                            useBootstrap: false,
                            title: d.length == 0 ? 'No intervals found, fill deleted' : 'There are ' + d.length + ' intervals with such fill, do you want to delete them?',
                            content: d.length == 0 ? '' : d.join(','),
                            buttons: {
                                ok: {
                                    text: 'OK', // text for button
                                    btnClass: 'btn-blue', // class for the button
                                    isHidden: d.length != 0, // initially not hidden
                                    isDisabled: false, // initially not disabled
                                    action: function (okButton) {
                                        //when clicked then fill is deleted
                                        table.fills = table.fills.filter(o => o.Id != fill.Id);
                                        table.slideControlAddon.selectedIntervalTrack.fills = table.slideControlAddon.selectedIntervalTrack.fills.filter(o => o.Id != fill.Id);
                                        table.slideControlAddon._populateFills(table.slideControlAddon.selectedIntervalTrack);
                                    }
                                },
                                deleteFill: {
                                    text: 'Delete Fill', // text for button
                                    isHidden: d.length == 0, // initially not hidden
                                    action: function (deleteFillButton) {
                                        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Fills/DeleteFill?fillId=' + fill.Id;
                                        let p = fetch(url, {
                                            method: 'post',
                                            headers: { 'Content-Type': 'text/json' },
                                            body: JSON.stringify(fill)
                                             })
                                            .then(d => {
                                                $.alert('Deleted fill');
                                                this.$$deleteFill.prop('disabled', true);//disable button after return
                                                //when clicked then fill is deleted
                                                table.fills = table.fills.filter(o => o.Id != fill.Id);
                                                table.slideControlAddon.selectedIntervalTrack.fills = table.slideControlAddon.selectedIntervalTrack.fills.filter(o => o.Id != fill.Id);
                                                table.slideControlAddon._populateFills(table.slideControlAddon.selectedIntervalTrack);
                                            })
                                        p.catch(d => {
                                            $.alert("Couldn't delete fill " + d.message);
                                        });
                                        return false;// confirm stays in order to delete intervasl later
                                    }
                                },
                                deleteIntervals: {
                                    text: 'Delete Intervals',
                                    isHidden: d.length == 0, 
                                    action: function (deleteIntervalsButton) {
                                        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Fills/DeleteIntervalsForFill?fillId=' + fill.Id;
                                        let p = fetch(url, {
                                            method: 'post',
                                            headers: { 'Content-Type': 'text/json' },
                                            body: JSON.stringify(fill)
                                              })
                                            .then(d => {
                                                $.alert('Deleted intervals');
                                                this.$$deleteIntervals.prop('disabled', true);//disable button after return
                                            })
                                        p.catch(d => {
                                            $.alert("Couldn't delete intervals " + d.message);
                                        });
                                        return false;// confirm stays in order to delete intervasl later
                                    },
                                },
                                cancel: {
                                    text: 'Cancel', // text for button
                                    isHidden: false, // initially not hidden
                                    isDisabled: false, // initially not disabled
                                    action: function (cancelButton) {
                                        // longhand method to define a button
                                        // provides more features
                                    }
                                },
                            }
                        });
                    })
            }
        })
    }

    _setDefault() {
        $('#intervalAbundanceFldst').hide();
        $('#intervalTextureFldst').hide();
        $('div#intervalTracksHolder').hide();
        //$('div#descriptionDiv').hide();
        $('#lithologySuncor').hide();
        $('#lithologyGeneral').hide();
        $('table#editXrdTable').hide();
        $('div#menuLogging fieldset table tbody tr').remove();
        $('#ribbonContainer .intervalControlsHighlighted').removeClass('intervalControlsHighlighted');
    }

    //_populateTabTracks() {
    //    var $trs = $();
    //    let container = $('div#trackTabsContainer nav div#nav-tab');
    //    //let trackGroups = _.groupBy(this.table.tracks, x => (x.name != null && x.name.slice(-1) >= '0' && x.name.slice(-1) <= '9') ? _getBaseNameFromAccessoryTrackName(x.name) : x.name)
    //    Object.keys(this.trackGroups).forEach(groupname => {
    //        //create a link
    //        let $a = $("<a class='nav-item nav-link' id='nav-contact-tab' data-toggle='tab' href='#nav-contact' role='tab' aria-controls='nav-contact' aria-selected='false'>" + groupname + "</a>");
    //        //Add each a to the container
    //        $trs = $trs.add($a);
    //    });

    //    //Append all TRs to the container.
    //    container.append($trs);
    //}

    _populatePercentage() {
        var $trs = $();
        let container = $('table#tablePercentage tbody');
        for (let i = 1; i < 10; i++) {
            //Create TR and append TDs to it
            var $tr = $('<tr/>', { class: 'table-row', id: 'perc' + i });
            $tr.append(
                $('<td />', { text: (i*10)+'%' }));
            //Add each tr to the container
            this._assignRowClickEvent($tr);
            $trs = $trs.add($tr);
        }
        //Append all TRs to the container.
        container.append($trs);
    }

    /*Stores function handlers for various elements located in slide control*/
    _elementsHandler() {
        var addon = this;
        $('div#menuLogging input#intervalTop').on('change input', function () {
            addon._top = Number($(this).val());
            if (addon._bottom != null)
                $('div#menuLogging input#intervalTotalLength').val(addon._roundTo2(addon._bottom - addon._top))
        })
        $('div#menuLogging input#intervalBottom').on('change input', function () {
            addon._bottom = Number($(this).val());
            if (addon._top != null)
                $('div#menuLogging input#intervalTotalLength').val(addon._roundTo2(addon._bottom - addon._top))
        })
        $('input#filterFillsByName').off().on('keyup', function () {
            var value = $(this).val().toLowerCase();
            $('table#tableLithology tr[id^=fill]').filter(function () {
                $(this).toggle($(this).find('td:eq(1)').html().toLowerCase().indexOf(value) > -1)
            })
        })
        $('input#chkIsLabelVisibleBarrickAuPredict').on('change', function () {
            //toggle labels
            if (addon.table.childTablesAddon != null && addon.table.childTablesAddon.striplogChildren.length > 0) {
                addon.table.childTablesAddon.striplogChildren.forEach(sc => {
                    sc.table.striplogIntervalAddon.toggleAuPredictionLabels = !sc.table.striplogIntervalAddon.toggleAuPredictionLabels;
                    sc.table.striplogIntervalAddon._updateBarrickAuPredictionTrack();
                })
            }
        })
    }

   _populateTracks() {
       var sel = document.getElementById('trackSelectionSC');
       var addon = this;
       //need to group by base name, could be accessory tracks in order to show only base names
       //let trackGroups = _.groupBy(this.table.tracks.filter(o => !o.isPhoto || o.name=='HIRES'), x => (x.name != null && x.name.slice(-1) >= '0' && x.name.slice(-1) <= '9') ? _getBaseNameFromAccessoryTrackName(x.name) : x.name)
    Object.keys(this.trackGroups).forEach(groupname => {
            // create new option element
            var opt = document.createElement('option');
            // create text node to add to option element (opt)
            opt.appendChild(document.createTextNode(groupname));
           // set value property of opt
           let track = this.trackGroups[groupname];
            opt.value = groupname;
            // add opt to end of select box (sel)
        $('select#exportCsvTrackSelection,select#trackSelectionSC').append(opt);
        //sel.appendChild(opt);
        //do the same for export csv track selection
    });

    var slct = document.getElementById('select_trackNames');
    this.table.tracks.filter(o => !o.isPhoto).forEach(track => {
        var option = document.createElement("option");
        option.text = track.name;
        option.value = track.name;
        slct.appendChild(option);
    })

       $(sel).change(function () {
           addon._onTrackSelection($(this)[0].selectedOptions[0]);
       });
       //add handler for select logger change
       $('select#selectLogger').on('change', function () {
           addon.selectedLogger = $(this).val();
       })
    }

    _addOptions(element, arr) {
        if (element.length == 0)
            return;
        element.find('option:not(:first)').remove();
        $.each(arr, function () {
            element.append($("<option />").text(this).val(this));
        });
    }

    _populateCleanAirExtended(track) {
        let fills = table.fills.filter(o => o.Group == 'CleanAir_Mineralization').map(o => o.Abbr);
        this._addOptions($("select[id^=selectCAMineralization]"), fills);
        let ops = ['L', 'P', 'C', 'U', 'I', 'S'];
        this._addOptions($("select[id=selectShape]"), ops);
        ops = ['example'];
        this._addOptions($("select[id=selectRoughness]"), ops);
        ops = ['fc', 'p', 'm', 'd', 'v'];
        this._addOptions($("select[id=selectCAStyle]"), ops);
    }

    _populateCasinoExtended(track) {
        let fills = table.fills.filter(o => o.Group == 'Alteration_Occurrence').map(o => o.Abbr);
        this._addOptions($("select[id^=selectPAO]"), ['Banded', 'BrecciaVeinInfill', 'Disseminated',
            'Interstitial', 'Patchy', 'Pervasive', 'ReplacementComplete', 'ReplacementPartial', 'SelectiveFelsic',
            'SelectiveMafic', 'SelectiveOther', 'VeinFractureFill', 'VeinSelvage', 'Zoned', 'BrecciaMatrix','BrecciaClasts']);
        this._addOptions($("select[id^=selectOAO]"), ['Banded', 'BrecciaVeinInfill', 'Disseminated',
            'Interstitial', 'Patchy', 'Pervasive', 'ReplacementComplete', 'ReplacementPartial', 'SelectiveFelsic',
            'SelectiveMafic', 'SelectiveOther', 'VeinFractureFill', 'VeinSelvage', 'Zoned', 'BrecciaMatrix', 'BrecciaClasts']);
        this._addOptions($('select#selectDA'), ['Primary', 'Overprinting']);
    }

    _populateUpperBeaverExtended(track) {
        let colorOptions = ['Blue - Basic', 'Brown - Basic', 'Green - Basic', 'White', 'Gray - Basic',
            'Pink - Basic', 'Purple - Basic', 'Black', 'Red - Basic', 'Yellow - Basic'];
        let fills = table.fills.filter(o => o.Group == 'Mineralization_Style').map(o => o.Name);
        this._addOptions($("select#selectUBMStyle"), fills);
        this._addOptions($("select#selectUBMColour"), colorOptions);
        fills = table.fills.filter(o => o.Group == 'Mineralization_Grainsize').map(o => o.Name);
        this._addOptions($("select#selectUBMGrainsize"), fills);
        this._addOptions($("select#selectUBVColour"), colorOptions);
        let mnztype = table.fills.filter(o => o.Group == 'Vein_MnzType').map(o => o.Name);
        //let mnztype = ['CPY', 'PYR', 'MOL', 'VG', 'HEM', 'MAG', 'BNT', 'POT', 'PYL', 'STI'];
        this._addOptions($("select#selectUBVMnzType1"), mnztype);
        this._addOptions($("select#selectUBVMnzType2"), mnztype);
        this._addOptions($("select#selectUBVMnzType3"), mnztype);
        this._addOptions($("select#selectUBVMnzType4"), mnztype);

        //make autocomplete out of vein texture field
        var tags = table.fills.filter(o => o.Group == 'Vein_Texture').map(o => o.Name);
        $("input#ubvTexture").autocomplete({
            source: function (request, response) {
                var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i");
                response($.grep(tags, function (item) {
                    return matcher.test(item);
                }));
            }
        });
        var alt_style = table.fills.filter(o => o.Group == 'UB_AltStyle').map(o => o.Name);
        $("input#ubaStyle").autocomplete({
            source: function (request, response) {
                var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i");
                response($.grep(alt_style, function (item) {
                    return matcher.test(item);
                }));
            }
        });
    }

    _getLastLogger(track) {
        //we show the last logger
        let intervals = track.isAccessoryTrack ? table.intervalAddon.intervals.filter(o => _getBaseNameFromAccessoryTrackName(o.groupName) == track.niceName) :
            table.intervalAddon.intervals.filter(o => o.groupName == track.name);
        if (intervals.length > 0) {
            let sorted = intervals.sort((a, b) => new Date(b.dateInserted) - new Date(a.dateInserted));
            return sorted[0].loggedBy;
        }
        return null;
    }

    _populateBarrickExtended(track) {
        let fills = table.fills.filter(o => o.Group == 'Barrick_Grainsize').map(o => o.Abbr);
        this._addOptions($("select[id^=selectBarrickGrainsize]"), fills);
        fills = table.fills.filter(o => o.Group == 'Barrick_TexIntensity').map(o => o.Abbr);
        this._addOptions($("select[id=selectBarrickTextureIntensity]"), fills);
        this._addOptions($('select[id=selectBarrickTextureIntensity2]'), fills);
        this._addOptions($('select[id=selectBarrickTextureIntensity3]'), fills);
        fills = table.fills.filter(o => o.Group == 'Barrick_Infill').map(o => o.Abbr);
        this._addOptions($("select[id=selectBarrickStructureInfill]"), fills);
        fills = table.fills.filter(o => o.Group == 'Barrick_Subtype').map(o => o.Abbr);
        this._addOptions($("select[id=selectBarrickStructureSubType]"), fills);
        fills = table.fills.filter(o => o.Group == 'Barrick_GangMin1').map(o => o.Abbr);
        this._addOptions($("select[id=selectBarrickStructureGangMineral1]"), fills);
        fills = table.fills.filter(o => o.Group == 'Barrick_GangMin2').map(o => o.Abbr);
        this._addOptions($("select[id=selectBarrickStructureGangMineral2]"), fills);
        fills = table.fills.filter(o => o.Group == 'Sample_St').map(o => o.Name);
        this._addOptions($("select[id=selectSampleSt]"), fills);
        fills = table.fills.filter(o => o.Group == 'Sample_Blk').map(o => o.Name);
        this._addOptions($("select[id=selectSampleBlk]"), fills);
        let barrickTextures = ['AM', 'AP', 'B', 'c', 'CR', 'e', 'EQ', 'f', 'h', 'i', 'j', 'k', 'l', 'LT', 'n', 'o', 'PC', 'PS', 'q',
            't', 'u', 'VS'];
        this._addOptions($('select#selectBarrickTexture'), barrickTextures);
        this._addOptions($('select#selectBarrickTexture2'), barrickTextures);
        this._addOptions($('select#selectBarrickTexture3'), barrickTextures);
    }

    _populateKirklandExtended(track) {
        let fills = table.fills.filter(o => o.Group == 'Kirkland_Mineralization').map(o => o.Abbr);
        this._addOptions($("select[id^=selectMineralization]"), fills);
        fills = table.fills.filter(o => o.Group == 'Kirkland_Texture').map(o => o.Abbr);
        this._addOptions($('select[id^=selectTexture]'), fills);
        let amount = ['tr', '1-2%', '2-3%', '3-5%', '5-7%', '7-10%', '10-15%'];
        this._addOptions($('select[id^=selectAmount]'), amount);
        fills = table.fills.filter(o => o.Group == 'Kirkland_Structure2').map(o => o.Abbr);
        this._addOptions($('select[id^=selectType]'), fills);
        fills = table.fills.filter(o => o.Group == 'Kirkland_Alteration').map(o => o.Abbr);
        this._addOptions($('select[id^=selectAlteration]'), fills);
        fills = table.fills.filter(o => o.Group == 'Kirkland_VeinStyle').map(o => o.Abbr);
        this._addOptions($('select[id^=selectVeinStyle]'), fills);
        fills = table.fills.filter(o => o.Group == 'Kirkland_VeinType').map(o => o.Abbr);
        this._addOptions($('select[id^=selectVeinType]'), fills);
        fills = table.fills.filter(o => o.Group == 'Kirkland_Alteration2').map(o => o.Abbr);
        this._addOptions($('select[id^=selectAlterationStyle]'), fills);
    }

    _populateTextures(track) {
        if (track.textures.length > 0) {
            $('#intervalTextureFldst').show();
            let texture_form_name = track.niceName == 'Alteration' ? 'Alteration Form' : track.niceName == 'Mineralization' ? 'Minlzn Form' : track.niceName == 'Silicification' ? 'Silicification Form' : track.niceName == 'Alteration Min' ? 'Alteration Form' : track.niceName == 'Oxidation' ? 'Oxidation Form' : 'Texture';
            document.getElementById('accTexLegend').innerHTML = texture_form_name;
            //table = document.getElementById('tableTexture').getElementsByTagName('tbody')[0];
            let container = $('#tableTexture tbody');

            var $trs = $();
            let index = 0;
            track.textures.forEach(texture => {
                //Create TR and append TDs to it
                let $tr = $('<tr/>', { id: 'texture' + index });
                $tr.append($('<td/>').addClass('lithRectangle').append($('<img/>').addClass('btnImage').attr('src',texture.ResourceStretch)).
                    add($('<td/>').text(texture.Name)));
                //Add each tr to the container
                this._assignRowClickEvent($tr);
                $trs = $trs.add($tr);
                index++;
            });
            //Append all TRs to the container.
            container.append($trs);
            $('#divDescription').css('top', '325px');
        }
    }

    _populateDescription() {
        var $trs = $();
        let addon = this;
        let descTrackFound = this.table.descriptionTracks.find(o => o.name == this.selectedTrackName);
        let container = $('table#tableDescription tbody');
        this.table.tracks.filter(o => !o.isPhoto || o.name == 'HIRES').forEach(track => {
            var tr = document.createElement('tr');
            var checkCell = document.createElement('td');
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = track.name;
            checkbox.checked = descTrackFound.tracksForDescription.some(o => o == track.name);
            checkbox.className += 'lithRectangle';
            checkbox.addEventListener('click', function () {

                addon._descriptionCheckBoxEventHandler(this.name, this.checked, addon.selectedTrackName);
                //let ch = table.childTablesAddon;
                //if (ch != null && ch.striplogChildren.length > 0)
                //    ch.striplogChildren[0].table.viewer.raiseEvent('update_description_track', {
                //        trackName: this.name,
                //        isChecked: this.checked,
                //        descriptionTrackName: addon.selectedTrackName
                //    });
                //table.viewer.raiseEvent('update_description_track', {
                //    trackName: this.name,
                //    isChecked: this.checked,
                //    descriptionTrackName: addon.selectedTrackName
                //});
            })

            var nameCell = document.createElement('td');
            var text = document.createTextNode(track.name);
            checkCell.append(checkbox);
            nameCell.appendChild(text);
            tr.appendChild(checkCell);
            tr.appendChild(nameCell);

            container.append(tr);
        })
    }

    _descriptionCheckBoxEventHandler(name,ischecked, descriptionTrack) {
        let addon = this;
        let ch = table.childTablesAddon;
        if (ch != null && ch.striplogChildren.length > 0)
            ch.striplogChildren[0].table.viewer.raiseEvent('update_description_track', {
                trackName: name,
                isChecked: ischecked,
                descriptionTrackName: descriptionTrack
            });
        table.viewer.raiseEvent('update_description_track', {
            trackName: name,
            isChecked: ischecked,
            descriptionTrackName: addon.selectedTrackName
        });
    }

    _onTrackSelection(trackSelected) {
        //need to clear all the tables
        let val = trackSelected.value;
        this.selectedTrackName = val;
        this.trackSelection = trackSelected;
        let trackName = /*trackSelected.text*/val;
        $('#accFillLegend').text(this.table.userGroup == 'Rio' && (trackName == 'Minor Mineralization' || trackName == 'Major Mineralization') ? 'Mineral' :
            trackName == 'Majors' || trackName == 'Minors' ? 'Rock Type' : this.table.userGroup == 'Kirkland' && trackName == 'Structure' ? 'Fabric' :
                this.table.userGroup == 'Casino' && trackName == 'Alteration' ? 'Primary Assemblage' : 'Fills');
        $('legend#legendIntensity').text(this.table.userGroup == 'Rio' && (trackName == 'Minor Mineralization' || trackName == 'Major Mineralization') ? 'Crystal size(mm)' :
            this.table.userGroup == 'CleanAir' && trackName == 'Colour' ? 'Shade' : 'Intensity');

        //get the track itself
        let track = table.tracks.find(o => o.niceName == trackName);
        if (track != null) {
            //enable drawing on it if not locked
            if (!DigitalCoreTable.settings.isLocked) {
                track._openHandlers.forEach(f => {
                    f(track);
                });
            }

            $('input#filterFillsByName').val('');// reset filter for fills
            $('div#ribbonContainer').css('visibility', DigitalCoreTable.settings.isLocked ? 'hidden' : 'visible');
            //handling the select track for type interval mode
            let arr = [];
            for (let i = 1; i < this.trackGroups[this.selectedTrackName].length + 1; i++)
                arr.push('Track' + i);
            this._addOptions($('div#menuLogging select#individualTrackTypeIntervalMode'), arr);
            $('div#menuLogging tr#rowTypeIntervalMode').toggle(track.isAccessoryTrack);

            //assign it to global parameter
            this.selectedIntervalTrack = track;
            this._triggerCancelUpdate();

            this._setDefault();
            this.clearFields();
            this.clearTrackFields();
            this._extendedParametersElementsHandler();

            if (trackName == 'HIRES' && table.getCurrentLayoutName() == 'CLASSIFICATION' || table.isClassificationSetting)
                track.fills = table.classifiers;
            else if (trackName == 'HIRES' && table.getCurrentLayoutName() == 'XRD' || table.isXrdSetting) {
                track.fills = this.table.fills.filter(o => o.Group == 'RESERVED' && o.Name == 'xrd');
                $('input#offsetXRD').val(1);
                if (table.mode == 'striplog' && table.parentTable !=null)
                    table.parentTable.veinAddon.offsetXRD = 1
                else
                    table.veinAddon.offsetXRD = 1;
            }
            else if (track.fills.length == 0)//might be after fills load from file
                track.fills = table.fills.filter(o => o.Group == track.niceName);
            track.action_slide({ tblReference: this.table });
            $('div#sampleTrackExtension').toggle(track.isSampleTrack);
            if (track.isSampleTrack)
                $('input#indexoffset').val(1);
            if (track.constructor.name == 'LithologyTrack') {
                this._populateContacts(track);
                $('#lithologyGeneral').toggle(!this.table.isOilSandsLayout);
                $('#lithologySuncor').toggle(this.table.isOilSandsLayout);
                this._populatePercentage();
            }
            else {
                $('table#intervalTracksHolderXRD').toggle(trackName == 'HIRES' && table.getCurrentLayoutName() == 'XRD' || table.isXrdSetting)
                $('div#descriptionTrack').toggle(table.descriptionTracks.some(o => o.name == trackName));
                $('div#intervalTracksHolder').toggle(table.descriptionTracks.every(o => o.name != trackName));
                $('table#topBottomTable').toggle(table.descriptionTracks.every(o => o.name != trackName));
                $('div#descriptionDiv').toggle(table.descriptionTracks.every(o => o.name != trackName));
                $('#sampleTrackExtension').toggle(track.isSampleTrack);
                //extension for kirkland
                let condition1 = table.userGroup == 'Kirkland' || table.userGroup == 'Generation' || table.userGroup == 'Detour';
                let condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name).endsWith('Structure') && _getBaseNameFromAccessoryTrackName(track.name) != 'Structure';
                $('table#intervalTracksHolderKirklandStructure').toggle(condition1 && condition2);
                condition2 = track.name == 'Majors' || track.name == 'Minors' || track.name == 'Major Rock Types' ||
                    track.name.includes('Minor Rock Types');
                $('table#intervalTracksHolderKirklandMajors').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Vein';
                $('table#intervalTracksHolderKirklandVein').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Structure';
                $('table#intervalTracksHolderKirklandStructure2').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && (_getBaseNameFromAccessoryTrackName(track.name) == 'Structure' || _getBaseNameFromAccessoryTrackName(track.name) == 'Alteration' || _getBaseNameFromAccessoryTrackName(track.name) == 'Mineralization') || (track.name=='Majors' || track.name == 'Minors')
                $('div#importIntervalsDiv').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && (_getBaseNameFromAccessoryTrackName(track.name) == 'Mineralization');
                $('table#intervalTracksHolderKirklandMineralization').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && (_getBaseNameFromAccessoryTrackName(track.name) == 'Alteration');
                 $('table#intervalTracksHolderKirklandAlteration').toggle(condition1 && condition2);
                //extension for Rio
                condition1 = table.userGroup == 'Rio';
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name).endsWith('Mineralization');
                $('table#intervalTracksHolderRioStructure').toggle(condition1 && condition2);
                //extension for CleanAir
                condition1 = table.userGroup == 'CleanAir';
                condition2 = track.isAccessoryTrack;
                let condition3 = _getBaseNameFromAccessoryTrackName(track.name) == 'Structure';
                $('table#intervalTracksHolderCleanAirStructure').toggle(condition1 && condition2 && condition3);
                condition3 = _getBaseNameFromAccessoryTrackName(track.name) == 'Alteration';
                $('table#intervalTracksHolderCleanAirAlterationStructure').toggle(condition1 && condition2 && condition3);
                condition3 = _getBaseNameFromAccessoryTrackName(track.name) == 'Magsus';
                $('table#intervalTracksHolderCleanAirMagsusStructure').toggle(condition1 && condition2 && condition3);
               
                //extension for Casino
                condition1 = table.userGroup == 'Casino';
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Structure';
                $('table#intervalTracksHolderCasinoStructure').toggle(condition1 && condition2);
                condition3 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Alteration';
                $('table#intervalTracksHolderCasinoAlteration').toggle(condition1 && condition3);
                $('fieldset#intervalFillsFldst2').toggle(condition1 && condition3);
                if (condition1 && condition3)
                    $('legend#accFillLegend2').text('Overprinting Assemblage')
                //$('table#intervalTracksHolderLogger').toggle(condition1 && (condition2 || condition3 || track.name == 'Lithology'));

                //extension for Upper Beaver
                condition1 = table.userGroup == 'UpperBeaver' || table.userGroup == 'Agnico_AK';
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Mineralization';
                $('table#intervalTracksHolderUpperBeaverMineralization').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Vein';
                $('table#intervalTracksHolderUpperBeaverVein').toggle(condition1 && condition2);
                //condition1 = table.userGroup == 'UpperBeaver' || table.userGroup == 'Agnico_AK';
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Structure';
                $('table#intervalTracksHolderUpperBeaverStructure').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Alteration';
                $('table#intervalTracksHolderUpperBeaverAlteration').toggle(condition1 && condition2);

                //extension for Barrick
                condition1 = table.userGroup.toLowerCase().startsWith('barrick');
                condition2 = track.name == 'MajorLith' || track.name == 'MinorLith';
                $('table#intervalTracksHolderBarrickMajorLith').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Mineralization';
                $('table#intervalTracksHolderBarrickMineralization').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Alteration';
                $('table#intervalTracksHolderBarrickAlteration').toggle(condition1 && condition2);
                condition2 = track.isAccessoryTrack && _getBaseNameFromAccessoryTrackName(track.name) == 'Structure';
                $('table#intervalTracksHolderBarrickStructure').toggle(condition1 && condition2);
                condition2 = track.name == 'Au Prediction';
                $('table#intervalTracksHolderBarrickAuPrediction').toggle(condition1 && condition2);
            }
            if (this.table.descriptionTracks.some(o => o.name == trackName))
                this._populateDescription(trackName);

            //show the div
            this._populateFills(track);
            this._populateAbundance(track);
            this._populateTextures(track);
            this._addOptions($('select#selectLogger'), table.loggers.map(o => o.Logger));
            switch (table.userGroup) {
                case 'Kirkland':
                    this._populateKirklandExtended(track);
                    break;
                case 'Casino':
                    this._populateCasinoExtended(track);
                    break;
                case 'UpperBeaver': case 'Agnico_AK':
                    this._populateUpperBeaverExtended(track);
                    break;
                case 'Barrick': case 'barrick-training':
                    this._populateBarrickExtended(track);
                    break;
                case 'CleanAir':
                    this._populateCleanAirExtended(track);
                    break;
                default: break;
            }
            //we show the last logger
            $('select#selectLogger').val(this.selectedLogger || this._getLastLogger(track));
        }
    }

    /*Update top bottom inputs when user finishes drawing*/
    _updateTopBottomDepth(start,stop, track) {
        $('div#menuLogging input#intervalTop').val(start);
        $('div#menuLogging input#intervalBottom').val(stop);
        $('div#menuLogging input#intervalTotalLength').val(this._roundTo2(stop - start));

        if (track.isAccessoryTrack) {
            let subtrack = Number(track.name.slice(-1));
            $('div#menuLogging select#individualTrackTypeIntervalMode').val('Track' + (subtrack+1))
        }

    }

    _updateOrEditInterval(intervalData, isTopBottomClicked = false) {
        let dt = intervalData;
        if (dt == null) {
            dt = {};
            dt.track = this.selectedIntervalTrack;
        }
        if (dt.track == 'HIRES') {
            dt.interval.timing.Name = $('input#xrdLabel').val();
            dt.tbl.viewer.raiseEvent('update_vein_from_context', {
                description: dt.interval.description,
                //labelName: $('input#xrdLabel').val(),
                veinId: dt.interval.id
            });

        }
        else {
            let fill = dt.fill;
            let secondFill = null;
            let fillSelected = $('div#menuLogging table#tableLithology tr.selected');
            let sfs = $('div#menuLogging table#tableLithology2 tr.selected');
            if (fillSelected.length > 0) {
                fill = /*dt.track*/this.selectedIntervalTrack.fills[fillSelected.index()];
            }
            if (sfs.length > 0) {
                secondFill = /*dt.track*/this.selectedIntervalTrack.fills[sfs.index()];
                //update the Alteration1 interval
                let alt1Interval = table.intervalAddon.intervals.find(o => o.groupName == 'Alteration1' && o.start == dt.interval.start && o.stop == dt.interval.stop)
                alt1Interval.fill = secondFill;
            }

            let abundance = dt.interval ?.abundance;
            let abundanceSelected = $('div#menuLogging table#tableAbundance tr.selected');
            if (abundanceSelected.length > 0) {
                abundance = abundanceSelected.index();
            }
            let textureId = dt.interval ?.textureId;
            let textureSelected = $('div#menuLogging table#tableTexture tr.selected');
            if (textureSelected.length > 0) {
                textureId = /*dt.track*/this.selectedIntervalTrack.textures[textureSelected.index()].Id;
            }

            if (isTopBottomClicked) {
                //get some info
                let start = parseFloat($('div#menuLogging input#intervalTop').val());
                let stop = parseFloat($('div#menuLogging input#intervalBottom').val());
                let tn = this.selectedIntervalTrack.isAccessoryTrack ? this.selectedTrackName + (Number($('div#menuLogging select#individualTrackTypeIntervalMode').val().replace('Track', '')) - 1) : this.selectedTrackName;
                let typeTrackObj = {
                    isSampleTrack: this.selectedIntervalTrack.isSampleTrack,
                    isAccessoryTrack: this.selectedIntervalTrack.isAccessoryTrack,
                    isLithologyTrack: this.selectedIntervalTrack.isLithologyTrack
                }
                if (intervalData == null)//no interval was selected
                    this.table.intervalAddon.addInterval(this.table.wells[0].uwi, start, stop, fill.Id, tn, [], null, this.selectedIntervalTrack.textureFillsId, typeTrackObj, null, secondFill ?.Id, this.selectedIntervalTrack.percentage, true, this.selectedIntervalTrack.description, this.selectedIntervalTrack.extendedParametersObj);
                else {
                    let sourceInterval = _.cloneDeep(intervalData);
                    intervalData.start = start;
                    intervalData.stop = stop;
                    //register in history object
                    //put interval in historyObject
                    var masterTbl = table.parentTable || table;
                    //locate that interval in historyObject array
                    //if we got intervals affected by the change 
                    masterTbl.historyObject.push({ added: null, removed: [], splitted: [], updated: sourceInterval, action: 'Update' });
             
                }
                //set drawing tool to inactive
                var tablesArr = [];
                tablesArr.push(table);//push ct table by default
                if (table.mode == 'striplog' && table.parentTable != null)
                    tablesArr.push(table.parentTable)
                else {
                    if (table.childTablesAddon != null)
                        table.childTablesAddon.striplogChildren.forEach(sc => {
                            tablesArr.push(sc.table);
                        })
                }
                tablesArr.forEach(tbl => {
                    if (tbl.slideControlAddon.selectedIntervalTrack != null)
                        tbl.slideControlAddon.selectedIntervalTrack._deselectToolButton();
                })
                if (intervalData != null)
                    table.intervalAddon.saveWellIntervalsDelayed(this.table.wells[0].uwi, intervalData.groupName);

                //return;
            }
            else {
                //use selectedIntervalTrack to check if accessory or not, we might not have interval passed
                if (table.userGroup == 'Rio' && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName.endsWith('Mineralization')) {
                    dt.extendedParams = {
                        Style: $('div#menuLogging select#selectStyle').val(),
                        PCT: Number($('div#menuLogging input#pct').val()),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    };
                }
                else if (((table.userGroup == 'Kirkland' || table.userGroup == 'Detour') && (this.selectedIntervalTrack.name == 'Majors' || this.selectedIntervalTrack.name == 'Minors')) ||
                    (table.userGroup == 'Generation' && (dt.groupName == 'Major Rock Types' || dt.groupName.includes('Minor Rock Types')))) {
                    dt.extendedParams = {
                        Type: $('select#selectType').val(),
                        Alteration: $('select#selectAlteration').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if ((table.userGroup == 'Kirkland' || table.userGroup == 'Detour') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Vein') {
                    dt.extendedParams = {
                        VeinType: $("select#selectVeinType").val(),
                        VeinStyle: $('select#selectVeinStyle').val(),
                        VeinTCA: $("input#veintca").val(),
                        VeinPCT: $('input#veinpct').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if ((table.userGroup == 'Kirkland' || table.userGroup == 'Detour') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Structure') {
                    dt.extendedParams = {
                        CoreAngle: $('input#coreangle').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if ((table.userGroup == 'Kirkland' || table.userGroup == 'Detour') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Mineralization') {
                    dt.extendedParams = {
                        PCT: Number($('input#mineralizationPct').val()),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if ((table.userGroup == 'Kirkland' || table.userGroup == 'Detour') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName.endsWith('Structure')) {
                    dt.extendedParams = {
                        Mineralization1: $('select#selectMineralization1').val(),
                        Mineralization2: $('select#selectMineralization2').val(),
                        Texture1: $('select#selectTexture1').val(),
                        Texture2: $('select#selectTexture2').val(),
                        Amount1: $('select#selectAmount1').val(),
                        Amount2: $('select#selectAmount2').val(),
                        Angle: Number($('input#angle').val()),
                        Zone: $('select#selectZone').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    };
                }
                else if (table.userGroup == 'CleanAir' && this.selectedIntervalTrack.isAccessoryTrack && (this.selectedIntervalTrack.baseName == 'Structure' || this.selectedIntervalTrack.baseName == 'Alteration' || this.selectedIntervalTrack.baseName == 'Magsus')) {
                    dt.extendedParams = {
                        Mineralization1: $('select#selectCAMineralization1').val(),
                        Mineralization2: $('select#selectCAMineralization2').val(),
                        Shape: $('select#selectShape').val(),
                        Style: $('select#selectCAStyle').val(),
                        Roughness: $('select#selectRoughness').val(),
                        AngleAlpha: $('input#angleAlpha').val(),
                        AngleBeta: $('input#angleAlpha').val(),
                        Reading: $('input#reading').val(),
                        Conductivity: $('input#conductivity').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    };
                }
                else if (table.userGroup == 'Casino' && this.selectedIntervalTrack.isAccessoryTrack && (this.selectedIntervalTrack.baseName == 'Structure' || this.selectedIntervalTrack.baseName == 'Alteration')) {
                    dt.extendedParams = {
                        PrimaryOccurance: $('div#menuLogging select#selectPAO').val(),
                        OverprintingOccurance: $('div#menuLogging select#selectOAO').val(),
                        DominantAssemblage: $('div#menuLogging select#selectDA').val(),
                        OverprintingAssemblage: secondFill ?.Id,
                        StructIntvlAlphaTop: $('div#menuLogging input#alphaTop').val(),
                        StructIntvlAlphaBot: $('div#menuLogging input#alphaBottom').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    };
                }
                else if ((table.userGroup == 'UpperBeaver' || table.userGroup == 'Agnico_AK') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Mineralization') {
                    dt.extendedParams = {
                        Style: $('div#menuLogging select#selectUBMStyle').val(),
                        Colour: $('div#menuLogging select#selectUBMColour').val(),
                        Percent: $('div#menuLogging input#ubmPercent').val(),
                        Grainsize: $('div#menuLogging select#selectUBMGrainsize').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if ((table.userGroup == 'UpperBeaver' || table.userGroup == 'Agnico_AK') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Vein') {
                    dt.extendedParams = {
                        Percent: $('div#menuLogging input#ubvPercent').val(),
                        Angle: $('div#menuLogging input#ubvAngle').val(),
                        AngleAlpha: $('div#menuLogging input#ubvAngleAlpha').val(),
                        AngleBeta: $('div#menuLogging input#ubvAngleBeta').val(),
                        AngleGamma: $('div#menuLogging input#ubvAngleGamma').val(),
                        Width: $('div#menuLogging input#ubvWidth').val(),
                        Texture: $('div#menuLogging input#ubvTexture').val(),
                        MnzType: $('div#menuLogging select#selectUBVMnzType1').val(),
                        MnzType2: $('div#menuLogging select#selectUBVMnzType2').val(),
                        MnzType3: $('div#menuLogging select#selectUBVMnzType3').val(),
                        MnzType4: $('div#menuLogging select#selectUBVMnzType4').val(),
                        MnzPercent: $('div#menuLogging input#ubvMnz1').val(),
                        MnzPercent2: $('div#menuLogging input#ubvMnz2').val(),
                        MnzPercent3: $('div#menuLogging input#ubvMnz3').val(),
                        MnzPercent4: $('div#menuLogging input#ubvMnz4').val(),
                        Colour: $('div#menuLogging select#selectUBVColour').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if ((table.userGroup == 'UpperBeaver' || table.userGroup=='Agnico_AK') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Structure') {
                    dt.extendedParams = {
                        AngleAlpha: $('div#menuLogging input#ubsAngleAlpha').val(),
                        AngleBeta: $('div#menuLogging input#ubsAngleBeta').val(),
                        AngleGamma: $('div#menuLogging input#ubsAngleGamma').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if ((table.userGroup == 'UpperBeaver' || table.userGroup == 'Agnico_AK') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Alteration') {
                    dt.extendedParams = {
                        Style: $('div#menuLogging input#ubaStyle').val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if (table.userGroup.toLowerCase().startsWith('barrick') && (this.selectedIntervalTrack.name == 'MajorLith' || this.selectedIntervalTrack.name == 'MinorLith')) {
                    dt.extendedParams = {
                        Text1: $("input#textBarrickColour").val(),
                        Text2: $("select#selectBarrickGrainsize").val(),
                        Text3: $("select#selectBarrickTexture").val(),
                        Text4: $("select#selectBarrickTexture2").val(),
                        Text5: $("select#selectBarrickTexture3").val(),
                        Text6: $("select#selectBarrickTextureIntensity").val(),
                        Text7: $("select#selectBarrickTextureIntensity2").val(),
                        Text8: $("select#selectBarrickTextureIntensity3").val(),
                        Text9: $("input#textBarrickBedding").val(),
                        Text10: $("input#textBarrickClastComp").val(),
                        Text11: $("input#textBarrickClastRoundness").val(),
                        Text12: $("input#textBarrickClastSize").val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if (table.userGroup.toLowerCase().startsWith('barrick') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Structure') {
                    dt.extendedParams = {
                        Text1: $("select#selectBarrickStructureSubType").val(),
                        Text2: $("select#selectBarrickStructureInfill").val(),
                        IntNumber1: Number($("input#numBarrickStructureRoughness").val()),
                        IntNumber2: Number($("input#numBarrickStructureAlpha").val()),
                        IntNumber3: Number($("input#numBarrickStructureBeta").val()),
                        Text3: $("select#selectBarrickGangMineral1").val(),
                        Text4: $("select#selectBarrickGangMineral2").val(),
                        DoubleNumber: Number($("input#numBarrickStructureStructureThickness").val()),
                        Text5: $("input#textBarrickStructureConfidence").val(),
                        Text6: $("input#textBarrickStructureOrientationConfidence").val(),
                        IntNumber4: Number($("input#numBarrickStructureFoliationType").val()),
                        Text7: $("input#textBarrickStructureVeinType").val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if (table.userGroup.toLowerCase().startsWith('barrick') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Mineralization') {
                    dt.extendedParams = {
                        DoubleNumber: Number($("input#numBarrickMineralizationIntensity").val()),
                        Text1: $("input#textBarrickMineralizationMode").val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if (table.userGroup.toLowerCase().startsWith('barrick') && this.selectedIntervalTrack.isAccessoryTrack && this.selectedIntervalTrack.baseName == 'Alteration') {
                    dt.extendedParams = {
                        Text2: $("input#textBarrickAlterationMode").val(),
                        IntervalId: dt.id,
                        Uwi: dt.uwi
                    }
                }
                else if (table.userGroup.toLowerCase().startsWith('barrick') && this.selectedIntervalTrack.isSampleTrack &&
                    dt.sample != null && dt.sample.sharedFill != null &&
                    (dt.sample.sharedFill.Abbr == 'Std' || dt.sample.sharedFill.Name == 'Blk')) {
                    let url = DigitalCoreTable.prefixes.serverPrefix + '/api/BarrickSample/Save?';
                    let stdValue = $("select#selectSampleSt").val();
                    let blkValue = $("select#selectSampleBlk").val();
                    //find if we need to change the name only , if ,yes, then remove those records by filtering
                    table.sampleAddon.barrickSamples = table.sampleAddon.barrickSamples.filter(o => o.StartDepth != dt.start && o.StopDepth != dt.stop);
                    let barrickSamplesToWellTools = [];
                    if (stdValue != null && stdValue != '') {
                        table.sampleAddon.barrickSamples.push({
                            Id: uuidv1(),
                            StartDepth: dt.start,
                            StopDepth: dt.stop,
                            Name: stdValue,
                            Uwi: dt.uwi
                        })
                    }
                    if (blkValue != null && blkValue != '') {
                        table.sampleAddon.barrickSamples.push({
                            Id: uuidv1(),
                            StartDepth: dt.start,
                            StopDepth: dt.stop,
                            Name: blkValue,
                            Uwi: dt.uwi
                        })
                    }
                    //convert to wt
                    table.sampleAddon.barrickSamples.forEach(bs => {
                        barrickSamplesToWellTools.push({
                            'Id': bs.Id,
                            'StartDepth': bs.StartDepth,
                            'StopDepth': bs.StopDepth,
                            'Name': bs.Name,
                            'Uwi': bs.Uwi
                        })
                    })
                    let p = fetch(url, {
                        method: 'post',
                        headers: { 'Content-Type': 'text/json' },
                        body: JSON.stringify(barrickSamplesToWellTools)
                    })
                        .then(function (response) {
                            if (!response.ok) {
                                confirm('Problem occured during assigning sample ' + response.message)
                            }
                            else {
                                confirm('Sample assigned successfully')
                            }
                        });
                    return;
                }
                table.viewer.raiseEvent('update_interval_from_context', {
                    top: parseFloat($('div#menuLogging input#intervalTop').val()),
                    bottom: parseFloat($('div#menuLogging input#intervalBottom').val()),
                    description: $('div#menuLogging textarea#intervalDescription').val(),
                    intervalId: dt.id || dt.interval.id,
                    fill: fill,
                    abundance: abundance,
                    textureId: textureId
                })
            }
            //sync the tables
            this.table.intervalAddon.intervalDrawing.onIntervalDrawn();
        }
    }

    /*Using the page up/page down scrolls through the intervals on selected track , if no interval clicked, then it starts
     from beginning, otherwise, from clicked interval till end*/
    scrollThroughIntervals(isScrollDown) {
        if (this.selectedIntervalTrack == null)
            return;
        let nextInterval = null;
        let prevInterval = null;
        let filteredIntervals = [];
        if (this.selectedIntervalTrack.isAccessoryTrack) {
            for (let i = 0; i < this.trackGroups[this.selectedTrackName].length; i++) {
                filteredIntervals.push(...table.intervalAddon.intervals.filter(o => o.groupName == (this.selectedTrackName+i)))
            }
        }
        else {
            filteredIntervals = table.intervalAddon.intervals.filter(o => o.groupName == this.selectedTrackName);
        }
        if (isScrollDown) {
            if (this.selectedInterval != null) {
                //get next one
                let index = filteredIntervals.indexOf(this.selectedInterval);
                if (index != -1 && (index + 1 <= filteredIntervals.length)) {
                    //nextInterval = filteredIntervals[index + 1];
                    this.scrollingIndex = index + 1;
                }
                if (index + 1 > filteredIntervals.length)
                    this.scrollingIndex = 0;//reset
            }
            nextInterval = filteredIntervals[this.scrollingIndex];
            this.populateIntervalEditFields({ interval: nextInterval, isEdit: false, track: this.selectedIntervalTrack });
            //increase the scrolling index
            this.scrollingIndex = this.scrollingIndex + 1 > filteredIntervals.length ? 0 : this.scrollingIndex + 1;
        }
        else {
            if (this.selectedInterval != null) {
                //get next one
                let index = filteredIntervals.indexOf(this.selectedInterval);
                if (index != -1 && (index - 1 >= 0)) {
                    //prevInterval = filteredIntervals[index - 1];
                    this.scrollingIndex = index - 1;
                }
                if (index - 1 < 0)
                    this.scrollingIndex = filteredIntervals.length-1;//reset
            }
            prevInterval = filteredIntervals[this.scrollingIndex];
            this.populateIntervalEditFields({ interval: prevInterval, isEdit: false, track: this.selectedIntervalTrack });
            //increase the scrolling index
            this.scrollingIndex = this.scrollingIndex - 1 < 0 ? filteredIntervals.length - 1 : this.scrollingIndex - 1;
        }
    }

    clearFields() {
        $('div#menuLogging input:not([class*=notToBeEmptied])').val('');
        $('div#menuLogging textarea').val('');
        $('div#menuLogging select:not([class*=notToBeEmptied])').val('');
        $('div#menuLogging fieldset table tbody tr').removeClass('selected');
    }

    clearTrackFields() {
        $('div#menuLogging input#intervalTop').val('');
        $('div#menuLogging input#intervalBottom').val('');
        $('div#menuLogging input#intervalTotalLength').val('');
        $('div#menuLogging select#individualTrackTypeIntervalMode').val('');
        $('table[id^=intervalTracksHolder] input, table[id^=intervalTracksHolder] select').val('');
        $('div#menuLogging textarea').val('');
        //remove extendedParametersObj from track
        this.selectedIntervalTrack.extendedParametersObj = {};
        $('table[id^=intervalTracksHolder] input:not([id="offsetXRD"]):not([id="chkIsLabelVisibleBarrickAuPredict"]),table[id^=intervalTracksHolder] select').trigger('change');
        //deselect the interval  
        /*Part for handling the scrolling stuff*/
        //need to restore the color of scrolled selected interval
        if (table.parentTable != null)
            table.parentTable.slideControlAddon.tableInstances.forEach(tbl => {
                tbl.deselectDecoratedInterval(tbl.slideControlAddon.selectedInterval || tbl.slideControlAddon.previousSelectedInterval);
                //tbl.slideControlAddon.scrollingIndex = 0;
                //tbl.slideControlAddon.selectedInterval = null;
            })
        else
        this.tableInstances.forEach(tbl => {
            tbl.deselectDecoratedInterval(tbl.slideControlAddon.selectedInterval || tbl.slideControlAddon.previousSelectedInterval);
            //tbl.slideControlAddon.scrollingIndex = 0;
            //tbl.slideControlAddon.selectedInterval = null;
        })
    }

    populateIntervalEditFields(arg) {
        var addon = this;
        this.selectedInterval = arg.interval;
        this.clearFields();
        //if xrd point
        $('table#editXrdTable').toggle(arg.track == 'HIRES')
        if (arg.track == 'HIRES') {
            $('input#xrdLabel').val(arg.interval.timing.Name);
            $('div#intervalEditDiv').show();
            $('table#topBottomTable').hide();
            $('div#descriptionDiv').hide();
            $('input#offsetXRD').hide();
            //make slide a different color to show it is in edit mode
            $('div#menuLogging').find("fieldset, textarea, input:not(.legendColorFill)").each(function () {
                $(this).css('background-color', 'rgb(41 158 195)');
            });
            $('div#menuLogging button#btnUpdateEdit').data({ interval: arg.interval, tbl: arg.tblReference, track: 'HIRES' });
        }
        else {
            addon.isEditMode = arg.isEdit == null || arg.isEdit;

            //we can get here in edit or just click to show info
            if ((arg.isEdit == null || arg.isEdit) && arg.interval != null) {
                $('div#intervalEditDiv').show();
                //make slide a different color to show it is in edit mode
                $('div#menuLogging').find("fieldset, textarea, input:not(.legendColorFill)").each(function () {
                    $(this).css('background-color', 'rgb(41 158 195)');
                });
                //$('div#menuLogging button#btnUpdateEdit').data({ interval: arg.interval, tbl: arg.tblReference, track: arg.track });
            }
            if (arg.interval != null) {
                //let's select the interval by highlighting for all the table instances
                this.tableInstances.forEach(tbl => {
                    tbl.decorateSelectedInterval(arg.interval, tbl.slideControlAddon.previousSelectedInterval);
                    //set previousSelectedInterval to arg.interval
                    tbl.slideControlAddon.previousSelectedInterval = arg.interval;
                })
                //assign data to button in order to keep it
                $('div#menuLogging button#btnUpdateEdit').data({ interval: arg.interval, tbl: arg.tblReference, track: arg.track });

                $('div#menuLogging input#intervalTop').val(arg.interval.start.toFixed(4));
                $('div#menuLogging input#intervalTotalLength').val(this._roundTo2(arg.interval.stop - arg.interval.start));
                $('div#menuLogging input#intervalBottom').val(arg.interval.stop.toFixed(4));
                $('div#menuLogging textarea#intervalDescription').val(arg.interval.description);

                //that selected fill should be stored in selected fill for the track
                $('div#menuLogging table#tableLithology tr#fill' + (arg.interval.fill.Order - 1)).addClass('selected');
                //addon.selectedIntervalTrack.currentTile = arg.interval.fill;
                //$('#btnNormal').trigger('click');

                $('div#menuLogging table#tableAbundance tr#abun' + arg.interval.abundance).addClass('selected');
                //$('div#menuLogging select#selectLogger').val(arg.interval.loggedBy || this.selectedLogger || this._getLastLogger(arg.track));
                if (arg.interval.isAccessoryTrack) {
                    //get the value to typeInterval select
                    let num = Number(arg.interval.groupName.slice(-1)) + 1;
                    $('select#individualTrackTypeIntervalMode').val('Track' + num)
                }
                if (arg.interval.lithologyExtended != null && table.userGroup != 'Casino') {
                    //find second fill and get its order to show as selected
                    let secondFill = table.fills.find(o => o.Id == arg.interval.lithologyExtended.Fill2);
                    if (secondFill != null)
                        $('div#menuLogging table#tableLithology2 tr#fill_b' + (secondFill.Order - 1)).addClass('selected');
                    $('div#menuLogging table#tablePercentage tr#perc' + (arg.interval.lithologyExtended.Percentage / 10)).addClass('selected');
                }
                let textureFound = arg.track.textures.find(o => o.Id == arg.interval.textureId);
                if (textureFound != null)
                    $('div#menuLogging fieldset#intervalTextureFldst table#tableTexture tr#texture' + (textureFound.Order - 1)).addClass('selected');

                //extended properties
                if (table.userGroup == 'Rio' && arg.interval.extendedParams != null) {
                    $('div#menuLogging select#selectStyle').val(arg.interval.extendedParams.Style);
                    $('div#menuLogging input#pct').val(arg.interval.extendedParams.PCT);
                }
                else if ((table.userGroup == 'Kirkland' || table.userGroup == 'Detour') && arg.interval.extendedParams != null) {
                    $('div#menuLogging select#selectMineralization1').val(arg.interval.extendedParams.Mineralization1);
                    $('div#menuLogging select#selectMineralization2').val(arg.interval.extendedParams.Mineralization2);
                    $('div#menuLogging select#selectTexture1').val(arg.interval.extendedParams.Texture1);
                    $('div#menuLogging select#selectTexture2').val(arg.interval.extendedParams.Texture2);
                    $('div#menuLogging select#selectAmount1').val(arg.interval.extendedParams.Amount1);
                    $('select#selectAmount2').val(arg.interval.extendedParams.Amount2);
                    $('div#menuLogging select#selectZone').val(arg.interval.extendedParams.Zone);
                    $('div#menuLogging input#angle').val(arg.interval.extendedParams.Angle);
                    $('div#menuLogging input#coreangle').val(arg.interval.extendedParams.CoreAngle);
                    $('div#menuLogging select#selectType').val(arg.interval.extendedParams.Type);
                    $('div#menuLogging select#selectAlteration').val(arg.interval.extendedParams.Alteration);
                    $('div#menuLogging select#selectAlterationStyle').val(arg.interval.extendedParams.Alteration);
                    $('div#menuLogging select#selectVeinType').val(arg.interval.extendedParams.VeinType);
                    $('div#menuLogging select#selectVeinStyle').val(arg.interval.extendedParams.VeinStyle);
                    $('div#menuLogging input#veinpct').val(arg.interval.extendedParams.VeinPCT);
                    $('div#menuLogging input#veintca').val(arg.interval.extendedParams.VeinTCA);
                    $('div#menuLogging input#mineralizationPct').val(arg.interval.extendedParams.PCT);
                }
                else if (table.userGroup == 'CleanAir' && arg.interval.extendedParams != null) {
                    $('div#menuLogging select#selectCAMineralization1').val(arg.interval.extendedParams.Mineralization1);
                    $('div#menuLogging select#selectCAMineralization2').val(arg.interval.extendedParams.Mineralization2);
                    $('div#menuLogging select#selectShape').val(arg.interval.extendedParams.Shape);
                    $('div#menuLogging select#selectCAStyle').val(arg.interval.extendedParams.Style);
                    $('div#menuLogging select#selectRoughness').val(arg.interval.extendedParams.Roughness);
                    $('div#menuLogging input#angleAlpha').val(arg.interval.extendedParams.AngleAlpha);
                    $('div#menuLogging input#angleBeta').val(arg.interval.extendedParams.AngleBeta);
                    $('div#menuLogging input#reading').val(arg.interval.extendedParams.Reading);
                    $('div#menuLogging input#conductivity').val(arg.interval.extendedParams.Conductivity);
                }
                else if (table.userGroup == 'Casino' && arg.interval.extendedParams != null) {
                    $('div#menuLogging select#selectPAO').val(arg.interval.extendedParams.PrimaryOccurance);
                    $('div#menuLogging select#selectOAO').val(arg.interval.extendedParams.OverprintingOccurance);
                    $('div#menuLogging select#selectDA').val(arg.interval.extendedParams.DominantAssemblage);
                    $('div#menuLogging input#alphaTop').val(arg.interval.extendedParams.StructIntvlAlphaTop);
                    $('div#menuLogging input#alphaBottom').val(arg.interval.extendedParams.StructIntvlAlphaBot);
                    //find second fill and get its order to show as selected
                    let secondFill = table.fills.find(o => o.Id == arg.interval.extendedParams ?.OverprintingAssemblage);
                    if (secondFill != null)
                        $('div#menuLogging table#tableLithology2 tr#fill_b' + (secondFill.Order - 1)).addClass('selected');
                }
                else if ((table.userGroup == 'UpperBeaver' || table.userGroup == 'Agnico_AK') && arg.interval.extendedParams != null) {
                    $('div#menuLogging select#selectUBMStyle').val(arg.interval.extendedParams.Style);
                    $('div#menuLogging input#ubaStyle').val(arg.interval.extendedParams.Style);
                    $('div#menuLogging select#selectUBMColour').val(arg.interval.extendedParams.Colour);
                    $('div#menuLogging select#selectUBVColour').val(arg.interval.extendedParams.Colour);
                    $('div#menuLogging input#ubmPercent').val(arg.interval.extendedParams.Percent);
                    $('div#menuLogging select#selectUBMGrainsize').val(arg.interval.extendedParams.Grainsize);
                    $('div#menuLogging input#ubvPercent').val(arg.interval.extendedParams.Percent);
                    $('div#menuLogging input#ubvAngle').val(arg.interval.extendedParams.Angle);
                    $('div#menuLogging input#ubvAngleAlpha').val(arg.interval.extendedParams.AngleAlpha);
                    $('div#menuLogging input#ubvAngleBeta').val(arg.interval.extendedParams.AngleBeta);
                    $('div#menuLogging input#ubvAngleGamma').val(arg.interval.extendedParams.AngleGamma);
                    $('div#menuLogging input#ubsAngleAlpha').val(arg.interval.extendedParams.AngleAlpha);
                    $('div#menuLogging input#ubsAngleBeta').val(arg.interval.extendedParams.AngleBeta);
                    $('div#menuLogging input#ubsAngleGamma').val(arg.interval.extendedParams.AngleGamma);
                    $('div#menuLogging input#ubvWidth').val(arg.interval.extendedParams.Width);
                    $('div#menuLogging input#ubvTexture').val(arg.interval.extendedParams.Texture);
                    $('div#menuLogging select#selectUBVMnzType1').val(arg.interval.extendedParams.MnzType);
                    $('div#menuLogging select#selectUBVMnzType2').val(arg.interval.extendedParams.MnzType2);
                    $('div#menuLogging select#selectUBVMnzType3').val(arg.interval.extendedParams.MnzType3);
                    $('div#menuLogging select#selectUBVMnzType4').val(arg.interval.extendedParams.MnzType4);
                    $('div#menuLogging input#ubvMnz1').val(arg.interval.extendedParams.MnzPercent);
                    $('div#menuLogging input#ubvMnz2').val(arg.interval.extendedParams.MnzPercent2);
                    $('div#menuLogging input#ubvMnz3').val(arg.interval.extendedParams.MnzPercent3);
                    $('div#menuLogging input#ubvMnz4').val(arg.interval.extendedParams.MnzPercent4);
                }
                else if (table.userGroup.toLowerCase().startsWith('barrick') && arg.interval.extendedParams != null) {
                    $('div#menuLogging input#textBarrickColour').val(arg.interval.extendedParams.Text1);
                    $('div#menuLogging select#selectBarrickGrainsize').val(arg.interval.extendedParams.Text2);
                    $('div#menuLogging select#selectBarrickTexture').val(arg.interval.extendedParams.Text3);
                    $('div#menuLogging select#selectBarrickTexture2').val(arg.interval.extendedParams.Text4);
                    $('div#menuLogging select#selectBarrickTexture3').val(arg.interval.extendedParams.Text5);
                    $('div#menuLogging select#selectBarrickTextureIntensity').val(arg.interval.extendedParams.Text6);
                    $('div#menuLogging select#selectBarrickTextureIntensity2').val(arg.interval.extendedParams.Text7);
                    $('div#menuLogging select#selectBarrickTextureIntensity3').val(arg.interval.extendedParams.Text8);
                    $('div#menuLogging input#textBarrickBedding').val(arg.interval.extendedParams.Text9);
                    $('div#menuLogging input#textBarrickClastComp').val(arg.interval.extendedParams.Text10);
                    $('div#menuLogging input#textBarrickClastRoundness').val(arg.interval.extendedParams.Text11);
                    $('div#menuLogging input#textBarrickClastSize').val(arg.interval.extendedParams.Text12);
                    $('div#menuLogging input#numBarrickMineralizationIntensity').val(arg.interval.extendedParams.DoubleNumber);
                    $('div#menuLogging input#textBarrickMineralizationMode').val(arg.interval.extendedParams.Text1);
                    $('div#menuLogging input#textBarrickAlterationIntensity').val(arg.interval.extendedParams.Text1);
                    $('div#menuLogging input#textBarrickAlterationMode').val(arg.interval.extendedParams.Text2);
                    $('div#menuLogging select#selectBarrickStructureSubType').val(arg.interval.extendedParams.Text1);
                    $('div#menuLogging select#selectBarrickStructureInfill').val(arg.interval.extendedParams.Text6);
                    $('div#menuLogging input#numBarrickStructureRoughness').val(arg.interval.extendedParams.IntNumber1);
                    $('div#menuLogging input#numBarrickStructureAlpha').val(arg.interval.extendedParams.IntNumber2);
                    $('div#menuLogging input#numBarrickStructureBeta').val(arg.interval.extendedParams.IntNumber3);
                    $('div#menuLogging select#selectBarrickStructureGangMineral1').val(arg.interval.extendedParams.Text3);
                    $('div#menuLogging select#selectBarrickStructureGangMineral2').val(arg.interval.extendedParams.Text4);
                    $('div#menuLogging input#numBarrickStructureStructureThickness').val(arg.interval.extendedParams.DoubleNumber);
                    $('div#menuLogging input#textBarrickStructureConfidence').val(arg.interval.extendedParams.Text5);
                    $('div#menuLogging input#textBarrickStructureOrientationConfidence').val(arg.interval.extendedParams.Text6);
                    $('div#menuLogging input#numBarrickStructureFoliationType').val(arg.interval.extendedParams.IntNumber4);
                    $('div#menuLogging input#textBarrickStructureVeinType').val(arg.interval.extendedParams.Text7);
                }
                else if (table.userGroup.toLowerCase().startsWith('barrick') && arg.interval.isSampleTrack) {
                    // select std/blk sample if exist
                    //show the std/blk if shared fill
                    $('table#sampleTrackQAQCBarrick').toggle(arg.interval.sample ?.sharedFill !=null);

                    let barrickSamplesFound = this.table.sampleAddon.barrickSamples.filter(o => o.StartDepth == arg.interval.start && o.StopDepth == arg.interval.stop);
                    if (barrickSamplesFound.length > 0) {
                        let std = barrickSamplesFound.find(bs =>table.fills.filter(o=>o.Group == 'Sample_St').some(samplefill=> samplefill.Name == bs.Name))
                        let blk = barrickSamplesFound.find(bs => table.fills.filter(o => o.Group == 'Sample_Blk').some(samplefill => samplefill.Name == bs.Name))
                        $('select#selectSampleSt').val(std?.Name);
                        $('select#selectSampleBlk').val(blk?.Name)
                    }
                }
            }
        }
    }
}
