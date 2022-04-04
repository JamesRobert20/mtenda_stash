var DigitalCoreTable = DigitalCoreTable || {};
/**
 * An interval represents a from to depth value on a specific well. For example: 230m - 245m is sandstone
 */
DigitalCoreTable.Interval = class Interval{
    /**
     * Create an Interval
     * @param {string} id 
     * @param {string} uwi 
     * @param {number} start 
     * @param {number} stop 
     * @param {object} fill what this is an interval of (eg sand or shale)
     * @param {string} groupName track name
     * @param {string} sampleIdx number of sample if exists
     * @param {string} sharedFill id of fill for the sample in case shared
     */
    constructor(id, uwi, start, stop, fill, groupName, sampleIdx, sharedFill, samplePrefix) {
        /**
         * @type {string}
         */
        this.id = id;        
        /**
         * @type {string}
         */
        this.uwi = uwi;
         /**
         * @type {number}
         */
        this.start = start;
         /**
         * @type {number}
         */        
        this.stop = stop;
        /**
         * What this is an interval of (eg sand or shale).
         * @type {string} 
         */
        this.fill = fill;
        /**
         * Track name
         * @type {string}
         */
        this.groupName = groupName;
        /**
         * Sub points array of points like this { value: 0, depth: 0}. depth is depth. value is arbitrary currently
         * @type {Array.<Object>} array of subpoints for lithologies
         */
        this.subPoints = null;
        /**
         * One of: null, chills down, chills up, faulted, gradational, sharp, no contact, breccia
         * @type {string}
         */
        this.contact = null;

        this.textureId = null;

        this.shortName = ''; // on accessory track

        this.description = ''; // description for every interval stored in db
        this.startTubeIndex = null;
        this.stopTubeIndex = null;
        this.startImageY = null;
        this.stopImageY = null;

        /*
         * Specifies if we have appended digit meaning it is accessory track
         */
        this.isAccessoryTrack = groupName.slice(-1) >= '0' && groupName.slice(-1) <= '9';
        this.isSampleTrack = false;
        this.isAlterationTrack = false;
        this.isLithologyTrack = false;
        this.sample = null;//{ idx: sampleIdx, sharedFill: sharedFill, prefix: samplePrefix }; // this is an object that holds the sample number and the fillId in case it is shared sample. The default is Core
    }    

    _findSubpointValueAtDepth(p1, p2, depthN){
        // y = mx + b = value = m*depth + b
        let m = (p2.value - p1.value)/(p2.depth - p1.depth);
        let b = p1.value - m * p1.depth;
        let value = m * depthN + b;
        return value;
    }

    correctSubPoints(){
        if(this.subPoints == null)
            return;
        let newSubPoints = _(this.subPoints).filter(sp => this.start <= sp.depth && this.stop >= sp.depth)
            .orderBy(sp => sp.depth)
            .value();

        let beforeStart = _(this.subPoints).findLast(sp => sp.depth < this.start);        
        if(beforeStart != null){
            if(newSubPoints.length === 0){
                newSubPoints.unshift({ value: beforeStart.value, depth: this.start });
            }
            else{                
                let p2 = newSubPoints[0];
                let depthN = this.start;
                let valueN = this._findSubpointValueAtDepth(beforeStart, p2, depthN);
                newSubPoints.unshift({ value: valueN, depth: depthN });
            }
        }        
        let afterStart = _(this.subPoints).find(sp => sp.depth > this.stop);        
        if(afterStart != null){
            if(newSubPoints.length === 0){
                newSubPoints.push({ value: afterStart.value, depth: this.stop });
            }
            else{                
                let p1 = newSubPoints[newSubPoints.length-1];
                let depthN = this.stop;
                let valueN = this._findSubpointValueAtDepth(p1, afterStart, depthN);
                newSubPoints.push({ value: valueN, depth: depthN });
            }
        }                
        this.subPoints = newSubPoints;
    }
    
    // /**
    //  * Takes the interval object from welltools and turns it into the one we use here
    //  * @param {object} wtInterval 
    //  */
    // static fromWellToolsInterval(wtInterval){        
    //     let w = wtInterval;
    //     let interval = new DigitalCoreTable.Interval(w.Id, w.Uwi, w.Start, w.Stop, w.Value, w.GroupName);
    //     return interval;
    // }

    toWellToolsInterval(){
        return {
            'Id': this.id,
            'Uwi': this.uwi,
            'Value': this.fill.Id,
            'Start': this.start,
            'Stop': this.stop,
            'GroupName': this.groupName,
            'SubPoints': this.subPoints != null ? this.subPoints.map(s => {return { Depth: s.depth, Value: s.value };}):null,
            'ContactId': this.contact != null ? this.contact.id : null,
            'Abundance': this.abundance,
            'Texture_FillsId': this.textureId,
            'Description': this.description,
            'StartTubeIndex': this.startTubeIndex,
            'StopTubeIndex': this.stopTubeIndex,
            'StartImageY': this.startImageY,
            'StopImageY': this.stopImageY,
            'LoggedBy': this.loggedBy,
            'DateInserted': this.dateInserted,
        /*Extra parameters*/
            'ExtendedParameters': this.extendedParams,
            'LithologyExtended': this.lithologyExtended,
            'IntervalSample': this.sample
        };
    }
}