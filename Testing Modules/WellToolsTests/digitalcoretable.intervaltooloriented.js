var DigitalCoreTable = DigitalCoreTable || {};
/**
 * Tools for the interval addon
 */
DigitalCoreTable.IntervalToolOriented = class IntervalToolOriented extends DigitalCoreTable.IntervalTool{
    constructor(intervalAddon, name){        
        super(intervalAddon, name);  
        this.unrotatedCursor = 'default';
        this.rotatedCursor = 'default';
        this._unrotatedUrl = null;
        this._rotatedUrl = null;
    }   

    get cursor(){
        if(this.table.rotatedViewAddon != null && this.table.rotatedViewAddon.isRotatedView){
            return this.rotatedCursor;
        }
        else{
            return this.unrotatedCursor;
        }
    }

    set cursor(value){
        this.unrotatedCursor = value;
        this.rotatedCursor = value;
    }

    get unrotatedUrl(){
        return this._unrotatedUrl;
    }

    set unrotatedUrl(value){
        this._unrotatedUrl = value;
        this.unrotatedCursor = this.getCursorUrl(this._unrotatedUrl);
    }

    set rotatedUrl(value){
        this._rotatedUrl = value;
        this.rotatedCursor = this.getCursorUrl(this._rotatedUrl);
    }

    get rotatedUrl(){
        return this._rotatedUrl;
    }

    set url(value){
        this.unrotatedUrl = value;
        this.unrotatedUrl = value;
    }

}

