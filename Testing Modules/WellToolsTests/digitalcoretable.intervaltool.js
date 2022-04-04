var DigitalCoreTable = DigitalCoreTable || {};
/**
 * Tools for the interval addon
 */
DigitalCoreTable.IntervalTool = class IntervalTool extends DigitalCoreTable.Tool{
    constructor(intervalAddon, name, isFlippedImage = false){        
        super();
        this.intervalAddon = intervalAddon;
        this.table = intervalAddon.table;
        this.name = name;
        this.isActive = false;   
        this.locksScreen = false;        
        this.cursor = 'default';
        this.anywhere = true;        
        this._url = null;// in order to display it on cursor later
        this._isFlippedImage = isFlippedImage;//if it is flipped  need to shift it upward , so the tip will be in correct place
    }   
    setActive(isActive){
        this.isActive = isActive;
        if (isActive) {
            let otherTools = this.intervalAddon.tools.filter(t => t != this);
            otherTools.forEach(t => {
                t.setActive(false);
            });
            this.intervalAddon.currentTool = this;            
            if (this.locksScreen)
                this.intervalAddon.table.setScreenPositionLock(true);            
        }                
        else{
            this.intervalAddon.currentTool = null;
            this.intervalAddon.table.setScreenPositionLock(false);
        }
            
    }

    get url(){
        return this._url;
    }

    set url(value){
        this._url = value;
        this.cursor = this._isFlippedImage ? this.getFlippedCursorUrl(this._url) : this.getCursorUrl(this._url);
    }

    getCursorUrl(url){
        return "url('" + url + "') 9 0,default";
    }

    getFlippedCursorUrl(url) {
        return "url('" + url + "') 9 18,default"; //for snap below, the tip should be shifted up
    }
}

