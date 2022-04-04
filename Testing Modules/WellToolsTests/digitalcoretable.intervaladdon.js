var DigitalCoreTable = DigitalCoreTable || {};
/**
 * Class that adds support for drawing and displaying intervals.
 * To create a track just put the name in TrackNames_TrackTypes table and Layout table and the process will create it 
 * automatically. For accessory track , create it with appended digit to the name
 */
DigitalCoreTable.IntervalAddon = class  IntervalAddon{
    /**
     * Create and attach the addon
     * @param {DigitalCoreTable.Table} table 
     */
    constructor(table) {
        /**
        * The table this is attached to
        * @type {DigitalCoreTable.Table}
        */
        this.table = table;
        this.table.intervalAddon = this;        

        /**
         * The intervals are kept in an array
         * @type {Array.<DigitalCoreTable.Interval>}
         * @default []
         */  
        this.intervals = [];
        this.intervalSamples = [];
        this.accessories = [];// uwi,inervalid,abundance
        this.lithologiesExtended = []; //Fill2, percentage
        this.lithologyExtended = {};
        this._segmentIntervals = null;
        this.alterationTrackNames = []; // we need this in order to get the corre4spondent fills for them. Might be named different than 'Sample'
        this.lithologyTrackNames = []; // we need this in order to get the corre4spondent fills
        this.sampleAddon = null;
        //let sampleAddon = new DigitalCoreTable.SampleAddon(this.table, this);
        this.contactHelper = new DigitalCoreTable.ContactHelper(this.table);
        this.grainSizeHelper = new DigitalCoreTable.GrainSizeHelper(this.table);
        this.intervalDrawing = new DigitalCoreTable.IntervalDrawing(this);
        //we make a reference for the undo here
        this.undoAddon = new DigitalCoreTable.UndoAddon(this);
      
        /**
         * The interval tracks (lithology, alteration, etc)
         * One element = one track
         * @type {Array.<DigitalCoreTable.IntervalTrack>}
         */
        this.tracks = [];

        /*That event fires when there is an update from intervalTrack fired on accessory track*/
        this.table.viewer.addHandler('update_accessory_params', this._updateAccessory.bind(this)); //bind this needed to access the global variables of the class!!
        this.table.viewer.addHandler('update_interval_from_context', this._updateInterval.bind(this));        
        this.table.viewer.addHandler('update_description_track', this._updateDescriptionTrack.bind(this));
        this.table.viewer.addHandler('populate_lostcore', this.populateLC.bind(this));
        this.table.viewer.addHandler('load_intervals_from_xsl', this._loadIntervalsFromFile.bind(this));
        this.table.viewer.addHandler('load_fills_from_xsl', this._loadFillsFromFile.bind(this));
        this.table.viewer.addHandler('select_tablefill_from_id', this._selectTableFillFromId.bind(this));
        this.table.viewer.addHandler('build_description_tracks', this._buildDescriptionTracks.bind(this));

        this.fills = [];
        this.nameOfTrackBeingLeft = null;
        this._roundTo2 = num => +(Math.round(num + "e+2") + "e-2");
        this.isPopulateRule = false;// set from sample_addon in order to not regenerate numbers each time
        this._initialize();

        this._unsavedIntervalGroups = {}; // dictionary of groups of intervals that need to be saved. key is uwi+groupName ie: JANL002lithology. value  should be {uwi:string, groupName:string}
        this.onSaveTimer = setInterval(() => this.saveUnsavedIntervals(), 1000 * 45 * 1);

        window.addEventListener("beforeunload", () => {
            this.saveUnsavedIntervals();   
        });
    }

    _selectTableFillFromId(args) {
        //find the Sample window
        let rows = $('Iframe').contents().find('.tblMainFillsClass tr');
        if (rows.length > 0) {
            rows.each(function (r) {
                if (this.textContent == args.name) {
                    $(this).addClass('selected').siblings().removeClass('selected');
                    $(this).trigger('click'); // to select the tile
                }
            })
        }
    }

    _loadIntervalTracks(){
        let fillsP = this._loadFills();
        //let layoutsP = this._loadLayouts();
        let tableLayoutsP = this.table.loadLayoutsPromise;

        // not sure this is right? seems like im doing something dumb
        let allP = Promise.all([fillsP/*, layoutsP*/, tableLayoutsP]).then((d) => {
            let trackLayouts = this.table.tracklayouts;//d[1];
              //building LithologyTrack, we need to extract the names of all lithology tracks in current layout
              let lithologiesArr = [];
              let sampleArr = [];
              let simpleArr = [];
              this.table.layouts.forEach(layout => {
                  let lith = trackLayouts.find(o => o.TrackTypeName == 'Lithology').Names.split(';');
                  //include simple tracks and sample tracks, split them later
                  let simp = trackLayouts.find(o => o.TrackTypeName == 'Simple').Names.split(';');
                  let samp = trackLayouts.find(o => o.TrackTypeName == 'Sample').Names.split(';');
                  let alt = trackLayouts.find(o => o.TrackTypeName == 'Alteration').Names.split(';');
                  let dt = trackLayouts.find(o => o.TrackTypeName == 'Description');
                  let desc = dt != null ? trackLayouts.find(o => o.TrackTypeName == 'Description').Names.split(';') : [] ;
                  simpleArr.push.apply(simpleArr, layout.trackNames.filter(o => simp.some(l => l == o)));
                  //for kirkland and rio there shouldn't be lithologytrack , but simple track called lithology
                  //in order to distinguish between them check for Lithology layout name.
                  //If there is one, then there is LithologyTrack
                  if (layout.name == 'Lithology') {
                      lithologiesArr.push.apply(lithologiesArr, layout.trackNames.filter(o => lith.some(l => l == o)));
                      //need to remove it from simple
                      let i = simpleArr.indexOf('Lithology');
                      if (i != -1) 
                          simpleArr.splice(i, 1);
                  }

                  sampleArr.push.apply(sampleArr, layout.trackNames.filter(o => samp.some(l => l == o)));
                  let dsc = layout.trackNames.filter(o => desc.some(l => l == o));
                  dsc.forEach(ds => {
                      this.table.descriptionTracks.push({ name: ds, tracksForDescription: [] });
                  })
                  //this.table.descriptionTracks.push.apply(this.table.descriptionTracks);
              })

              //we ensure there is only one name for not creating same track over and over
              lithologiesArr = [... new Set(lithologiesArr)];
              simpleArr = [... new Set(simpleArr)];
            sampleArr = [... new Set(sampleArr)];

            this._buildLithologyTracks(lithologiesArr);
            this._buildAccessoryTracks();

            this._buildSimpleTracks(simpleArr);
            this._buildDescriptionTracks(this.table.descriptionTracks);
            this._buildSampleTracks(sampleArr);

            //this is the default , will need to redesign 
            //this.table.tracksForDescription.push(...this.tracks.map(o => o.name));

            //build comments track
            //this._buildCommentsTrack(this);


              // add some callbacks for open and close
              let openHandler = t => {
                  this.intervalDrawing.activeTrack = t;
                  this.intervalDrawing.copyTrackSelected = null;
                  let tracksToDrawOn = this.tracks.filter(otherTrack => otherTrack.name.slice(0, -1) === t.name.slice(0, -1))
                  let trackNames = tracksToDrawOn.map(t => t.name);
                  let descNames = this.intervalDrawing.table.descriptionTracks.map(o => o.name);
                  this.intervalDrawing.enableDrawingOnTracks(trackNames.filter(name => !descNames.includes(name)));
              }
              let closeHandler = t => {
                  this.intervalDrawing.activeTrack = null;
                  this.table.setScreenPositionLock(false);
                  this.intervalDrawing.stopDrawingOnSegments();
              }
            let selectionHandler = (track, selectedString) => {
                let selectedTrack = this.tracks.find(t => t.name === selectedString);
                if (table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0)
                    table.childTablesAddon.striplogChildren[0].table.intervalAddon.intervalDrawing.copyTrackSelected = selectedTrack;
                //else
                    this.intervalDrawing.copyTrackSelected = selectedTrack;
              }
              this.tracks.forEach(track => {
                  track.addOpenHandler(openHandler);
                  track.addCloseHandler(closeHandler);
                  track.addSelectionHandler(selectionHandler);
              });

              // Add these tracks to the table's default tracks
              this.tracks.forEach(t => {
                  this.table.addDefaultTrack(t);
              });
          });
        return allP;
    }

    populateLC(arg) {
        this.lockIntervalsToImages(arg.track);
        this.unlockIntervalsToImages(arg.track);
        let addon = this;
        //look through intervals and append the LC on the gaps
        let gapsIntervals = this.table._getGapsInHiresTrack();
        //let gapsIntervals = [];
        ////remove the condition later if it always true!!!
        //let filteredImageGaps = _(table.getSegmentsOfType('HIRES')).orderBy(x => x.topDepth).value();
        //for (let i = 0; i < filteredImageGaps.length - 1; i++) {
        //    //stop should be same as start of next
        //    let stop = filteredImageGaps[i].baseDepth;
        //    let start = filteredImageGaps[i + 1].topDepth;
        //    if (start - stop > DigitalCoreTable.settings.lostCoreThreshold)
        //        gapsIntervals.push({ start: stop, stop: start });
        //}
        //we need to insert interval for each gapsinterval with LC value
        let lc = this.table.fills.find(o => o.Group == 'RESERVED' && (o.Name == 'Lost Core' || o.Name == 'LC'));
        if (lc != null) {
            let trs = [];
            trs.push(arg.track);
            if (arg.isAccessoryTrack) {
                let basename = _getBaseNameFromAccessoryTrackName(arg.track);
                let acctracks = addon.table.getAccessoryTracks(basename);
                if (acctracks.length > 0)
                    trs = acctracks;
            }
            gapsIntervals.forEach(gap => {
                trs.forEach(tr => {
                    addon.addInterval(arg.uwi, gap.start, gap.stop, lc.Id, tr, null, null, null, { isSampleTrack: arg.isSampleTrack, isAccessoryTrack: arg.isAccessoryTrack, isLithologyTrack: arg.isLithologyTrack });
                })
            });
            this.table.update();
            let childTable = this.table.childTablesAddon;
            if (childTable != null && childTable.striplogChildren.length > 0)
                childTable.striplogChildren[0].table.update();
        }
        else
            confirm('No such fill LC for ' + arg.track);
    }

    _loadIntervalsFromFile(arg) {
        if (arg.intervals.length > 0) {
            let addon = this;
            let args = arg;
            let uwi = table.wells[0].uwi;
            let totalIntervals = arg.intervals;
            let trackGroups = _.groupBy(/*arg.intervals*/totalIntervals, g => g.groupName);
            //var masterTbl = table.parentTable || table;

            Object.keys(trackGroups).forEach(group => {
                if (args.isReplaceMerge) {
                    let toDelete = addon.intervals.filter(o => o.groupName == group);
                    toDelete.forEach(i => {
                        let index = addon.intervals.indexOf(i);
                        addon.intervals.splice(index, 1);
                      //  masterTbl.historyObject.push({ added: null, removed: i, splitted: null, action: 'Remove' });
                    });
                } 
                this.intervalDrawing.onIntervalDrawn();

                //we need to go through addIntervalPLain process in order to store the accessories
                args.intervals.filter(t => t.groupName == group).forEach(interval => {
                    addon.addIntervalPlain2(interval, true);
                })
                    //addon.intervals = addon.intervals.filter(o => o.groupName != group);
                //addon.intervals = addon.intervals.concat(args.intervals.filter(t => t.groupName == group));
                //addon.intervals.push(...args.intervals.filter(t => t.groupName == group));
                addon.saveWellIntervalsDelayed(uwi, group);
                let track = table.tracks.find(o => o.name == group);
                if (track != null && track.isSampleTrack) {
                    table.sampleAddon._setRuleOff();
                   // table.viewer.raiseEvent('intervals_loaded', { intervals: addon.intervals, intervalSamples: [] });
                }
                    //addon.sampleAddon.intervalSamples = addon.intervalSamples;
                   // addon.sampleAddon._populateIntervalSamples(args.intervals);
            })
            this.intervalDrawing.onIntervalDrawn();
        }
    }

    _loadFillsFromFile(arg) {
        let args = arg;
        if (arg.fills.length > 0) {
            let uwi = table.wells[0].uwi;
            let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Fills/SaveAll?';
            let fills = arg.fills.map(o => {
                return {
                    'Id': uuidv1(),
                    'Name': o.Name,
                    'Abbr': o.Abbr,
                    'Color': o.Color,
                    'Width': 100,
                    'Height': 100,
                    'ResourceStretch': o.ResourceStretch == '' || o.ResourceStretch == 'null' ? null : o.ResourceStretch,
                    'Group': o.Group,
                    'Order': o.Order,
                    'GroupUserId':this.table.groupUserId
                }
            })
            let p = fetch(url, {
                method: 'post',
                headers: { 'Content-Type': 'text/json' },
                body: JSON.stringify(fills)
            })
                .then(d => {
                    var tablesArr = [];
                    tablesArr.push(table);//push ct table by default
                    let striplogTable = table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0 ? table.childTablesAddon.striplogChildren[0].table : null;

                    if (striplogTable != null) {
                        tablesArr.push(striplogTable);
                    }
                    tablesArr.forEach(tbl => {
                        tbl.fills.push(...fills);
                        fills.forEach(fill => {
                            let foundTrack = tbl.tracks.find(o => o.baseName == fill.Group || o.name == fill.Group);
                            if (foundTrack != null) {
                                foundTrack.fills.push(fill);
                                foundTrack.tiles.push(fill);
                            }
                        })
                    })
                });
            p.catch(d => {
                console.log('Cannot read from excel file => ' + d.message);
            });
            this.intervalDrawing.onIntervalDrawn();
        }
    }

    _updateDescriptionTrack(arg) {
        let dt = this.table.descriptionTracks.find(o => o.name == arg.descriptionTrackName);
        if (dt == null)
            return;
        if (arg.isChecked) {
            //add to array
            dt.tracksForDescription.push(arg.trackName);
        }
        else // remove from array
        {
            let i = dt.tracksForDescription.indexOf(arg.trackName);
            if (i != -1) 
                dt.tracksForDescription.splice(i, 1);
        }
        this.table.update();
    }

    _loadFills(){
        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Fills/Get';
        let p = fetch(url).then(d => d.json())
            .then(d => {
                this.table.fills.push.apply(this.table.fills, d); // fills are also global to the table
                this.fills = this.table.fills;
                this.table.viewer.raiseEvent('fills_loaded', { fills: this.fills });
            });
            p.catch(d => {
                console.log('Fills not found =>' + d.message);
            });
        return p;
    }

    _loadLayouts(){
        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/TrackLayout/Get';
        let addon = this;
        let p = fetch(url)
            .then(d => d.json())
            .then(d => {
                this.table.tracklayouts.push.apply(this.table.tracklayouts, d);
                //we need to store the sample tracks here
                //we need some global variable to hold names for the Sample tracks
                let samp = d.find(o => o.TrackTypeName == 'Sample').Names.split(';');
                let alt = d.find(o => o.TrackTypeName == 'Alteration').Names.split(';');
                let lith = d.find(o => o.TrackTypeName == 'Lithology').Names.split(';');
                addon.alterationTrackNames.push.apply(addon.alterationTrackNames, alt);
                addon.lithologyTrackNames.push.apply(addon.lithologyTrackNames, lith);
                this.table.sampleTrackNames.push.apply(this.table.sampleTrackNames, samp);
            });
            p.catch(d => {
                console.log('Track Layouts cannot be retrieved =>' + d.message);
            });            
        return p;
    }


    _buildLithologyTracks(lithologies) {
        let addon = this;
        lithologies.forEach(function (name) {
            let tiles = addon.fills.filter(f => f.Group.toUpperCase() == name.toUpperCase() || f.Group.toUpperCase() == name.toUpperCase() + '_TEX');
            let track = new DigitalCoreTable.LithologyTrack(name, tiles, addon.intervalDrawing.tools, addon.contactHelper.contacts);
            track.fills = addon.fills.filter(f => f.Group.toUpperCase() == name.toUpperCase());
            track.textures = addon.fills.filter(f => f.Group.toUpperCase() == _getCombinedNameForTexturesInDB(name.toUpperCase()));
            track.hasX = true;
            track.isLithologyTrack = true;
            track.width = DigitalCoreTable.settings.defaultTrackWidths.simple * 3;
            addon.tracks.push(track);
        })
    }

    _buildDescriptionTracks() {
        let addon = this;
        this.table.descriptionTracks.forEach(function (desc) {
            let track = new DigitalCoreTable.IntervalTrack(desc.name, null, addon.intervalDrawing.tools);
            track.width = DigitalCoreTable.settings.defaultTrackWidths.normal;
            addon.tracks.push(track);
        })
    }

    _buildSimpleTracks(simples) {
        let addon = this;
        simples.forEach(function (name) {
            let tiles = addon.fills.filter(f => f.Group.toUpperCase() == name.toUpperCase());
            let track = new DigitalCoreTable.IntervalTrack(name, tiles, addon.intervalDrawing.tools);
            track.fills = addon.fills.filter(f => f.Group.toUpperCase() == name.toUpperCase());
            track.width = DigitalCoreTable.settings.defaultTrackWidths.simple;
            if (name == 'Majors' || name == 'Minors')
                track.textures = addon.fills.filter(f => f.Group == name + '_TEX');
            if (name == 'Major Rock Types' || name.includes('Minor Rock Types'))
                track.textures = addon.fills.filter(f => f.Group == name + 'Rock_Types_TEX');
            addon.tracks.push(track);
        })
    }

    _buildSampleTracks(simples) {
        let addon = this;
        simples.forEach(function (name) {
            let tiles = addon.fills;

            let track = new DigitalCoreTable.IntervalTrack(name, tiles, addon.intervalDrawing.tools);
            //as we have general_sample group for sample fills and to maintain old fills for samples
            track.fills = addon.fills.filter(f => f.Group.toUpperCase() == name.toUpperCase()) || addon.fills.filter(f => f.Group== 'GENERAL_SAMPLE');
            track.width = DigitalCoreTable.settings.defaultTrackWidths.simple;
            track.isSampleTrack = true;
            addon.tracks.push(track);
        })
    }

    _updateAccessory(arg) {
        this.abundance = arg.abundance;
    }

    _updateInterval(arg) {
        //find the interval to be updated
        let updatedInterval = this.intervals.find(i => i.id == arg.intervalId);
        let alteration1UpdatedInterval = null;
        //in case of Alteration specific track in casin , we need to update top/bottom for Alteration1 as well
        if (table.userGroup == 'Casino' && updatedInterval.groupName == 'Alteration0')
            alteration1UpdatedInterval = this.intervals.find(i => i.start == updatedInterval.start && i.stop == updatedInterval.stop &&
                i.groupName == 'Alteration1');
        if (updatedInterval != null) {
            updatedInterval.start = arg.top;
            updatedInterval.stop = arg.bottom;
            updatedInterval.description = arg.description;
            updatedInterval.fill = arg.fill;
            updatedInterval.abundance = this.abundance = arg.abundance;
            updatedInterval.textureId = arg.textureId;
            if (updatedInterval.extendedParams != null) 
                updatedInterval.extendedParams.IntervalId = updatedInterval.id;
            this.onIntervalChange(updatedInterval, false);
            this.saveWellIntervalsDelayed(updatedInterval.uwi, updatedInterval.groupName);
            if (updatedInterval.isSampleTrack) {
                this.table.viewer.raiseEvent('renumber_samples', null);
            }
            this.update();
            if (table.childTablesAddon != null && table.childTablesAddon.striplogChildren.length > 0) {
                table.childTablesAddon.striplogChildren[0].table.intervalAddon.intervals = this.intervals;
                table.childTablesAddon.striplogChildren[0].table.intervalAddon.update();
            }
        }
        if (alteration1UpdatedInterval != null) {
            //only top/bottom change matters for alteration1
            alteration1UpdatedInterval.start = arg.top;
            alteration1UpdatedInterval.stop = arg.bottom;
            this.onIntervalChange(alteration1UpdatedInterval, false);
            this.saveWellIntervalsDelayed(alteration1UpdatedInterval.uwi, alteration1UpdatedInterval.groupName);
            if (updatedInterval.isSampleTrack) {
                this.table.viewer.raiseEvent('renumber_samples', null);
            }
            this.update();
        }
    }

    /*Builing accessory tracks by determining accessory names from Layout table where name suffixes with digit
     * and applying different settings. For oil sands(default) tracks there is no texture selection, the texture comes with fill
     * but there are intensities
     */
    _buildAccessoryTracks() {
        let accessoryTracks = table.getAccessoryTracks(); // tracks that have digit as suffix
        let addon = this;
        accessoryTracks.forEach(accessoryTrack => {
            let baseName = _getBaseNameFromAccessoryTrackName(accessoryTrack);
            let upperCaseBaseName = baseName.toUpperCase();
            //we filter the fills by the base name and _TEX suffix as well
            //the names could contain space, therefore in table the group name is underscore instead of space, so we need to replace

            let tiles = this.fills.filter(t => t.Group.toUpperCase() == upperCaseBaseName ||
                    t.Group.toUpperCase() == _getCombinedNameForTexturesInDB(upperCaseBaseName));
            let track = new DigitalCoreTable.IntervalTrack(accessoryTrack, tiles, this.intervalDrawing.tools);
            track.fills = this.fills.filter(t => t.Group.toUpperCase() == upperCaseBaseName);
            track.textures = this.fills.filter(t => t.Group.toUpperCase() == _getCombinedNameForTexturesInDB(upperCaseBaseName));
            //let's get structure names out of tracklayouts
            let isStructureName = this.table.tracklayouts.find(o => o.TrackTypeName == 'Structure').Names.split(";").some(nm => nm == baseName);
            //let isOilSandsStructureTrack = baseName == 'Structure' && addon.table.isOilSandsLayout;
            let isOilSandsStructureTrack = isStructureName && addon.table.isOilSandsLayout;

            track.width = DigitalCoreTable.settings.defaultTrackWidths.mini / 1.3;
            track.spaceToAdjacentTrack = track.name.slice(-1) == '0' ? DigitalCoreTable.settings.spaceBetween : 0;
            //get last digit to see if it is the first item in a group then use group name
            track.niceName = accessoryTrack.slice(-1) == '0' ? baseName : '';
            track.baseName = baseName;
            track.isAccessoryTrack = true;
            track.isAlterationTrack = addon.alterationTrackNames.some(tn => tn == track.niceName);
            if (addon.table.userGroup == 'CleanAir') {
                track.intensities = baseName == 'Alteration' ? DigitalCoreTable.lineIntensities_3c :
                    baseName == 'Magsus' ? DigitalCoreTable.lineIntensities_3c :
                        baseName == 'Colour' ? DigitalCoreTable.lineIntensities_3b : DigitalCoreTable.lineIntensities_3;
            }
            else if (addon.table.userGroup == 'Casino' && track.isAlterationTrack)
                track.intensities = [];
            else
                track.intensities = track.isAlterationTrack ? addon.table.userGroup == 'Kirkland' || addon.table.userGroup == 'Generation' ?
                    DigitalCoreTable.lineIntensities_3c : addon.table.userGroup == 'Detour' ? DigitalCoreTable.lineIntensities_4 : DigitalCoreTable.lineIntensities_7 :
                    addon.table.userGroup == 'Rio' && baseName.endsWith('Mineralization') ? DigitalCoreTable.lineIntensities_7_a : baseName == 'Mineralization' ? addon.table.userGroup == 'Generation' ? DigitalCoreTable.lineIntensities_6 : DigitalCoreTable.lineIntensities_5 : isOilSandsStructureTrack ? DigitalCoreTable.lineIntensities_3 : isStructureName ? addon.table.userGroup == 'Detour' ? DigitalCoreTable.lineIntensities_4 : DigitalCoreTable.lineIntensities_3 : baseName == 'Ichnofossils' ? DigitalCoreTable.lineIntensities_5_a : DigitalCoreTable.lineIntensities_3;
            if (addon.table.userGroup.toLowerCase().startsWith('barrick'))
                track.intensities = baseName == 'Structure' || baseName == 'Mineralization' ? [] : baseName == 'Alteration' ? DigitalCoreTable.lineIntensities_6_barrick : [];
            if ((addon.table.userGroup == 'UpperBeaver' || addon.table.userGroup == 'Agnico_AK') && baseName == 'Mineralization')
                track.intensities = [];
            else if ((addon.table.userGroup == 'UpperBeaver' || addon.table.userGroup == 'Agnico_AK') && (baseName == 'Alteration' || baseName == 'Structure'))
                track.intensities = DigitalCoreTable.lineIntensities_3d;
            this.tracks.push(track);
        });  

    }

    _initialize(){        
        let intervalAddon = this;
        let table = intervalAddon.table;
        table.addUpdateHandler(() => this.update());  
        table.addLoadHandlers(this.preload.bind(this));       
        //table.addLoadHandlers(this.load.bind(this));               
        this.sampleAddon = new DigitalCoreTable.SampleAddon(this.table, this); 
        new DigitalCoreTable.ImporterHelperAddon(this.table);
    }         
    
    /**
     * Takes the interval object from welltools and turns it into the one we use here
     * @param {object} wtInterval 
     */
    _fromWellToolsInterval(wtInterval){        
        let w = wtInterval;
        let fill = this.fills.find(f => wtInterval.Value === f.Id || wtInterval.Value.toLowerCase() === f.Id);
        let interval = new DigitalCoreTable.Interval(w.Id, w.Uwi, w.Start/*this._roundTo2(w.Start)*/, w.Stop/*this._roundTo2(w.Stop)*/, fill, w.GroupName);
        interval.subPoints = wtInterval.SubPoints != null ? wtInterval.SubPoints.map(s => {return {depth: s.Depth, value: s.Value}}) : null;
        interval.contact = this.contactHelper.contacts.find(c => c.id === wtInterval.ContactId);
        interval.abundance = w.Abundance;
        interval.textureId = w.Texture_FillsId;
        interval.description = w.Description;
        interval.isSampleTrack = this.table.sampleTrackNames.some(o => o == w.GroupName);
        interval.isAlterationTrack = this.alterationTrackNames.some(o => o == w.GroupName);
        interval.isLithologyTrack = this.lithologyTrackNames.some(o => o == w.GroupName);
        interval.startTubeIndex = w.StartTubeIndex;
        interval.stopTubeIndex = w.StopTubeIndex;
        interval.startImageY = w.StartImageY;
        interval.stopImageY = w.StopImageY;
        interval.loggedBy = w.LoggedBy;
        interval.dateInserted = w.DateInserted;
        interval.extendedParams = w.ExtendedParameters;
        interval.lithologyExtended = w.LithologyExtended;
        if (w.IntervalSample != null) {
            //sample object
            interval.sample = {};
            let sharedFill = this.table.fills.find(o => o.Id == w.IntervalSample.SharedFillId);

            interval.sample.idx = w.IntervalSample.SampleNumber;
            interval.sample.sharedFill = sharedFill;
            interval.sample.prefix = w.IntervalSample.TrackName == 'Dean Stark' ? 'DS' : w.IntervalSample.TrackName == 'Soluble Ion' ? 'SI' : '';
            interval.sample.name = w.IntervalSample.Name;
        }
        return interval;
    }


    _fromWellToolsAccessories(accessory) {
        return {
            uwi: accessory.Uwi,
            intervalId: accessory.IntervalId,
            abundance: accessory.Abundance,
        };
    }

    _loadWellAccessories(well) {
        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Accessory/Get?uwi=' + well.uwi
        let p = fetch(url).then(d => d.json())
            .then(d => {
                let loadedAccessories = d.map(x => this._fromWellToolsAccessories(x));
                this.accessories.push.apply(this.accessories, loadedAccessories);
            });
        p.catch (d => {
                console.log('No accessories for ' + well.uwi + '=>' + d.message);
            });
        return p;
    }

    _loadAutoLithologyFromParentTable() {
        if (this.table.mode == 'striplog')
            this.table.excelLithology = this.table.parentTable.excelLithology;
    }

    _loadAutoLithologyFromServer(well) {
        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Excel/Get?uwi=' + well.uwi;
        let p = fetch(url).then(d => d.json())
            .then(d => {
                this.table.excelLithology.push.apply(this.table.excelLithology, d); // sampling rules are also global to the table
                //this.intervalSamples = this.table.excelLithology;
            });
        p.catch(d => {
            console.log('Cannot read from excel file => ' + d.message);
        });
        return p;
    }

    _executeAutoLithology(well) {
        //console.time("Loading auto lithology");

        if (this.table.parentTable != null) {
            //console.log('autolithology loaded from parent');
            this._loadAutoLithologyFromParentTable();
        }
        else {
            //console.log('autolithology loaded from server');
            let d = this._loadAutoLithologyFromServer(well);
        }
        //console.timeEnd("Loading auto lithology");

        //console.time('autolithology')
        //let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Excel/Get?uwi=' + well.uwi;
        //let p = fetch(url).then(d => d.json())
        //    .then(d => {
        //        this.table.excelLithology.push.apply(this.table.excelLithology, d); // sampling rules are also global to the table
        //        console.timeEnd('autolithology')

        //        //this.intervalSamples = this.table.excelLithology;
        //    });
        //p.catch (d => {
        //        console.log('Cannot read from excel file => ' + d.message);
        //    });
        //return p;
    }

    _loadLoggers() {
        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/LoggerGroup/Get';
        let p = fetch(url).then(d => d.json())
            .then(d => {
                this.table.loggers.push.apply(this.table.loggers, d); // sampling rules are also global to the table
            });
        p.catch(d => {
            console.log('Cannot load loggers =>' + d.message);
        });
        return p;
    }

    _loadIntervalSamples() {
        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Interval/GetAssignedSamples?uwi=' + table.wells[0].uwi;
        let p = fetch(url).then(d => d.json())
            .then(d => {
                this.table.intervalSamples.push.apply(this.table.intervalSamples, d); // sampling rules are also global to the table
                this.intervalSamples = this.table.intervalSamples;
            });
        p.catch (d => {
                console.log('No interval samples =>' + d.message);
            });
        return p;
    }

    //the function getting called after the layout and track names being determined, so we can detect here if the track is sample
    async _loadWellIntervals(well) {
        console.time("Loading well intervals");

        if (this.table.parentTable != null) {
            console.log('intervals loaded from parent');
            await this._loadWellIntervalsFromParentTable();
        }
        else {
            console.log('intervals loaded from server');
            let d = await this._loadWellIntervalsFromServer(well);
        }
        console.timeEnd("Loading well intervals");


       /*
        console.time("Loading well intervals");
        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Interval/Get?uwi=' + well.uwi
        let p = fetch(url).then(d => d.json())
            .then(d => {
                let loadedIntervals = d.map(x => this._fromWellToolsInterval(x));
                this.intervals.push.apply(this.intervals, loadedIntervals);
                console.timeEnd("Loading well intervals");
            });
            p.catch(d => {
                console.log('Intervals not found for ' + well.uwi + '=>') + d.message;
            });
        //url = DigitalCoreTable.prefixes.serverPrefix + '/api/Interval/GetAssignedSamples?uwi=' + well.uwi;
        //p = fetch(url).then(d => d.json())
        //    .then(d => {
        //        this.table.intervalSamples.push.apply(this.table.intervalSamples, d); // sampling rules are also global to the table
        //        this.intervalSamples = this.table.intervalSamples;
        //    });

        return p;
        */
    }

    _loadWellIntervalsFromParentTable() {
        if (this.table.mode == 'striplog')
            this.intervals = this.table.parentTable.intervalAddon.intervals;
    }

    _loadWellIntervalsFromServer(well) {
        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Interval/Get?uwi=' + well.uwi
        let p = fetch(url).then(d => d.json())
            .then(d => {
                let loadedIntervals = d.map(x => this._fromWellToolsInterval(x));
                this.intervals.push.apply(this.intervals, loadedIntervals);

                if (table.userGroup == 'Casino') {
                    loadedIntervals.filter(o => o.groupName == 'Alteration0').forEach(interval => {
                    let addedInterval = _.cloneDeep(interval);
                    addedInterval.id = uuidv1();
                    addedInterval.groupName = 'Alteration1';
                    addedInterval.extendedParams = null;
                    addedInterval.fill = table.fills.find(o => o.Id == interval.extendedParams?.OverprintingAssemblage);
                    this.intervals.push(addedInterval);
                    })
                }
            });
        p.catch(d => {
            console.log('Intervals not found for ' + well.uwi + '=>') + d.message;
        });
        //url = DigitalCoreTable.prefixes.serverPrefix + '/api/Interval/GetAssignedSamples?uwi=' + well.uwi;
        //p = fetch(url).then(d => d.json())
        //    .then(d => {
        //        this.table.intervalSamples.push.apply(this.table.intervalSamples, d); // sampling rules are also global to the table
        //        this.intervalSamples = this.table.intervalSamples;
        //    });

        return p;
    }

    saveWellIntervalsDelayed(uwi, groupName){
        this._unsavedIntervalGroups[uwi+groupName] = {uwi:uwi, groupName:groupName};
    }

    /**
     * Save (overwrite) intervals for a well
     * @param {string} uwi 
     */
    saveWellIntervals(uwi, groupName) {
        //in case of custom Alteration track in casino , don't save Alteration1, it is duplicate of Alteration0
        if (table.userGroup == 'Casino' && groupName == 'Alteration1')
            return;
        console.log('calling save');
        let addon = this;
        let wellIntervals = groupName != null ? this.intervals.filter(i => i.uwi === uwi && i.groupName === groupName)
            : this.intervals.filter(i => i.uwi === uwi);
        //need to foolproof for no fill, if fill swere accidentally recreated(different id)
        let wellToolsIntervals = wellIntervals.filter(o=>o.fill != null).map(i => i.toWellToolsInterval());
        let onFail = () => {
            confirm('Connection was lost. A recovery file is being downloaded. Please email this file to your Enersoft contact.');
            download(JSON.stringify(addon.intervals.map(i => i.toWellToolsInterval())), 'dumpIntervals.json', 'json');
        };

        // fix this
        let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Interval/SaveAll?uwi='+uwi+'&groupName='+groupName;
        let p = fetch(url, {
            method:'post',
            headers:{ 'Content-Type': 'text/json' },
            body: JSON.stringify(wellToolsIntervals)
        }).then(function (response) {                     
            if (!response.ok) {
                onFail();
            }
            else{
                let id = 'tempSaving';
                var nd = new Date(),
                    today = nd.getHours() + ":" + (nd.getMinutes() < 10 ? '0' + nd.getMinutes() : nd.getMinutes());
                let $elem = $('p.outinedtext');
                if ($elem.length != 0)
                    $elem.text('Last saved ' + groupName + ' @ ' + today);
                else {
                    let div = addon.table.createAnchoredControlDiv(id, OpenSeadragon.ControlAnchor.BOTTOM_LEFT);
                    d3.select(div)
                        .append('p')
                        .classed('outinedtext', true)
                        .text('Last saved ' + groupName + ' @ ' + today)
                        .style('opacity', 1);
                    //setTimeout(() => {
                    //    d3.select(div)
                    //        .transition()
                    //        .duration(1000)
                    //        .ease(d3.easeLinear)
                    //        .style('opacity',0)
                    //        .remove();
                    //}, 5000);
                }
            }
        }).catch((e) => {
            onFail();
        });
        return p;
    }    

   /**
    * Save (overwrite) accessories for a well
    * @param {string} uwi
   */
    saveAccessoryTracks(uwi, groupName) {
        let accessoriesToSave = this.accessories.filter(a => {
            let interval = this.intervals.find(i => i.id === a.intervalId);
            return interval != null && interval.groupName === groupName;
        });

        if (accessoriesToSave.length > 0) {
            let acc = accessoriesToSave.map(x => this._toAccessory(x));
            let url = DigitalCoreTable.prefixes.serverPrefix + '/api/Accessory/SaveAll?uwi=' + uwi+'&groupName='+groupName;
            let p = fetch(url, {
                method: 'post',
                headers: { 'Content-Type': 'text/json' },
                body: JSON.stringify(acc)
            });
            return p;
        }
    }
    
    /**
     * Remove interval
     * @param {DigitalCoreTable.Interval} interval 
     */
    removeInterval(interval, isNeedToSaveForUndo, dontUpdate){
        let i = this.intervals.indexOf(interval);
        if (i != -1) {
            // we need to track that removal inside table.historyObject
            //in case of lithology extended we store it
            let le = this.lithologiesExtended.find(g => g.IntervalId == interval.id);
            let removed = this.intervals.splice(i, 1);
            if (le != null) {
                removed[0].secondFillId = le.Fill2;
                removed[0].percentage = le.Percentage;
            }

            if (isNeedToSaveForUndo == null || isNeedToSaveForUndo) {
                let masterTbl = table.parentTable || table;
                masterTbl.historyObject.push({added : null, removed : removed[0], splitted:null, action:'Remove'});
            }
            //clear out descrption field
            if (table.parentTable != null)
                table.parentTable.slideControlAddon.clearTrackFields();
            else
                table.slideControlAddon.clearTrackFields();
        }
        if(!dontUpdate){
            this.table.update();
        }        
        this.saveWellIntervalsDelayed(interval.uwi, interval.groupName);
        if (interval.isSampleTrack) {
            this.table.viewer.raiseEvent('delete_sample_interval', {interval: interval, noUpdate: dontUpdate});
        }
    }

    /**
     * Function called from sampleaddon when sampling rule is being populated
     * @param {any} intervals
     */
    removeIntervals(intervals, isNeedToSaveForUndo) {
        if (intervals.length == 0)
            return;
        intervals.forEach(interval => {
            let i = this.intervals.indexOf(interval);
            if (i != -1) {
                this.intervals.splice(i, 1);
                if (isNeedToSaveForUndo == null || isNeedToSaveForUndo) {
                    let masterTbl = table.parentTable || table;
                    masterTbl.historyObject.push({ added: null, removed: i, splitted: null, action: 'Remove' });
                }
            }
        });
        this.table.update();
        this.saveWellIntervalsDelayed(intervals[0].uwi, intervals[0].groupName);
    }

    async preload() {
        //console.time('intervalpreload')
        let addon = this;
        let ps = this.table.wells.map(w => this._executeAutoLithology(w));
        let layoutsP = this._loadLayouts();

        let p = Promise.all([ps, layoutsP]);
        await p;
        await addon.load(); 
       // console.timeEnd('intervalpreload')
    }

    /**
     * Load the saved intervals and stores them in the intervals property
     * @returns {Promise} when the load is complete
     */
    async load() {
        //table.addLoadHandlers(this._loadIntervalTracks.bind(this));       
        //let ps = this.table.wells.map(w => this._executeAutoLithology(w));
        console.time('loading interval tracks')
        await this._loadIntervalTracks();
        console.timeEnd('loading interval tracks')
        await this._loadWellIntervals(this.table.wells[0]);
        //await this._loadQCRules(this.table.wells[0]);
        //this.table.wells.forEach(well => {
        //    await this._loadWellIntervals(well);
        //})
        //let ps = this.table.wells.map(w => this._loadWellIntervals(w));
        let ps1 = this.table.wells.map(w => this._loadWellAccessories(w));
        //let ps2 = this._loadIntervalSamples();
        //let ps3 = table.userGroup == 'Casino' ? this._loadLoggers() : [];
        let ps3 = this._loadLoggers();

        let p = Promise.all([/*...ps1,ps2*/,ps3/*,ps4,...ps5,...ps6*/]);   
        p.catch(d => {
            console.log('Cannot load intervals =>' + d.message);
        });
        await p;
        if (this.intervals.length > 0) {
            this.table.viewer.raiseEvent('intervals_loaded', { intervals: this.intervals, intervalSamples: this.intervalSamples });
        }    
    }

    _toAccessory(x) {
        return {
            'IntervalId': x.intervalId,
            'Uwi': x.uwi,
            'Abundance': x.abundance,
        };
    }

    getIntervalBeforeDepth(depth, uwi, groupName){
        let previousInterval = _(this.intervals)
            .filter(interval => interval.groupName === groupName && interval.uwi === uwi)
            .orderBy(interval => interval.start)
            // .find(interval => interval.start > depth);
            .findLast(interval => interval.stop < depth);
        return previousInterval;
    }

    getIntervalAfterDepth(depth, uwi, groupName){
        let nextInterval = _(this.intervals)
            .filter(interval => interval.groupName === groupName && interval.uwi === uwi)
            .orderBy(interval => interval.start)
            // .findLast(interval => interval.stop < depth);
            .find(interval => interval.start > depth);
        return nextInterval;
    }

    getIntervalAtDepth(depth, uwi, groupName){
        let nextInterval = _(this.intervals)
            .find(interval => interval.groupName === groupName && 
                interval.uwi === uwi &&((
                interval.start <= depth &&
                interval.stop >= depth) || ( table.mode == null &&
                    interval.start == interval.stop && depth >= interval.start - 0.01 && depth <= interval.start + 0.01) ||
                (table.mode == 'striplog' && interval.start == interval.stop && depth >= interval.start - 0.034 && depth <= interval.start + 0.034))
                );
        return nextInterval;
    }    

    getPointIntervalAtDepth(depth, uwi, groupName) {
        let nextInterval = _(this.intervals).filter(o => o.start == o.stop)
            .find(interval => interval.groupName === groupName &&
                interval.uwi === uwi &&
                interval.start >= depth - 0.014  // we take that as a debouncing value, may be changed in future                
            );
        return nextInterval;
    }

    /**
     * @param {any} interval
     */
    addIntervalPlain(interval, isNeedToSaveForUndo) {
        this.addInterval(
            interval.uwi,
            interval.start,
            interval.stop,
            interval.fill.Id,
            interval.groupName,
            interval.subPoints,
            interval.contact,
            interval.textureId,
            { isSampleTrack: interval.isSampleTrack, isAccessoryTrack: interval.isAccessoryTrack, isLithologyTrack: interval.isLithologyTrack },
            interval.sampleIdx,
            interval.secondFillId,
            interval.percentage,
            isNeedToSaveForUndo,
            interval.description);
    }

    /*Updated function to add already prepared interval.Especially for import!
     * /
     * @param {any} interval
     */
    addIntervalPlain2(interval, isNeedToSaveForUndo) {
        let shouldMerge = false;
        //if (interval.isSampleTrack) {
        //    //interval.sample = null;
        //    //we need to copy fill to interval's sharedFill
        //    let core = this.fills.find(v => v.Name == 'Core');
        //    //interval.sample.sharedFill = fill == core ? null : fill;
        //    //if (interval.groupName == 'Dean Stark')
        //    //    interval.sample.prefix = 'DS';
        //    //else if (interval.groupName == 'Soluble Ion')
        //    //    interval.sample.prefix = 'SI';
        //    //else
        //    //    interval.sample.prefix = '';
        //}

        this.intervals.push(interval);
        ////if interval is not sample then don't raise event
        //if (interval.isSampleTrack && !this.isPopulateRule && interval.sample == null)
        //    this.table.viewer.raiseEvent('renumber_samples', null);
        if (isNeedToSaveForUndo == null || isNeedToSaveForUndo) {
            //add it to master ct table
            let masterTbl = table.parentTable || table;
            masterTbl.historyObject.push({ added: interval, removed: [], splitted: [], updated: [], action: 'Add' });
        }

        if (interval.sample != null) {
            this.intervalSamples.push({ IntervalId: interval.id, SampleNumber: interval.sample.idx, Name: interval.sample.name, SharedFillId: interval.sample.sharedFill })
        }

        //saving lithology extended if exist
        if (interval.secondFillId != null) {
            this.lithologiesExtended.push({ IntervalId: interval.id, Fill2: secondFillId, Percentage: percentage })
        }
        //CHECK THIS?!
        //if (interval.extendedParams != null) {
        //    interval.extendedParams.IntervalId = interval.id;
        //    interval.extendedParams = _.cloneDeep(extendedParametersFeatures);
        //}

        this.onIntervalChange(interval, shouldMerge);
    }

    /**
     * @param {any} uwi
     * @param {any} start
     * @param {any} stop
     * @param {any} value
     * @param {any} groupName
     * @param {any} subPoints
     * @param {any} contact
     * @param {any} textureId
     * @param {any} isSampleTrack
     * @param {any} sampleIdx
     * @param {any} secondFillId
     * @param {any} percentage
     */
    addInterval(uwi, start, stop, value, groupName, subPoints, contact, textureId, typeTrackObj, sampleIdx, secondFillId, percentage, isNeedToSaveForUndo, desc,extendedParametersFeatures = null) {             
        //don't let zero interval to be saved
        if (start == stop && start == 0)
            return;
        let fill = this.fills.find(v => v.Id === value);
        let shouldMerge = false;
        //we calculate the image coordinates and the tubeindex to pass to interval class
        let interval = new DigitalCoreTable.Interval(uuidv1(), uwi, start/*this._roundTo2(start)*/, stop/*this._roundTo2(stop)*/, fill, groupName, sampleIdx);
        interval.loggedBy = /*table.userEmail?.split('@')[0]?.split('.').join(" ") || null*/$('select#selectLogger').val(); 
        interval.subPoints = subPoints;
        interval.contact = contact;
        interval.textureId = textureId;
        interval.isSampleTrack = typeTrackObj.isSampleTrack;
        interval.isLithologyTrack = typeTrackObj.isLithologyTrack;
        interval.isAccessoryTrack = typeTrackObj.isAccessoryTrack;
        interval.description = desc;
        interval.dateInserted = new Date().toJSON();
        if (interval.isSampleTrack) {
            interval.sample = { idx: sampleIdx, sharedFill: secondFillId };
            //we need to copy fill to interval's sharedFill
            let core = this.fills.find(v => v.Name == 'Core');
            //interval.sample.sharedFill = fill == core ? null : fill;
            if (groupName == 'Dean Stark')
                interval.sample.prefix = 'DS';
            else if (groupName == 'Soluble Ion')
                interval.sample.prefix = 'SI';
            else
                interval.sample.prefix = '';
        }

        this.intervals.push(interval); 
        //if interval is not sample then don't raise event
        if (interval.isSampleTrack && !this.isPopulateRule)
            this.table.viewer.raiseEvent('renumber_samples', {track: interval.groupName });
        if (isNeedToSaveForUndo == null || isNeedToSaveForUndo) {
            //add it to master ct table
            let masterTbl = table.parentTable || table;
            masterTbl.historyObject.push({added: interval, removed:[],splitted:[],updated:[], action:'Add' });
        }

        //saving lithology extended if exist
        if (table.userGroup != 'Casino' && secondFillId != null) {
            interval.lithologyExtended = { IntervalId: interval.id, Fill2: secondFillId, Percentage: percentage };
            //this.lithologiesExtended.push({ IntervalId: interval.id, Fill2: secondFillId, Percentage: percentage })
        }

        //for extended parameters
        if (extendedParametersFeatures != null) {
            extendedParametersFeatures.IntervalId = interval.id;
            interval.extendedParams = _.cloneDeep(extendedParametersFeatures);
        }

       this.onIntervalChange(interval,shouldMerge);
    }


    onIntervalChange(interval, shouldMerge){
        if (shouldMerge == undefined)
            shouldMerge = true;
        let uwi = interval.uwi;
        let start = interval.start;
        let stop = interval.stop;
        let groupName = interval.groupName;

        //put interval in historyObject
        var masterTbl = table.parentTable || table;
        //locate that interval in historyObject array
        //if we got intervals affected by the change 
        let historyObjectFoundRecord = masterTbl.historyObject.find(o => o.added == interval);
      
        // change any effected other intervals
        let wellIntervals = this.intervals.filter(i => i != interval && i.uwi === uwi && i.groupName === groupName);

        // ones to swallow
        let toDelete = wellIntervals.filter(i => start <= i.start && stop >= i.stop );
        toDelete.forEach(i => {
            let index = this.intervals.indexOf(i);
            this.intervals.splice(index, 1);
            if (historyObjectFoundRecord != null && historyObjectFoundRecord.removed !=null) {
                //add deleted intervals to removed
                historyObjectFoundRecord.removed.push(i);
            }
        });


        let toFixStart = wellIntervals.filter(i => start <= i.start && stop >= i.start && stop <= i.stop);
        toFixStart.forEach(i => {
            if (historyObjectFoundRecord != null && historyObjectFoundRecord.updated != null) {
                //add deleted intervals to removed
                historyObjectFoundRecord.updated.push(_.cloneDeep(i));
            }
            i.start = stop;
            i.correctSubPoints();
        });

        let toFixStop = wellIntervals.filter(i => start >= i.start && start <= i.stop && stop >= i.stop);
        toFixStop.forEach(i => {
            if (historyObjectFoundRecord != null && historyObjectFoundRecord.updated != null) {
                //add deleted intervals to removed
                historyObjectFoundRecord.updated.push(_.cloneDeep(i));
            }
            i.stop = start;
            i.correctSubPoints();
        });     

        let toSplit = wellIntervals.filter(i => start > i.start && stop < i.stop);
        toSplit.forEach(i => {            
            let above = new DigitalCoreTable.Interval(uuidv1(), uwi, i.start, start, i.fill, groupName);
            above.contact = i.contact;
            above.textureId = i.textureId;
            above.subPoints = i.subPoints;
            above.shortName = i.shortName;
            above.description = i.description;
            let below = i;
            //this is the case where interval drawn is in the middle, we need to check whether we spliut grain
            let foundLithExt = i.lithologyExtended;

            //let foundLithExt = this.lithologiesExtended.find(o => o.IntervalId == i.id);
            if (foundLithExt != null) {
                //add to lithologiesExtended with below id
                let newLithExtended = { Fill2: foundLithExt.Fill2, Percentage: foundLithExt.Percentage, IntervalId: above.id }
                above.lithologyExtended = newLithExtended;
                //this.lithologiesExtended.push(newLithExtended);
            }
            this.intervals.push(above);
            if (historyObjectFoundRecord != null && historyObjectFoundRecord.splitted!=null) {
                historyObjectFoundRecord.splitted.push(above);
                //in order to undo it, the below should be pushed to updated property in order to restore it later
                historyObjectFoundRecord.updated.push(_.cloneDeep(below));
            }

            below.start = stop;        
            above.correctSubPoints();
            below.correctSubPoints();
        });        



        if (interval.isAccessoryTrack) {
            //We add the accessories here
            this.accessories.push({ uwi: interval.uwi, intervalId: interval.id, abundance: this.abundance || interval.abundance });
            interval.abundance = interval.abundance || this.abundance;
        }
        // loop through and merge any 2 of the same next to each other

        if (shouldMerge) {
            toDelete = [];
            let ordered = _(this.intervals)
                .filter(i => i.groupName === interval.groupName)
                .orderBy(i => i.stop)
                .value();
            for (var i = 1; i < ordered.length; i++) {
                let previous = ordered[i - 1];
                let current = ordered[i];
                let tolerance = 0.001;
                let areRightNextToEachOther = Math.abs(current.start - previous.stop) <= tolerance;
                //check for lithologies extended as well as another condition
                //find the corresponding previous and current lithologies extended
                let prevLithExt = previous.lithologyExtended || null;
                let curLithExt = current.lithologyExtended || null;

                //let prevLithExt = this.lithologiesExtended.find(o => o.IntervalId == previous.id);
                //let curLithExt = this.lithologiesExtended.find(o => o.IntervalId == current.id);
                //skip in case no lithologies extended found
                let condition3 = false; // condition working in oil sands layout case
                if (this.table.isOilSandsLayout && previous.isLithologyTrack) {
                    if (prevLithExt == null || curLithExt == null)
                        continue;
                    else if (prevLithExt != null && curLithExt != null) {
                        //see if we need to merge or not by comparing the percentage and second fill and first one
                        condition3 = previous.fill === current.fill &&
                            prevLithExt.Fill2 === curLithExt.Fill2 && prevLithExt.Percentage === curLithExt.Percentage;
                    }
                }
                //condition to met for merging
                let condition1 = previous.fill === current.fill && previous.textureId === current.textureId;
                let condition2 = areRightNextToEachOther;
                let abundance_condition = true;

                //we need to check the intensity for accessory tracks as well
                if (previous.isAccessoryTrack && current.isAccessoryTrack) {
                    let prevAccTrack = this.accessories.find(o => o.intervalId == previous.id);
                    let curAccTrack = this.accessories.find(o => o.intervalId == current.id);
                    // they could be null
                    if (prevAccTrack != null && curAccTrack != null)
                     abundance_condition = prevAccTrack.abundance == curAccTrack.abundance;
                    }

                if ((prevLithExt == null && curLithExt == null && condition1 && condition2 && abundance_condition) || (condition3 && condition2)) {
                    current.start = previous.start;                    
                    let subPoints = [];
                    if(current.subPoints == null && previous.subPoints == null){
                        subPoints = null;
                    }
                    else{
                        if(previous.subPoints != null){
                            subPoints = subPoints.concat(previous.subPoints);
                        }     
                        else{
                            subPoints = subPoints.concat([{ depth: previous.start, value: DigitalCoreTable.settings.intervalXMax }, { depth: previous.stop, value: DigitalCoreTable.settings.intervalXMax}]);
                        }           
                        if(current.subPoints != null){
                            subPoints = subPoints.concat(current.subPoints);
                        }   
                        else{
                            subPoints = subPoints.concat([{ depth: current.start, value: DigitalCoreTable.settings.intervalXMax }, { depth: current.stop, value: DigitalCoreTable.settings.intervalXMax}]);
                        }
                    }                    
                    current.subPoints = subPoints;
                    toDelete.push(previous);
                }
            }
            toDelete.forEach(i => {
                let index = this.intervals.indexOf(i);
                this.intervals.splice(index, 1);
            });
        }
        this.saveWellIntervalsDelayed(/*uwi*/this.table.wells[0].uwi, groupName);
        //this.intervalDrawing.onIntervalDrawn();//sync between ct and striplog
    }

    _isNullorWhitespace(value){
        return !value;
    }

    setVisibleIntervalDepthsFromImageY(){
        let visibleIntervals = this.intervals.filter(x => x.startTubeIndex != null && x.startTubeIndex != '');
        visibleIntervals.forEach(interval => {
            this.setIntervalDepthFromImageY(interval);
        });
    }

    getSrcsForInterval(interval, segments, descriptionSegments){
        let srcs = [];
        let track = this.table.getTrackByName(interval.groupName);
        if(track == null){
            return [];
        }
        else if(this.table.striplogAddon != null){
            srcs = this._getSrcsForIntervalStriplog(interval, segments, descriptionSegments);
        }
        else if(track.isVisible){
            srcs = this._getSrcsForIntervalTraditional(interval, segments, descriptionSegments);
        }
        // Common to both striplog and traditional
        srcs.forEach(src => {
            src.track = track;
            src.fill = interval.fill;
            src.stroke = 'black';
            src.shortName = interval.fill != null ? interval.fill.Abbr : '';
            src.id = interval.id;
            src.texture = this.fills.find(f => f.Id == interval.textureId);
            let foundAcc = this.accessories.find(a => a.intervalId == interval.id);
            src.abundance = foundAcc != null ? foundAcc.abundance : this.abundance;
            //we support oil sands lithology track here to enter percentage and second fill in case they exist            
            //let foundLithExt = this.lithologiesExtended.find(a => a.IntervalId == interval.id);
            //src.secondFill = foundLithExt != null ? this.fills.find(f => f.Id == foundLithExt.Fill2) : null;
            //src.percentage = foundLithExt != null ? foundLithExt.Percentage : null;
            src.secondFill = interval.lithologyExtended != null ? this.fills.find(f => f.Id == interval.lithologyExtended.Fill2) : null;
            src.percentage = interval.lithologyExtended != null ? interval.lithologyExtended.Percentage : null;

            src.showStroke = !(src.interval.subPoints != null && src.interval.subPoints.length > 0);
           
            if(src.points.length === 0){
                src.points.push({ x: src.x + src.width, y:src.y });
                src.points.push({ x: src.x + src.width, y:src.y + src.height });
            }
        });
        return srcs;
    }

    _getSrcsForIntervalStriplog(interval, segments) {
        let addon = this;     
        let segmentIndex = _(segments).sortedIndexBy({topDepth: interval.start}, s => s.topDepth);
        segmentIndex = Math.min(segmentIndex, segments.length-1)        ;
        let segment = segments[segmentIndex];
        //let segment = segments.find(x => interval.start <= x.topDepth && interval.stop >= x.baseDepth);
        let src = {};
        src.segment = segment;            
        src.segments = [src.segment];
        src.trackTube = src.segment.trackTube;
        src.interval = interval;
        src.x = this.getCurvePlotXScale()(DigitalCoreTable.settings.intervalXMin);
        src.y = this.getCurvePlotYScale()(interval.start);
        src.width = table.striplogAddon.curvePlot.viewBoxLength;
        src.descriptionX = /*src.x*/0;
        src.descriptWidth = /*src.width*/0;//it wil be updated in striplogintervaladdon
        src.height = this.getCurvePlotYScale()(interval.stop) - this.getCurvePlotYScale()(interval.start);
        //see if it is from auto lithology         
        let autoLithology = addon.table.excelLithology.find(o => o.IntervalId == interval.id);
        if(autoLithology != null && autoLithology.GrainSizeReference <= DigitalCoreTable.grainLabels.length){
            src.width = DigitalCoreTable.grainLabels[autoLithology.GrainSizeReference].ratio * src.width;
        }
                        
        src.intervalGroupIndex = 0;
        src.intervalGroupLength = 1;
        src.intervalGroupIsFirst = true;
        src.intervalGroupIsLast = true; 
        src.clipPathId = null;
        src.points = [];
        if(interval.subPoints != null){
            interval.subPoints.forEach(subPoint => {
                let p = { 
                    x: this.getCurvePlotXScale()(subPoint.value), 
                    y: this.getCurvePlotYScale()(subPoint.depth),
                };
                src.points.push(p);
            });           
        }        

        return [src];
    }      

    _getSrcsForIntervalTraditional(interval, segments, descriptionSegments) {
        let addon = this;
        let intervalSrcs = [];        

        let filteredSegments = segments.filter(s => interval.start <= s.baseDepth && interval.stop > s.topDepth).sort(function (a, b) { return a.topDepth - b.topDepth });
        let filteredDescriptionSegments = null;
        if(descriptionSegments != null && descriptionSegments.length === segments.length){
            filteredDescriptionSegments = descriptionSegments.filter(s => interval.start <= s.baseDepth && interval.stop > s.topDepth);
        }


        for(let i = 0; i < filteredSegments.length; i++){
            let segment = filteredSegments[i];
            let src = {};
            intervalSrcs.push(src);
            src.segment = segment;             
            src.trackTube = segment.trackTube; 
            //src.segments = segment.trackTube.segments; 
            src.interval = interval;
            src.x = src.segment.x;
            src.y = Math.max(src.segment.y, src.segment.getYFromDepth(interval.start));
            if(filteredDescriptionSegments != null){
                let descriptionSegment = filteredDescriptionSegments[i];
                src.descriptionX = descriptionSegment.x;
                src.descriptWidth = descriptionSegment.width;
            }

            let autoLithology = addon.table.excelLithology.find(o => o.IntervalId == interval.id);
            src.width = autoLithology == null ? segment.width :
                autoLithology.GrainSizeReference <= DigitalCoreTable.grainLabels.length ?
                    DigitalCoreTable.grainLabels[autoLithology.GrainSizeReference].ratio * firstSegmentInterval.segment.width : firstSegmentInterval.segment.width;
            src.intervalGroupIndex = i;            
            src.intervalGroupLength = filteredSegments.length;
            src.intervalGroupIsFirst = i === 0;
            src.intervalGroupIsLast = i === filteredSegments.length - 1;
            src.points = [];

            src.clipPathId = src.segment.clipPathId;

            src.height = Math.min(segment.getYFromDepth(interval.stop), segment.y + segment.height) - src.y;

            if(interval.subPoints != null && interval.subPoints.length > 0){
                let xMin = DigitalCoreTable.settings.intervalXMin;
                let xMax = DigitalCoreTable.settings.intervalXMax;
                let subPoints = interval.subPoints;
                let segmentSubPoints = subPoints.filter(subPoint => subPoint.depth >= segment.getTopDepth() && subPoint.depth < segment.getBaseDepth());
                let previousPoint = _(subPoints).findLast(p => p.depth < segment.getTopDepth());                
                let nextPoint = _(subPoints).find(p => p.depth > segment.getBaseDepth());   

                if(previousPoint != null){
                    let p = {
                        x: segment.getXFromCustomScale(previousPoint.value, xMin, xMax),
                        y: segment.y
                    };
                    src.points.push(p);
                }

                segmentSubPoints.forEach(subPoint => {
                    let p = { 
                        x: segment.getXFromCustomScale(subPoint.value, xMin, xMax), 
                        y: segment.getYFromDepth(subPoint.depth) 
                    };
                    src.points.push(p);
                });    

                if(nextPoint != null){
                    let p = { 
                        x: segment.getXFromCustomScale(nextPoint.value, xMin, xMax), 
                        y: segment.y  + segment.height
                    };
                    src.points.push(p);          
                }              
            }
        }

        return intervalSrcs;
    }    


    getCurvePlotXScale() {
        let xMin = DigitalCoreTable.settings.intervalXMin;
        let xMax = DigitalCoreTable.settings.intervalXMax;
       return d3.scaleLinear()
            .domain([xMin, xMax])
            .range([0, 100])
    }

    getCurvePlotYScale() {
        return d3.scaleLinear()
            .domain([this.table.striplogAddon.getDisplayTop(), this.table.striplogAddon.getDisplayBase()])
            .range([0, 100]);
    }

    getIntervalSrcs(groupName) {   
        let intervalSrcs = [];
        let intervals = this.intervals;        
        let segments = this.table.getSegments();
        // let descriptionSegments = this.table.getSegmentsOfType('Description');        
        if(groupName === '*'){
            segments = segments;
        }        
        else if (groupName != null) {
            if (this._isString(groupName)){
                intervals = intervals.filter(interval => interval.groupName === groupName);
            }                
            else{
                // can we get rid of this condition?
                intervals = intervals.filter(interval => groupName.some(r => r.includes(interval.groupName)));                
            }                
        } 
        else{
            segments = segments.filter(x => x.trackTube.track.isVisible);
        }

        let segmentsByGroupName = _(segments).groupBy(segment => segment.getTrackName()).value();

        intervals.forEach(interval => {            
            let intervalTypeSegments = segmentsByGroupName[interval.groupName] || segmentsByGroupName[this.table.defaultImageTrack]; // just use rgb tracks on striplog
            var descriptionSegments = [];
            this.table.descriptionTracks.forEach(desctrack => {
                descriptionSegments.push(segmentsByGroupName[desctrack.name] || segmentsByGroupName[this.table.defaultImageTrack]); // just use rgb tracks on striplog
            })
            //let descriptionSegments = segmentsByGroupName['Description'] || segmentsByGroupName[this.table.defaultImageTrack]; // just use rgb tracks on striplog
            if(intervalTypeSegments != null) {
                let srcs = this.getSrcsForInterval(interval, intervalTypeSegments, descriptionSegments);
                Array.prototype.push.apply(intervalSrcs, srcs);
            }
        });   

        // prevent overlap from grey areas        
        // let groupedByTube = _(intervalSrcs).groupBy(x => x.trackTube.track.name + x.trackTube.getTubeIndex());//.orderBy(x => x.interval.depth).value();        
        // groupedByTube.forEach(group => {
        //     let tubeSrcs = _(group).orderBy(src => src.y + src.height).value();
        //     for(let i = 1; i < tubeSrcs.length; i++){
        //         let prev = tubeSrcs[i-1];
        //         let current = tubeSrcs[i];
        //         let prevY2 = prev.y + prev.height;
        //         let currentY2 = current.y + current.height;
        //         if(prevY2 > current.y){
        //             current.y = prevY2;
        //             current.height = Math.abs(current.y - currentY2);
        //         }
        //     }
        // });
        return intervalSrcs;
    }

    lockIntervalsToImages(groupName){
        if(!confirm('Locking intervals to images will delete any intervals drawn between core pieces.'))
            return;
        let orderedIntervals = _(this.intervals.filter(x => x.groupName === groupName))
            .orderBy(x => x.start)
            .value();
        let sortedSegments = _(this.table.getSegmentsOfType(groupName))
            .orderBy(x => x.getTopDepth());        

        for(let intervalIndex = 0; intervalIndex < orderedIntervals.length; intervalIndex++){
            let interval = orderedIntervals[intervalIndex];            
            interval.startTubeIndex = null;
            interval.startImageY = null;
            interval.stopTubeIndex = null;
            interval.stopImageY = null;

            let startSegment = sortedSegments.find(segment => segment.getBaseDepth() > interval.start);            
            if(startSegment != null){
                interval.startTubeIndex = startSegment.getTubeIndex();
                interval.startImageY = Math.max(Math.round(startSegment.depthToImageY(interval.start)), startSegment.imageY1);
                interval.startImageY = Math.min(interval.startImageY, startSegment.imageY2);
                interval.start = startSegment.imageYToDepth(interval.startImageY);
            }

            let stopSegment = sortedSegments.findLast(segment => segment.getTopDepth() < interval.stop);
            if(stopSegment != null){
                interval.stopTubeIndex = stopSegment.getTubeIndex();
                interval.stopImageY = Math.max(Math.round(stopSegment.depthToImageY(interval.stop)), stopSegment.imageY1);
                interval.stopImageY = Math.min(interval.stopImageY, stopSegment.imageY2);
                interval.stop = stopSegment.imageYToDepth(interval.stopImageY);
            }       
            
            //this.setIntervalDepthFromImageY(interval);
        }    
        
        let toRemove = orderedIntervals.filter(interval => {
            if(interval.startTubeIndex == null || interval.startImageY == null || interval.stopImageY == null || interval.stopTubeIndex == null)
                return true;
            if(interval.startTubeIndex === interval.stopTubeIndex && (interval.stopImageY - interval.startImageY) <= 0)
                return true;
            if(interval.startTubeIndex > interval.stopTubeIndex)
                return true;
            if(interval.start >= interval.stop)
                return true;
            return false;
        });            

        //toRemove.forEach(interval => {
        //    this.removeInterval(interval, false, true);
        //});
        

        this.update();
        this.saveWellIntervalsDelayed(this.table.wells[0].uwi, groupName);
    }  

    unlockIntervalsToImages(groupName){
        let intervals = this.intervals.filter(x => x.groupName === groupName);
        intervals.forEach(x => this.clearIntervalImageYFromDepth(x));        
        if(intervals.length > 0){
            this.saveWellIntervalsDelayed(this.table.wells[0].uwi, groupName);
        }        
    }

    clearIntervalImageYFromDepth(interval){
        interval.startTubeIndex = null;
        interval.startImageY = null;
        interval.stopTubeIndex = null;
        interval.stopImageY = null;
    }    

    setIntervalDepthFromImageY(interval, sortedSegments) {
        let oldStart = interval.start;
        let oldStop = interval.stop;
        interval.start = 0;
        interval.stop = 0;
        if(interval.startTubeIndex == null || interval.stopTubeIndex == null)
            return;
        sortedSegments = sortedSegments || _(this.table.getSegmentsOfType(interval.groupName))
            .orderBy(x => x.getTopDepth())
            .value();
        sortedSegments = _(sortedSegments);                        
                
        let startSegment = sortedSegments.find(x => {
            if(x.getTubeIndex() != interval.startTubeIndex){
                return false;
            }                            

            if(interval.startImageY >= x.imageY1 && interval.startImageY <= x.imageY2)
                return true;

            let intervalRect = new OpenSeadragon.Rect(0, interval.startImageY, 1, x.getTubeHeightPx() - interval.startImageY);
            if(interval.startTubeIndex === interval.stopTubeIndex){
                intervalRect.height = interval.stopImageY - interval.startImageY;
            }
            let segmentRect = new OpenSeadragon.Rect(0, x.imageY1, 1, x.imageY2 - x.imageY1);
            let intersection = segmentRect.intersection(intervalRect);
            return intersection != null && intersection.height > 0;
        });                
        // if our interval start falls within an existing segment
        if(startSegment != null){
            interval.start = Math.max(startSegment.getTopDepth(), startSegment.imageYToDepth(interval.startImageY));
        }
        // if not, does it overlap with another tube?
        else{
            startSegment = startSegment || sortedSegments.find(x => x.getTubeIndex() >= interval.startTubeIndex && x.getTubeIndex() <= interval.stopTubeIndex);
            if(startSegment != null){
                interval.start = startSegment.getTopDepth();
            }
        }
        
        let stopSegment = sortedSegments.findLast(x => {
            if(x.getTubeIndex() != interval.stopTubeIndex){
                return false;
            }          
            
            if(interval.stopImageY >= x.imageY1 && interval.stopImageY <= x.imageY2)
                return true;
            
            let intervalRect = new OpenSeadragon.Rect(0, 0, 1, interval.stopImageY);
            if(interval.startTubeIndex === interval.stopTubeIndex){
                intervalRect.height = interval.stopImageY - interval.startImageY;
            }

            let segmentRect = new OpenSeadragon.Rect(0, x.imageY1, 1, x.imageY2 - x.imageY1);
            let intersection = segmentRect.intersection(intervalRect);
            return intersection != null && intersection.height > 0;
        });                
        // if our interval stop falls within an existing segment
        if(stopSegment != null){
            interval.stop = Math.min(stopSegment.getBaseDepth(), stopSegment.imageYToDepth(interval.stopImageY));
        }
        // if not, does it overlap with another tube?
        else{
            stopSegment = stopSegment || sortedSegments.findLast(x => x.getTubeIndex() >= interval.startTubeIndex && x.getTubeIndex() <= interval.stopTubeIndex);
            if(startSegment != null){
                interval.stop = stopSegment.getBaseDepth();
            }
        }
        
        interval.start = Math.round(interval.start * 1000) / 1000;
        interval.stop = Math.round(interval.stop * 1000) / 1000;
    }

    /**
     * Update the interval elements on screen(position, dimensions, delete old, add new, etc).
     */
    update() {
        this.setVisibleIntervalDepthsFromImageY();
        if (this.table.striplogAddon == null) {
            this.intervalDrawing.drawAll();
            this.table.rotatedViewIntervalLabelAddon.update();
        } 
    }

    // Returns if a value is a string
    _isString(value) {
        return typeof value === 'string' || value instanceof String;
    }

    hiddenIncompleteExport(groupName){
        this.lockIntervalsToImages(groupName);
        let intervals = _(this.intervals.filter(interval => interval.groupName === groupName))
            .orderBy(interval => interval.start)
            .value();
        
        let s = 'Id,Start,Stop,Uwi,GroupName,StartTubeIndex,StopTubeIndex,StartImageY,StopImageY,Name,Abbr,Sample No\r\n'
        intervals.forEach((o,i) => {
            s += `${o.id},${o.start},${o.stop},${o.uwi},${o.groupName},${o.startTubeIndex},${o.stopTubeIndex},${o.startImageY},${o.stopImageY},${o.fill.Name},${o.fill.Abbr},${o.sample.idx || ''}\r\n`;
        });        
        download(s, this.table.wells[0].uwi + '_agatds.csv', 'csv');
    }

    saveUnsavedIntervals() {  
        try {
            Object.values(this._unsavedIntervalGroups).forEach(item => {
                console.log('Saving ' + item.uwi + ' ' + item.groupName);
                this.saveWellIntervals(item.uwi, item.groupName);
            });
        }
        catch{
            this.saveWellIntervals(table.wells[0].uwi, null);
        }
        this._unsavedIntervalGroups = {};
    }

    

    // testCapacity(){        
    //     let well = this.table.wells[0];
    //     let segments = well.getSegments();
    //     let start = _(segments).minBy(s => s.getTopDepth()).getTopDepth();
    //     let stop = _(segments).maxBy(s => s.getBaseDepth()).getBaseDepth();
        
    //     this.tracks.forEach(t => {
    //         let step = 0.1
    //         let i = 0;
    //         for(let depth = start; depth <= stop - step; depth+=step){
    //             i++;
    //             let value = i % 2 == 0 ? this.fills[0].Id : this.fills[1].Id;
    //             let textureId = i % 2 == 0 ? 'D0263BD1-4B11-4C29-9C37-62C95AE94930' : '5D43DE83-DFCF-47A8-81DD-E71CE5939E68';
    //             this.addInterval(well.uwi, depth, depth + step, value, t.name, null, null, textureId);
    //         }
    //     });
    //     this.update();
    // }

}