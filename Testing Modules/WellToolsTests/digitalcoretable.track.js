var DigitalCoreTable = DigitalCoreTable || {};
/**
 * If you add a track, a new trackTube will be added to a tube group
 * RGB, TEX, TBC, etc are all tracks.
 */
DigitalCoreTable.Track = class Track{
    constructor(name){
        this.name = name;
        this.niceName = this.name == 'RGB' ? this.name.replace('RGB','HIRES') : this.name;
        this.groupName = null;
        this.position = null; // null means we don't care
        this.members = [];
        this.isVisible = false;
        this.isPhoto = false;
        this.width = DigitalCoreTable.settings.defaultTrackWidths.normal;
        this.spaceToAdjacentTrack = DigitalCoreTable.settings.spaceBetween; // gap between current track and        
        // next one.Ex.Volcaninc tube(3 tracks) doesn't have any space between tracks
        this.opacity = 1;
        this.baseName = '';//in case of accessory track
        /*It makes sense to put those properties here in each track*/
        this.textures = [];
        this.fills = [];
        this.intensities = []; // line intensities/abundances
    }
    action() {

    }

    setImageStyling(imageStylingEntry){
        this.niceName = imageStylingEntry.NiceName;
        this.position = imageStylingEntry.Position;
        this.groupName = imageStylingEntry.GroupName;
        // this.isIndexMapped = imageStylingEntry.IsIndexMapped;
        // this.indexMap = imageStylingEntry.indexMap || {
        //     'rgba(255,255,255,255)': { index:'rgba(255,255,255,255)',  rgba: [0,0,0,0], name: 'Background' },
        // };
    }    
}